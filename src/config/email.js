import nodemailer from "nodemailer";
import { config } from "./env.js";
import logger from "../utils/logger.js";

let transporter = null;

export function initEmail() {
  try {
    if (!config.email.host || !config.email.user || !config.email.pass) {
      throw new Error("Missing required email configuration");
    }

    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
    });

    logger.info("Email transporter initialized", {
      host: config.email.host,
      port: config.email.port,
    });

    return transporter;
  } catch (error) {
    logger.error("Failed to initialize email transporter:", error);
    throw error;
  }
}

export function getTransporter() {
  if (!transporter) {
    logger.warn("Transporter not initialized, initializing now...");
    return initEmail();
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  try {
    if (!transporter) {
      logger.info("Transporter null, initializing...");
      initEmail();
    }

    if (!transporter) {
      throw new Error("Email transporter is not initialized");
    }

    logger.info("Attempting to send email", { to, subject });

    const info = await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });

    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to: to,
    });

    return info;
  } catch (error) {
    logger.error("Failed to send email:", {
      error: error.message,
      stack: error.stack,
      to: to,
    });
    throw error;
  }
}
