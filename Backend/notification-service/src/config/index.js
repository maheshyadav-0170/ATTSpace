const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URL || 'mongodb://mongo:27017/notifications_db',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://rabbitmq',
  logDir: process.env.LOG_DIR || './logs',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'team404squadMALM',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN) : 3600
};
