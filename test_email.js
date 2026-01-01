import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log("Testing AWS SES connection...");

    // Verify connection
    await transporter.verify();
    console.log("✓ SMTP connection successful");

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "your-test-email@example.com", // Change this to your email
      subject: "Test Email from Missed Moments",
      text: "This is a test email from your Missed Moments app!",
      html: "<h1>Test Email</h1><p>If you received this, AWS SES is working! 🎉</p>",
    });

    console.log("✓ Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (error) {
    console.error("✗ Email test failed:");
    console.error("Error:", error.message);

    if (error.code === "EAUTH") {
      console.error("\nAuthentication failed. Check your SMTP credentials.");
    } else if (error.code === "ECONNECTION") {
      console.error("\nConnection failed. Check your SMTP host and port.");
    }
  }
}

testEmail();
