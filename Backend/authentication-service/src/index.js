const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { mongoUri, mongoDb, port } = require('./config');
const { initRedis } = require('./services/otpService');
const { initRabbit } = require('./services/rabbitmqPublisher');
const logger = require('./utils/logger');

async function start() {
  try {
    logger.info('Starting authentication service...');
    await mongoose.connect(`${mongoUri}/${mongoDb}`, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('Connected to MongoDB');

    await initRedis();
    await initRabbit();

    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.json());

    app.use('/auth', authRoutes);

    app.get('/', (req, res) => res.json({ service: 'authentication-service', status: 'ok' }));

    app.listen(port, () => logger.info(`Auth service listening on port ${port}`));
  } catch (err) {
    logger.error(`Failed to start service: ${err.toString()}`);
    process.exit(1);
  }
}

start();
