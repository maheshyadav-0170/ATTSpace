const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');

const { mongoUri, mongoDb, port, corsOrigin } = require('./config');
const { initRedis } = require('./services/helperService');
const logger = require('./utils/logger');
const playArenaRoutes = require('./routes/playArenaRoutes');

async function start() {
  try {
    logger.info('Starting play-arena service...');

    // MongoDB connection
    await mongoose.connect(`${mongoUri}/${mongoDb}`, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('Connected to MongoDB');

    // Initialize Redis
    await initRedis();

    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Enable CORS for frontend (port 5173)
    app.use(
      cors({
        origin: "http://localhost:5173", // Replace with actual frontend URL if different
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      })
    );

    app.use(helmet());
    app.use(bodyParser.json());

    // Routes
    app.use('/play-arena', playArenaRoutes);

    // Health check
    app.get('/', (req, res) => res.json({ service: 'play-arena-service', status: 'ok' }));

    app.listen(port, () => logger.info(`Play-arena service listening on port ${port}`));
  } catch (err) {
    logger.error(`Failed to start service: ${err.toString()}`);
    process.exit(1);
  }
}

start();
