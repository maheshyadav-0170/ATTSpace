const amqplib = require('amqplib');
const { rabbitmqUrl } = require('../config');
const logger = require('../utils/logger');

let channel = null;

async function initRabbit() {
  const conn = await amqplib.connect(rabbitmqUrl);
  channel = await conn.createChannel();
  await channel.assertQueue('send_email', { durable: true });
  logger.info('RabbitMQ publisher initialized');
}

async function publishEmailJob(payload) {
  if (!channel) {
    await initRabbit();
  }
  const content = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue('send_email', content, { persistent: true });
  logger.info(`Published email job for attuid=${payload.attuid} email=${payload.email}`);
}

async function publishNotification(message) {
  try {
    await initRabbit();
    const msgBuffer = Buffer.from(JSON.stringify(message));
    await channel.sendToQueue('send_notification', msgBuffer, { persistent: true });
    logger.info(`Notification published: ${JSON.stringify(message)}`);
  } catch (err) {
    logger.error(`publishNotification error: ${err.message}`);
    throw err;
  }
}

module.exports = { initRabbit, publishEmailJob, publishNotification };
