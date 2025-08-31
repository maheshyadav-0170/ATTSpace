require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const cron = require("node-cron");
const logger = require("./utils/logger");

// Controllers
const { employeeTaskController } = require("./controllers/employeeTaskController");
const { authUserTaskController } = require("./controllers/authUserTaskController");

// Scripts
const { generateFakeEmployees } = require("./automatedScripts/generateFakeEmployees");
const { cacheAllAuthUsers } = require("./automatedScripts/cacheAuthUsers");
const { cacheAllEmployees } = require("./automatedScripts/cacheEmployees");

const mongoUrl = process.env.MONGO_URL;
const PORT = process.env.PORT;

async function startServer() {
  try {
    await mongoose.connect(mongoUrl);
    logger.info("Connected to MongoDB");

    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Routes
    app.post("/automated-task/manual-fake-employee-generation", employeeTaskController.triggerFakeEmployees);
    app.post("/automated-task/manual-trigger-cache-employee", employeeTaskController.triggerCacheEmployees);
    app.post("/automated-task/manual-trigger-cache-authuser", authUserTaskController.triggerCache);

    // Cron Jobs
    cron.schedule(
      "0 0 1 * * *",
      async () => {
        logger.info("Cron job started: Generating Fake Employees at 2 AM IST.");
        await generateFakeEmployees(100);

        // Schedule caching 30 minutes after generation
        setTimeout(async () => {
          logger.info("Scheduled cache job: Caching Employees (30 min after generation).");
          await cacheAllEmployees();
        }, 30 * 60 * 1000); // 30 minutes in ms
      },
      { timezone: "Asia/Kolkata" }
    );

    cron.schedule(
      "0 0 2 * * *",
      async () => {
        logger.info("Cron job started: Caching AuthUsers at 3 AM IST.");
        await cacheAllAuthUsers();
      },
      { timezone: "Asia/Kolkata" }
    );

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();
