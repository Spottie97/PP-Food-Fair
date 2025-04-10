const nodemailer = require("nodemailer");
const { logger } = require("./logger");

const sendEmail = async (options) => {
  // 1. Create a transporter (service that will send email like 'gmail', 'sendgrid', 'mailgun')
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Use secure: true if port is 465, otherwise false for 587
    secure: process.env.EMAIL_PORT === "465",
    // For development/testing with self-signed certs or local SMTP server
    // tls: { rejectUnauthorized: false },
  });

  // 2. Define email options
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Sender address
    to: options.email, // List of receivers
    subject: options.subject, // Subject line
    text: options.message, // Plain text body
    // html: options.html // HTML body (optional)
  };

  // 3. Actually send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId} to ${options.email}`);
  } catch (error) {
    logger.error(`Error sending email to ${options.email}:`, error);
    // Depending on the context, you might want to throw an error here
    // throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
