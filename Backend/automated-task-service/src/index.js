require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const cron = require("node-cron");
const logger = require("./utils/logger");
const routes = require("./routes/automatedService");

// Import cache function for cron
const cacheAuthUsers = require("./cacheAuthUser");

const port = process.env.PORT || 4002;

async function start() {
  try {
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.json());

    app.use("/automated-service", routes);

    app.get("/", (req, res) =>
      res.json({ service: "automated-task-service", status: "ok" })
    );

    app.listen(port, () =>
      logger.info(`Automated Task Service running on port ${port}`)
    );

    // Schedule cron job to run every day at 2 AM
    cron.schedule("0 2 * * *", async () => {
      logger.info("⏰ Running daily cache refresh job (2 AM)...");
      await cacheAuthUsers();
    });
  } catch (err) {
    logger.error("Error starting automated-task-service: " + err.toString());
    process.exit(1);
  }
}

start();
