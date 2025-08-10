const crypto = require('crypto');
const { createClient } = require('redis');
const { redisHost, redisPort, otpTtl, otpLength } = require('../config');
const logger = require('../utils/logger');

const redisClient = createClient({ socket: { host: redisHost, port: redisPort } });

redisClient.on('error', (err) => logger.error('Redis error: ' + err.toString()));

async function initRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
}

function generateOtp() {
  // numeric otp of otpLength
  const max = Math.pow(10, otpLength) - 1;
  const min = Math.pow(10, otpLength - 1);
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function setOtp(attuid, otp) {
  await initRedis();
  const key = `otp:${attuid}`;
  await redisClient.setEx(key, otpTtl, otp);
  logger.info(`Set OTP in Redis for ${attuid} (ttl ${otpTtl}s)`);
}

async function getOtp(attuid) {
  await initRedis();
  const key = `otp:${attuid}`;
  return await redisClient.get(key);
}

async function deleteOtp(attuid) {
  await initRedis();
  const key = `otp:${attuid}`;
  await redisClient.del(key);
}

async function blacklistToken(jtiOrToken, ttlSeconds) {
  await initRedis();
  const key = `blacklist:${jtiOrToken}`;
  await redisClient.setEx(key, ttlSeconds, '1');
  logger.info(`Blacklisted token ${jtiOrToken} for ${ttlSeconds}s`);
}

async function isTokenBlacklisted(jtiOrToken) {
  await initRedis();
  const key = `blacklist:${jtiOrToken}`;
  const v = await redisClient.get(key);
  return !!v;
}

async function setRateLimit(key, value, ttlSeconds) {
  await initRedis();
  await redisClient.setEx(key, ttlSeconds, String(value));
  logger.info(`Set rate limit for ${key}: ${value} (ttl ${ttlSeconds}s)`);
}

// Rate-limiting constants
const MAX_LOGIN_ATTEMPTS = 5; // Threshold: 5 attempts
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds

// Helper function to check failed login attempts in Redis
async function checkRateLimit(attuid) {
  await initRedis();
  const key = `login_attempts:${attuid}`;
  try {
    const attempts = await redisClient.get(key);
    const attemptCount = attempts ? parseInt(attempts, 10) : 0;

    if (attemptCount >= MAX_LOGIN_ATTEMPTS) {
      logger.info(`Rate limit exceeded for ${attuid}`);
      return { isBlocked: true, message: 'Too many failed login attempts. Try again later.' };
    }

    return { isBlocked: false, attemptCount };
  } catch (err) {
    logger.error(`Redis error in checkRateLimit for ${attuid}: ${err.toString()}`);
    throw err;
  }
}

// Helper function to increment failed login attempts in Redis
async function incrementFailedAttempt(attuid) {
  await initRedis();
  const key = `login_attempts:${attuid}`;
  try {
    const attempts = await redisClient.incr(key);
    // Set expiry for the key if it's the first attempt
    if (attempts === 1) {
      await setRateLimit(key, attempts, RATE_LIMIT_WINDOW);
    } else {
      await setRateLimit(key, attempts, await redisClient.ttl(key)); // Preserve existing TTL
    }
    logger.info(`Incremented failed login attempt for ${attuid}: ${attempts}`);
  } catch (err) {
    logger.error(`Redis error in incrementFailedAttempt for ${attuid}: ${err.toString()}`);
    throw err;
  }
}

// Helper function to reset failed login attempts in Redis
async function resetFailedAttempts(attuid) {
  await initRedis();
  const key = `login_attempts:${attuid}`;
  try {
    await redisClient.del(key);
    logger.info(`Reset failed login attempts for ${attuid}`);
  } catch (err) {
    logger.error(`Redis error in resetFailedAttempts for ${attuid}: ${err.toString()}`);
    throw err;
  }
}

module.exports = { generateOtp, setOtp, getOtp, deleteOtp, initRedis, blacklistToken, isTokenBlacklisted, setRateLimit, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW, checkRateLimit, incrementFailedAttempt, resetFailedAttempts };