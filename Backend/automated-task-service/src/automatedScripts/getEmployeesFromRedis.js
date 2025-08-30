const { createClient } = require('redis');
const logger = require('../utils/logger'); // your logger if needed

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;

async function getAllAuthUsersFromRedis() {
  const redisClient = createClient({ socket: { host: redisHost, port: redisPort } });

  redisClient.on('error', (err) => logger.error('Redis error: ' + err.toString()));

  try {
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Get the cached key
    const cachedData = await redisClient.get('all_authusers');
    if (!cachedData) {
      console.log('No AuthUsers found in Redis.');
      return;
    }

    // Parse JSON
    const users = JSON.parse(cachedData);

    // Pretty-print the data
    console.log(JSON.stringify(users, null, 2));

  } catch (err) {
    console.error('Error fetching from Redis:', err);
  } finally {
    await redisClient.quit();
  }
}

// Call the function
getAllAuthUsersFromRedis();
