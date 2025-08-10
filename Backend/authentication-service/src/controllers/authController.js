const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Employee = require('../models/Employee');
const AuthUser = require('../models/AuthUser');
const { generateOtp, setOtp, getOtp, deleteOtp, blacklistToken, setRateLimit, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW, checkRateLimit, incrementFailedAttempt, resetFailedAttempts } = require('../services/otpService');
const { publishEmailJob } = require('../services/rabbitmqPublisher');
const { sign } = require('../services/jwtService');
const { bcryptSaltRounds, otpLength } = require('../config');
const logger = require('../utils/logger');

async function checkAttuid(req, res) {
  const { attuid } = req.body;
  if (!attuid || typeof attuid !== 'string') {
    logger.info(`check-attuid: invalid attuid input`);
    return res.status(400).json({ message: 'invalid attuid' });
  }

  try {
    // Step 1: Check if employee exists
    const employee = await Employee.findOne({ attuid });
    if (!employee) {
      logger.info(`check-attuid: not found employee ${attuid}`);
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Step 2: Check if authuser exists
    const authData = await AuthUser.findOne({ attuid });

    if (authData) {
      logger.info(`check-attuid: found verified user ${attuid}`);
      return res.json({ next: 'password', message: 'User exists, request password' });
    }

    // Step 3: No authuser — send OTP and start password creation
    const otp = generateOtp();
    await setOtp(attuid, otp);

    await publishEmailJob({
      attuid,
      email: employee.email,
      otp,
      reason: 'new_account'
    });

    logger.info(`check-attuid: OTP sent/published for ${attuid}`);
    return res.json({ next: 'otp', message: 'OTP sent to your company email' });

  } catch (err) {
    logger.error(`check-attuid error: ${err.toString()}`);
    return res.status(500).json({ message: 'internal error' });
  }
}


async function verifyOtp(req, res) {
  const { attuid, otp } = req.body;
  if (!attuid || !otp) return res.status(400).json({ message: 'attuid and otp required' });

  try {
    const stored = await getOtp(attuid);
    if (!stored) {
      logger.info(`verify-otp: no otp found for ${attuid}`);
      return res.status(400).json({ message: 'OTP expired or not found' });
    }
    if (stored !== String(otp)) {
      logger.info(`verify-otp: invalid otp for ${attuid}`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP valid -> upsert authuser with isVerified=true
    await deleteOtp(attuid);
    // Find employee details to copy to authusers
    const employee = await Employee.findOne({ attuid }).lean();
    if (!employee) {
      logger.error(`verify-otp: employee vanished for ${attuid}`);
      return res.status(400).json({ message: 'Employee not found' });
    }

    const now = new Date();
    const update = {
      ...employee,
      isVerified: true,
      lastModified: now
    };

    const upsertRes = await AuthUser.findOneAndUpdate(
      { attuid },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(`verify-otp: account verified/created for ${attuid}`);
    return res.json({ next: 'set-password', message: 'OTP verified. Please set password.' });
  } catch (err) {
    logger.error(`verify-otp error: ${err.toString()}`);
    return res.status(500).json({ message: 'internal error' });
  }
}

async function setPassword(req, res) {
  const { attuid, password } = req.body;
  if (!attuid || !password) return res.status(400).json({ message: 'attuid and password required' });

  try {
    const user = await AuthUser.findOne({ attuid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const hashed = await bcrypt.hash(password, bcryptSaltRounds);
    user.password = hashed;
    user.isVerified = true;
    user.lastPasswordChanged = new Date();
    user.lastModified = new Date();
    await user.save();
    logger.info(`set-password: password set for ${attuid}`);
    return res.json({ message: 'Password set successfully' });
  } catch (err) {
    logger.error(`set-password error: ${err.toString()}`);
    return res.status(500).json({ message: 'internal error' });
  }
}

async function login(req, res) {
  const { attuid, password } = req.body;
  if (!attuid || !password) return res.status(400).json({ message: 'attuid and password required' });

  try {
    // Step 1: Check rate limit
    const rateLimitCheck = await checkRateLimit(attuid);
    if (rateLimitCheck.isBlocked) {
      return res.status(429).json({ message: rateLimitCheck.message });
    }

    // Step 2: Find user
    const user = await AuthUser.findOne({ attuid });
    if (!user) {
      logger.info(`login: user not found ${attuid}`);
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.isVerified) {
      logger.info(`login: user not verified ${attuid}`);
      return res.status(403).json({ message: 'User not verified' });
    }
    if (!user.password) {
      logger.info(`login: no password set ${attuid}`);
      return res.status(403).json({ message: 'Password not set' });
    }

    // Step 3: Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.info(`login: invalid password ${attuid}`);
      // Increment failed attempt count
      await incrementFailedAttempt(attuid);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Step 4: Reset failed attempts on successful login
    await resetFailedAttempts(attuid);

    // Step 5: Issue JWT token
    const token = sign({ attuid, email: user.email });
    logger.info(`login: successful ${attuid}`);
    return res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || 3600 });
  } catch (err) {
    logger.error(`login error: ${err.toString()}`);
    return res.status(500).json({ message: 'internal error' });
  }
}

async function logout(req, res) {
  // Expect Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (!auth) return res.status(400).json({ message: 'Authorization header required' });
  const token = auth.split(' ')[1];
  if (!token) return res.status(400).json({ message: 'Token required' });

  try {
    const decoded = require('jsonwebtoken').decode(token);
    if (!decoded || !decoded.exp) {
      logger.info('logout: invalid token decode');
      return res.status(400).json({ message: 'Invalid token' });
    }
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    if (ttl > 0) {
      await blacklistToken(token, ttl);
      logger.info('logout: token blacklisted');
    }
    return res.json({ message: 'Logged out' });
  } catch (err) {
    logger.error(`logout error: ${err.toString()}`);
    return res.status(500).json({ message: 'internal error' });
  }
}

module.exports = { checkAttuid, verifyOtp, setPassword, login, logout };