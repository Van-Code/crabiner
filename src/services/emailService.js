import { getTransporter } from "../config/email.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

export async function sendReplyEmail({ to, postId, message, replierEmail }) {
  const transporter = getTransporter();

  const subject = "You have a reply to your Missed Connection";

  const text = `
You received a reply to your missed connection post!

Message:
${message}

---
The person who replied provided this contact info: ${replierEmail}

You can reply directly to them at that address.

This is an automated message. Your privacy is protected - the sender used our relay system.
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You have a reply! 💌</h2>
      <p>Someone replied to your missed connection post.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
      
      <p><strong>Contact info:</strong> ${escapeHtml(replierEmail)}</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #666; font-size: 14px;">
        Your privacy is protected. The sender used our secure relay system.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });

    logger.info("Reply email sent", { postId });
  } catch (error) {
    logger.error("Failed to send reply email:", error);
    throw new Error("Failed to send email");
  }
}

export async function sendManagementEmail({
  to,
  postId,
  managementToken,
  expiresAt,
}) {
  const transporter = getTransporter();

  const managementUrl = `${config.security.allowedOrigins[0]}/manage.html?id=${postId}&token=${managementToken}`;

  const subject = "Your Missed Connection Post - Management Link";

  const text = `
Your missed connection post has been created!

IMPORTANT: Save this email! This is your only way to delete your post early.

Management Link (click to delete your post):
${managementUrl}

Your post will automatically expire on: ${new Date(
    expiresAt
  ).toLocaleDateString()}

If someone replies to your post, you'll receive an email at this address.
  `.trim();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your post is live! ✨</h2>
      
      <div style="background: #fffbeb; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>⚠️ SAVE THIS EMAIL</strong>
        <p style="margin: 10px 0 0 0;">This is your only way to delete your post early if needed.</p>
      </div>
      
      <p><a href="${managementUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Delete Post Early</a></p>
      
      <p>Your post will automatically expire on: <strong>${new Date(
        expiresAt
      ).toLocaleDateString()}</strong></p>
      
      <p>If someone replies to your post, you'll receive an email at this address with their message and contact info.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="color: #666; font-size: 14px;">
        Good luck! 🤞
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });

    logger.info("Management email sent", { postId });
  } catch (error) {
    logger.error("Failed to send management email:", error);
    // Don't throw - post was created successfully
  }
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
