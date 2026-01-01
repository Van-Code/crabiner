import { query } from "../config/database.js";
import { sendEmail } from "../config/email.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

// Generate random 6-digit code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createVerificationCode(postId, email, message) {
  // Check if there's a recent code for this email/post combo
  const existing = await query(
    `SELECT id, created_at FROM verification_codes 
     WHERE email = $1 AND post_id = $2 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, postId]
  );

  // Rate limit: only allow new code every 2 minutes
  if (existing.rows.length > 0) {
    const lastSent = new Date(existing.rows[0].created_at);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    if (lastSent > twoMinutesAgo) {
      throw new Error("Please wait 2 minutes before requesting another code");
    }
  }

  // Generate code
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minute expiry

  // Store verification request
  const result = await query(
    `INSERT INTO verification_codes 
     (email, code, post_id, message, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [email, code, postId, message, expiresAt]
  );

  // Send verification email
  await sendVerificationEmail(email, code);

  logger.info("Verification code created", {
    verificationId: result.rows[0].id,
    email: email.replace(/(?<=.{2}).(?=.*@)/g, "*"), // Log masked email
  });

  return {
    verificationId: result.rows[0].id,
    expiresIn: 15,
  };
}

export async function verifyCode(email, code, postId) {
  // Find matching verification
  const result = await query(
    `SELECT id, message, is_verified, attempts, expires_at
     FROM verification_codes
     WHERE email = $1 AND code = $2 AND post_id = $3 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, code, postId]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired verification code");
  }

  const verification = result.rows[0];

  // Check if already verified
  if (verification.is_verified) {
    throw new Error("Code already used");
  }

  // Check attempts (max 5 attempts)
  if (verification.attempts >= 5) {
    throw new Error("Too many attempts. Please request a new code.");
  }

  // Increment attempts
  await query(
    `UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1`,
    [verification.id]
  );

  // Mark as verified
  await query(
    `UPDATE verification_codes SET is_verified = TRUE WHERE id = $1`,
    [verification.id]
  );

  logger.info("Email verified", { verificationId: verification.id });

  return {
    verified: true,
    message: verification.message,
  };
}

async function sendVerificationEmail(email, code) {
  const subject = "Verify your email - Missed Moments";

  const text = `
Your verification code is: ${code}

This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      
      <p>Someone is trying to send a reply to a missed moment post using this email address.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #666;">Your verification code:</p>
        <h1 style="margin: 10px 0; font-size: 36px; letter-spacing: 8px; color: #db2777;">${code}</h1>
        <p style="margin: 0; font-size: 14px; color: #666;">Expires in 15 minutes</p>
      </div>
      
      <p>Enter this code on the website to confirm your reply.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #666; font-size: 14px;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await sendEmail({ to: email, subject, text, html });
  } catch (error) {
    logger.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification code. Please try again.");
  }
}

// Cleanup job (call this from cleanupService.js)
export async function cleanupExpiredCodes() {
  const result = await query(
    `DELETE FROM verification_codes WHERE expires_at < NOW() RETURNING id`
  );

  if (result.rowCount > 0) {
    logger.info("Cleaned up expired verification codes", {
      count: result.rowCount,
    });
  }
}
