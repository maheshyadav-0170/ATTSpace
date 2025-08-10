require('dotenv').config();
const amqplib = require('amqplib');
const nodemailer = require('nodemailer');
const logger = require('./utils/logger');

const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://rabbitmq';

async function start() {
  try {
    const conn = await amqplib.connect(rabbitUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue('send_email', { durable: true });

    // configure transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    channel.consume('send_email', async (msg) => {
      if (!msg) return;
      const raw = msg.content.toString();
      let job;
      try {
        job = JSON.parse(raw);
      } catch (e) {
        logger.error('Invalid job payload: ' + raw);
        channel.ack(msg);
        return;
      }

      const { attuid, email, otp, reason } = job;
      const subject = reason === 'new_account' ? 'Welcome to ATTSpace - Verify your email' : 'ATTSpace - Verify your email';
      const text = `Hello,\n\nYour OTP for ${reason} is: ${otp}\n\nThis code will expire in 5 minutes.\n\nThanks,\nATTSpace Team`;

      try {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: email,
          subject,
          text
        });
        logger.info(`Email sent to ${email} for ${attuid}`);
        channel.ack(msg);
      } catch (err) {
        logger.error(`Failed to send email to ${email}: ${err.toString()}`);
        // ack anyway or implement retry - for simplicity ack to avoid blocking queue
        channel.ack(msg);
      }
    }, { noAck: false });

    logger.info('Email service started and listening for jobs');
  } catch (err) {
    logger.error('Error starting email service: ' + err.toString());
    process.exit(1);
  }
}

start();
