// scripts/sendWellnessNotification.js
const amqplib = require("amqplib");

async function run() {
  try {
    const conn = await amqplib.connect("amqp://rabbitmq"); // match docker setup if needed
    const ch = await conn.createChannel();
    const queue = "send_notification";

    const msg = {
      attuid: "EMP001",
      title: "Wellness Break Reminder",
      body: "Take a short wellness break. Stay hydrated and stretch!",
    };

    await ch.assertQueue(queue, { durable: true });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), { persistent: true });
    console.log("✅ Wellness Notification job sent:", msg);

    setTimeout(() => {
      conn.close();
      process.exit(0);
    }, 500);
  } catch (err) {
    console.error("Error sending notification:", err);
  }
}

run();
