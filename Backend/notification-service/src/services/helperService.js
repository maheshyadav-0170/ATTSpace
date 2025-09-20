const crypto = require('crypto');
const { createClient } = require('redis');
const { redisHost, redisPort } = require('../config');
const logger = require('../utils/logger');

const redisClient = createClient({ socket: { host: redisHost, port: redisPort } });

redisClient.on('error', (err) => logger.error('Redis error: ' + err.toString()));

async function initRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
}

async function isTokenBlacklisted(jtiOrToken) {
  await initRedis();
  const key = `blacklist:${jtiOrToken}`;
  const v = await redisClient.get(key);
  return !!v;
}


module.exports = { isTokenBlacklisted };