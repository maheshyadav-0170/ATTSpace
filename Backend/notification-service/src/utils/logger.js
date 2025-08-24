const winston = require('winston');
const path = require('path');
const logDir = process.env.LOG_DIR;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: `${logDir}/notification.log`, maxsize: 5_000_000 })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

module.exports = logger;
