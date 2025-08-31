const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Employee = require('../models/Employee');
const AuthUser = require('../models/AuthUser');
const { generateOtp, setOtp, getOtp, deleteOtp, blacklistToken, setRateLimit, jwtExpiresIn, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW, checkRateLimit, incrementFailedAttempt, resetFailedAttempts, isTokenBlacklisted } = require('../services/helperService');
const { publishEmailJob } = require('../services/rabbitmqPublisher');
const { sign, verify } = require('../services/jwtService');
const { bcryptSaltRounds, otpLength } = require('../config');
const logger = require('../utils/logger');

/* ==========================
   Middleware for protection
   ========================== */

   function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
  
    if (!token) {
      logger.info("authMiddleware: No token found in Authorization header");
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
  
    try {
      const decoded = verify(token);
      req.user = decoded;
      next();
    } catch (err) {
      logger.info("authMiddleware: Invalid or expired token");
      return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
  }

async function checkAttuid(req, res) {
  const { attuid } = req.body;
  if (!attuid || typeof attuid !== 'string') {
    logger.info(`check-attuid: Invalid attuid input received: ${attuid}`);
    return res.status(400).json({ message: 'The provided attuid is invalid. Please enter a valid attuid and try again.' });
  }

  try {
        // Step 1: Check if employee exists
    const employee = await Employee.findOne({ attuid });
    if (!employee) {
      logger.info(`check-attuid: Employee not found for attuid: ${attuid}`);
      return res.status(404).json({ message: 'No employee record was found for the provided attuid. Please verify and try again.' });
    }

    // Step 2: Check if authuser exists
    const authData = await AuthUser.findOne({ attuid });

    if (authData) {
      logger.info(`check-attuid: Found verified user for attuid: ${attuid}`);
      return res.json({ next: 'password', message: 'A verified user account exists. Please provide your password to continue.' });
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

    logger.info(`check-attuid: OTP generated and sent to email for attuid: ${attuid}`);
    return res.json({ next: 'otp', message: 'A one-time password (OTP) has been sent to your registered company email address. Please check your inbox.' });

  } catch (err) {
    logger.error(`checkAttuid: Error processing attuid ${attuid}: ${err.toString()}`);
    return res.status(500).json({ message: 'An unexpected server error occurred. Please try again later or contact support.' });
  }
}

async function verifyOtp(req, res) {
  const { attuid, otp } = req.body;
  if (!attuid || !otp) {
    logger.info(`verifyOtp: Missing attuid or otp in request`);
    return res.status(400).json({ message: 'Both attuid and OTP are required to proceed with verification.' });
  }

  try {
    const stored = await getOtp(attuid);
    if (!stored) {
      logger.info(`verify-otp: No OTP found for attuid: ${attuid}`);
      return res.status(400).json({ message: 'The OTP has either expired or was not found. Please request a new OTP.' });
    }
    if (stored !== String(otp)) {
      logger.info(`verify-otp: Invalid OTP provided for attuid: ${attuid}`);
      return res.status(400).json({ message: 'The provided OTP is invalid. Please enter the correct OTP and try again.' });
    }

    // OTP valid -> upsert authuser with isVerified=true
    await deleteOtp(attuid);
        // Find employee details to copy to authusers
    const employee = await Employee.findOne({ attuid }).lean();
    if (!employee) {
      logger.error(`verify-otp: Employee not found for attuid: ${attuid}`);
      return res.status(400).json({ message: 'No employee record was found for the provided attuid.' });
    }

    const now = new Date();
    const update = {
      ...employee,
      isVerified: true,
      lastModified: now
    };

    await AuthUser.findOneAndUpdate(
      { attuid },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(`verify-otp: Account verified and created for attuid: ${attuid}`);
    return res.json({ next: 'set-password', message: 'OTP verification successful. Please set a new password for your account.' });
  } catch (err) {
    logger.error(`verify-otp: Error verifying OTP for attuid ${attuid}: ${err.toString()}`);
    return res.status(500).json({ message: 'An unexpected server error occurred during OTP verification. Please try again later.' });
  }
}

async function setPassword(req, res) {
  const { attuid, password } = req.body;
  if (!attuid || !password) {
    logger.info(`set-password: Missing attuid or password in request`);
    return res.status(400).json({ message: 'Both attuid and a valid password are required to set a new password.' });
  }

  try {
    const user = await AuthUser.findOne({ attuid });
    if (!user) {
      logger.info(`set-password: User not found for attuid: ${attuid}`);
      return res.status(404).json({ message: 'No user account was found for the provided attuid.' });
    }
    const hashed = await bcrypt.hash(password, bcryptSaltRounds);
    user.password = hashed;
    user.isVerified = true;
    user.lastPasswordChanged = new Date();
    user.lastModified = new Date();
    await user.save();
    logger.info(`set-password: Password successfully set for attuid: ${attuid}`);
    return res.json({ message: 'Your password has been successfully set. You can now log in with your credentials.' });
  } catch (err) {
    logger.error(`set-password: Error setting password for attuid ${attuid}: ${err.toString()}`);
    return res.status(500).json({ message: 'An unexpected server error occurred while setting the password. Please try again later.' });
  }
}

async function login(req, res) {
  const { attuid, password } = req.body;
  if (!attuid || !password) {
    logger.info(`login: Missing attuid or password in request`);
    return res.status(400).json({ message: 'Both attuid and password are required to log in.' });
  }

  try {
    // Step 1: Check rate limit
    const rateLimitCheck = await checkRateLimit(attuid);
    if (rateLimitCheck.isBlocked) {
      logger.info(`login: Rate limit exceeded for attuid: ${attuid}`);
      return res.status(429).json({ message: rateLimitCheck.message });
    }

    // Step 2: Find user
    const user = await AuthUser.findOne({ attuid });
    if (!user) {
      logger.info(`login: User not found for attuid: ${attuid}`);
      return res.status(404).json({ message: 'No user account was found for the provided attuid.' });
    }
    if (!user.isVerified) {
      logger.info(`login: User not verified for attuid: ${attuid}`);
      return res.status(403).json({ message: 'Your account is not verified. Please complete the verification process.' });
    }
    if (!user.password) {
      logger.info(`login: No password set for attuid: ${attuid}`);
      return res.status(403).json({ message: 'No password has been set for this account. Please set a password to log in.' });
    }

    // Step 3: Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.info(`login: Invalid password for attuid: ${attuid}`);
      // Increment failed attempt count
      await incrementFailedAttempt(attuid);
      return res.status(401).json({ message: 'The provided credentials are incorrect. Please try again.' });
    }

    // Step 4: Reset failed attempts on successful login
    await resetFailedAttempts(attuid);

    // Step 5: Issue JWT token
    const token = sign({ attuid, email: user.email, role: user.role });

    logger.info(`login: Successful login for attuid: ${attuid}`);
    return res.json({
      message: "Login successful",
      accessToken: token,
      tokenType: "Bearer",
      expiresIn: jwtExpiresIn
    });

  } catch (err) {
    logger.error(`login: Error during login for attuid ${attuid}: ${err.toString()}`);
    return res.status(500).json({ message: 'An unexpected server error occurred during login. Please try again later.' });
  }
}

async function logout(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    logger.info(`logout: No token found in Authorization header`);
    return res.status(400).json({ message: 'A valid Bearer token is required to log out.' });
  }

  try {
    // Verify token (checks signature + expiration)
    const decoded = verify(token);
    if (!decoded || !decoded.exp) {
      logger.info(`logout: Invalid or expired token provided`);
      return res.status(401).json({ message: 'The provided token is either invalid or has expired.' });
    }

    // Check if already blacklisted
    const alreadyBlacklisted = await isTokenBlacklisted(token);
    if (alreadyBlacklisted) {
      logger.info(`logout: Token already blacklisted for attuid: ${decoded.attuid}`);
      return res.status(200).json({ message: 'You have already been logged out.' });
    }

    // Blacklist until expiry
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    if (ttl > 0) {
      await blacklistToken(token, ttl);
      logger.info(`logout: Token blacklisted for ${ttl} seconds for attuid: ${decoded.attuid}`);
    }

    return res.json({ message: 'You have been successfully logged out.' });
  } catch (err) {
    logger.error(`logout: Error during logout for token ${token}: ${err.toString()}`);
    return res.status(401).json({ message: 'The provided token is invalid or has expired. Please try again.' });
  }
}

module.exports = { checkAttuid, verifyOtp, setPassword, login, logout, authMiddleware };