const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  port: process.env.PORT || 4003,
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017',
  mongoDb: process.env.MONGO_DB || 'auth_db',
  redisHost: process.env.REDIS_HOST || 'redis',
  redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://rabbitmq',
  jwtSecret: process.env.JWT_SECRET || 'team404squadMALM',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN) : 3600,
  otpTtl: process.env.OTP_TTL_SECONDS ? parseInt(process.env.OTP_TTL_SECONDS) : 300,
  otpLength: process.env.OTP_LENGTH ? parseInt(process.env.OTP_LENGTH) : 6,
  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : 10,
  logDir: process.env.LOG_DIR || './logs',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
