const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { mongoUri, mongoDb, port, corsOrigin } = require('./config');
const { initRedis } = require('./services/helperService');
const { initRabbit } = require('./services/rabbitmqPublisher');
const logger = require('./utils/logger');
const cookieParser = require("cookie-parser");

async function start() {
  try {
    logger.info('Starting authentication service...');
    await mongoose.connect(`${mongoUri}/${mongoDb}`, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('Connected to MongoDB');

    await initRedis();
    await initRabbit();

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Allow frontend to talk to backend, with origin from env/config
    app.use(cors({
      origin: corsOrigin,
      credentials: true   // allow cookies
    }));
    
    app.use(helmet());
  
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