const Employee = require('../models/Employee');
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

async function cacheAllEmployees() {
  try {
    await initRedis();
    logger.info('Starting to cache Employees in Redis...');

    const employees = await Employee.find({}).lean();

    if (!employees || employees.length === 0) {
      logger.warn('No Employees found to cache.');
      return;
    }

    // Cache all employees as a single key
    const allEmployeesKey = 'all_employees';
    await redisClient.set(allEmployeesKey, JSON.stringify(employees));
    logger.info(`Cached all ${employees.length} Employees under key: ${allEmployeesKey}`);

    // Cache each individual employee by attuid
    for (const emp of employees) {
      const empKey = `employee:${emp.attuid}`;
      await redisClient.set(empKey, JSON.stringify(emp));
      logger.info(`Cached individual Employee: ${empKey}`);
    }

    logger.info('Employees caching completed successfully.');
  } catch (error) {
    logger.error(`Error caching Employees: ${error.message}`);
  } finally {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  }
}

module.exports = { cacheAllEmployees };
