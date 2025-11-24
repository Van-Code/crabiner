import { query } from "../config/database.js";
import { sendEmail } from "../config/email.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestPosterVerification(
  postId,
  email,
  sessionToken,
  notifyOnReply
) {
  // Check rate limiting
  const existing = await query(
    `SELECT id, created_at FROM poster_verification_codes 
     WHERE email = $1 AND post_id = $2 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, postId]
  );

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
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  // Store verification request
  await query(
    `INSERT INTO poster_verification_codes 
     (email, code, post_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email, code, postId, expiresAt]
  );

  // Store email and notification preference (unverified)
  await query(
    `UPDATE posts 
     SET poster_email = $1, notify_on_reply = $2
     WHERE id = $3`,
    [email, notifyOnReply, postId]
  );

  // Send verification email
  await sendPosterVerificationEmail(email, code);

  logger.info("Poster verification code sent", { postId });

  return { success: true };
}

export async function verifyPosterEmail(postId, email, code) {
  // Find matching verification
  const result = await query(
    `SELECT id, is_verified, attempts, expires_at
     FROM poster_verification_codes
     WHERE email = $1 AND code = $2 AND post_id = $3 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, code, postId]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired verification code");
  }

  const verification = result.rows[0];

  if (verification.is_verified) {
    throw new Error("Code already used");
  }

  if (verification.attempts >= 5) {
    throw new Error("Too many attempts. Please request a new code.");
  }

  // Increment attempts
  await query(
    `UPDATE poster_verification_codes SET attempts = attempts + 1 WHERE id = $1`,
    [verification.id]
  );

  // Mark as verified
  await query(
    `UPDATE poster_verification_codes SET is_verified = TRUE WHERE id = $1`,
    [verification.id]
  );

  // Mark email as verified in posts table
  await query(`UPDATE posts SET poster_email_verified = TRUE WHERE id = $1`, [
    postId,
  ]);

  // Get post details for inbox link
  const postResult = await query(
    `SELECT session_token, notify_on_reply FROM posts WHERE id = $1`,
    [postId]
  );

  const post = postResult.rows[0];

  // Send inbox link email
  await sendInboxLinkEmail(
    email,
    postId,
    post.session_token,
    post.notify_on_reply
  );

  logger.info("Poster email verified", { postId });

  return { verified: true };
}

async function sendPosterVerificationEmail(email, code) {
  const subject = "Verify Your Email - Missed Connections";

  const text = `
Your verification code is: ${code}

This code will expire in 15 minutes.

After verifying, we'll send you a link to check your inbox for replies.
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      
      <p>You posted a missed connection! Let's verify your email so we can send you the inbox link.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #666;">Your verification code:</p>
        <h1 style="margin: 10px 0; font-size: 36px; letter-spacing: 8px; color: #db2777;">${code}</h1>
        <p style="margin: 0; font-size: 14px; color: #666;">Expires in 15 minutes</p>
      </div>
      
      <p>Enter this code on the website to receive your inbox link.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #666; font-size: 14px;">
        If you didn't create this post, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

async function sendInboxLinkEmail(email, postId, sessionToken, notifyOnReply) {
  const inboxUrl = `${config.security.allowedOrigins[0]}/inbox.html?session=${sessionToken}`;

  const subject = "Your Missed Connection Inbox Link";

  const text = `
Your missed connection post is live!

Access your inbox to see replies:
${inboxUrl}

IMPORTANT: Bookmark this link! This is your only way to check for replies.

${
  notifyOnReply
    ? "We'll email you when someone replies to your post."
    : "Remember to check back regularly for replies."
}
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Post is Live! ✨</h2>
      
      <div style="background: #fffbeb; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>📌 SAVE THIS EMAIL!</strong>
        <p style="margin: 10px 0 0 0;">This link is your only way to see replies to your post.</p>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${inboxUrl}" 
           style="display: inline-block; background: #db2777; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 8px; font-weight: 600;">
          Open My Inbox
        </a>
      </p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #666;">Your inbox link:</p>
        <p style="margin: 5px 0; font-family: monospace; font-size: 12px; word-break: break-all;">
          ${inboxUrl}
        </p>
      </div>
      
      ${
        notifyOnReply
          ? `
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong style="color: #10b981;">🔔 Notifications enabled</strong>
          <p style="margin: 5px 0 0 0; color: #065f46;">We'll email you when someone replies to your post.</p>
        </div>
      `
          : ""
      }
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #666; font-size: 14px;">
        Good luck finding your connection! 💌
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

// Send notification when someone replies
export async function sendReplyNotification(postId) {
  // Get post details
  const result = await query(
    `SELECT poster_email, poster_email_verified, notify_on_reply, session_token, location
     FROM posts
     WHERE id = $1`,
    [postId]
  );

  if (result.rows.length === 0) {
    return; // Post not found
  }

  const post = result.rows[0];

  // Only send if email verified and notifications enabled
  if (!post.poster_email_verified || !post.notify_on_reply) {
    return;
  }

  const inboxUrl = `${config.security.allowedOrigins[0]}/inbox.html?session=${post.session_token}`;

  const subject = "💌 New Reply to Your Missed Connection";

  const text = `
You have a new reply to your missed connection post!

Location: ${post.location}

Check your inbox to see the message:
${inboxUrl}
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You Have a New Reply! 💌</h2>
      
      <p>Someone replied to your missed connection post at <strong>${post.location}</strong>.</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${inboxUrl}" 
           style="display: inline-block; background: #db2777; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 8px; font-weight: 600;">
          View Reply in Inbox
        </a>
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #666; font-size: 14px;">
        This is an automated notification. You can manage your notification preferences in your inbox.
      </p>
    </div>
  `;

  await sendEmail({ to: post.poster_email, subject, text, html });

  logger.info("Reply notification sent", { postId });
}
