const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const amqplib = require("amqplib");
const logger = require("./utils/logger");
const notificationRoutes = require("./routes/notification");
const Notification = require("./models/Notification");

const rabbitUrl = process.env.RABBITMQ_URL;
const mongoUrl = process.env.MONGO_URL;
const port = process.env.PORT;

async function start() {
  try {
    await mongoose.connect(mongoUrl);
    logger.info("Connected to MongoDB (notification-service)");

    const conn = await amqplib.connect(rabbitUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue("send_notification", { durable: true });

    channel.consume("send_notification", async (msg) => {
      if (!msg) return;
      const raw = msg.content.toString();
      let job;
      try {
        job = JSON.parse(raw);
      } catch {
        logger.error("Invalid job payload: " + raw);
        channel.ack(msg);
        return;
      }

      const { attuid, title, body } = job;

      try {
        const notif = new Notification({ attuid, title, body, status: "pending", read: false });
        await notif.save();

        notif.status = "pending";
        await notif.save();

        logger.info(`Notification stored for ${attuid || "anonymous"}: ${title}`);
        channel.ack(msg);
      } catch (err) {
        logger.error(`Failed to store notification: ${err.toString()}`);
        const failedNotif = new Notification({ attuid, title, body, status: "failed" });
        await failedNotif.save();
        channel.ack(msg);
      }
    }, { noAck: false });

    const app = express();
    app.use(bodyParser.json());

    // mount routes
    app.use("/notifications", notificationRoutes);

    app.listen(port, () => {
      logger.info(`Notification API running on port ${port}`);
    });
  } catch (err) {
    logger.error("Error starting notification service: " + err.toString());
    process.exit(1);
  }
}

start();
