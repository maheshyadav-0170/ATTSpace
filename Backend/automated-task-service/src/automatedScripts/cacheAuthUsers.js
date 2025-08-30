const AuthUser = require('../models/AuthUser');
const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = createClient({ socket: { host: redisHost, port: redisPort } });

redisClient.on('error', (err) => logger.error('Redis error: ' + err.toString()));

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info(`Connected to Redis at ${redisHost}:${redisPort}`);
  }
}

async function cacheAllAuthUsers() {
  try {
    await initRedis();
    logger.info('Starting to cache AuthUsers in Redis...');

    const users = await AuthUser.find({}).lean();

    if (!users || users.length === 0) {
      logger.warn('No AuthUsers found to cache.');
      return;
    }

    // Cache all users as a single key
    const allUsersKey = 'all_authusers';
    await redisClient.set(allUsersKey, JSON.stringify(users));
    logger.info(`Cached all ${users.length} AuthUsers under key: ${allUsersKey}`);

    // Cache each individual user by attuid
    for (const user of users) {
      const userKey = `authuser:${user.attuid}`;
      await redisClient.set(userKey, JSON.stringify(user));
      logger.info(`Cached individual AuthUser: ${userKey}`);
    }

    logger.info('AuthUsers caching completed successfully.');
  } catch (error) {
    logger.error(`Error caching AuthUsers: ${error.message}`);
  } finally {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  }
}

module.exports = { cacheAllAuthUsers };
