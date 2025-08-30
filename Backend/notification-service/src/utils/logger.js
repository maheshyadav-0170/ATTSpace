const winston = require('winston');
const path = require('path');
const config = require('../config'); // import your updated config

const logDir = config.logDir;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'notification.log'), maxsize: 5_000_000 })
  ]
});

// Add console logging in non-production environments
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`)
    )
  }));
}

module.exports = logger;
