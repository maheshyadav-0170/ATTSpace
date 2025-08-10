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

module.exports = { initRabbit, publishEmailJob };
