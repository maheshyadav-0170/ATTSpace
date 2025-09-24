const crypto = require('crypto');
const { createClient } = require('redis');
const { redisHost, redisPort } = require('../config');
const logger = require('../utils/logger');

// Initialize Redis client
const redisClient = createClient({ socket: { host: redisHost, port: redisPort } });

redisClient.on('error', (err) => logger.error('Redis error: ' + err.toString()));

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info('Connected to Redis');
  }
}

// Token blacklist check
async function isTokenBlacklisted(jtiOrToken) {
  await initRedis();
  const key = `blacklist:${jtiOrToken}`;
  const value = await redisClient.get(key);
  return !!value;
}

// Token blacklist setter
async function blacklistToken(jtiOrToken, ttlSeconds) {
  await initRedis();
  const key = `blacklist:${jtiOrToken}`;
  await redisClient.setEx(key, ttlSeconds, '1');
  logger.info(`Blacklisted token ${jtiOrToken} for ${ttlSeconds}s`);
}

// Export Redis client for other usages
module.exports = {
  initRedis,
  redisClient,
  isTokenBlacklisted,
  blacklistToken
};
