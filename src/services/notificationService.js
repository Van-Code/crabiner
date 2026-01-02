/**
 * Notification Service
 * Handles creating notifications and sending push notifications
 */

import { query } from "../config/database.js";
import logger from "../utils/logger.js";

/**
 * Push notification sender (dependency injection point for testing)
 * Default implementation is a mock that logs
 */
let pushSender = async (userId, payload) => {
  logger.info("Mock push notification", { userId, payload });
  // In production, this would call FCM, APNs, etc.
  // For now, just log the notification
  return { success: true, mock: true };
};

/**
 * Set custom push sender (for testing or production implementation)
 * @param {Function} sender - Async function (userId, payload) => Promise
 */
export function setPushSender(sender) {
  pushSender = sender;
}

/**
 * Get current push sender (for testing)
 */
export function getPushSender() {
  return pushSender;
}

/**
 * Send push notification to user
 * Looks up user's push tokens and sends to all active devices
 * @param {string} userId - User ID
 * @param {Object} payload - Notification payload { title, body, data? }
 */
export async function sendPushNotification(userId, payload) {
  try {
    // Get all active push tokens for user
    const result = await query(
      `SELECT token, platform
       FROM user_push_tokens
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      logger.debug("No push tokens found for user", { userId });
      return { sent: 0, tokens: [] };
    }

    // Send to all devices
    const sendResults = await Promise.allSettled(
      result.rows.map(async (row) => {
        try {
          await pushSender(userId, {
            ...payload,
            token: row.token,
            platform: row.platform,
          });
          return { token: row.token, success: true };
        } catch (error) {
          logger.error("Failed to send push notification", {
            userId,
            platform: row.platform,
            error: error.message,
          });
          return { token: row.token, success: false, error: error.message };
        }
      })
    );

    const successCount = sendResults.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    logger.info("Push notifications sent", {
      userId,
      total: result.rows.length,
      success: successCount,
    });

    return {
      sent: successCount,
      total: result.rows.length,
      tokens: result.rows.map((r) => r.token),
    };
  } catch (error) {
    logger.error("Error sending push notifications", { userId, error });
    throw error;
  }
}

/**
 * Create notification for new reply
 * @param {string} replyId - Reply ID
 * @param {string} toUserId - Recipient user ID
 * @param {string} fromUserId - Sender user ID
 */
export async function notifyNewReply(replyId, toUserId, fromUserId) {
  try {
    // Get sender's name
    const senderResult = await query(
      `SELECT name FROM users WHERE id = $1`,
      [fromUserId]
    );

    if (senderResult.rows.length === 0) {
      logger.error("Sender not found for notification", { fromUserId });
      return;
    }

    const senderName = senderResult.rows[0].name;

    // Create notification
    const title = "New Reply";
    const body = `${senderName} replied to your post`;

    await query(
      `INSERT INTO notifications (user_id, type, entity_id, title, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [toUserId, "new_reply", replyId, title, body]
    );

    logger.info("Notification created", {
      toUserId,
      fromUserId,
      replyId,
      type: "new_reply",
    });

    // Send push notification
    await sendPushNotification(toUserId, {
      title,
      body,
      data: {
        type: "new_reply",
        replyId,
        fromUserId,
      },
    });
  } catch (error) {
    logger.error("Error creating reply notification", {
      replyId,
      toUserId,
      fromUserId,
      error,
    });
    // Don't throw - notification failure shouldn't break reply creation
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 */
export async function markNotificationRead(notificationId, userId) {
  const result = await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [notificationId, userId]
  );

  return result.rows.length > 0;
}

/**
 * Get notifications for user
 * @param {string} userId - User ID
 * @param {Object} options - Query options { limit, offset, unreadOnly }
 */
export async function getUserNotifications(
  userId,
  options = { limit: 50, offset: 0, unreadOnly: false }
) {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  let sql = `
    SELECT id, type, entity_id, title, body, created_at, read_at
    FROM notifications
    WHERE user_id = $1
  `;

  const params = [userId];

  if (unreadOnly) {
    sql += ` AND read_at IS NULL`;
  }

  sql += `
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  params.push(limit, offset);

  const result = await query(sql, params);

  return result.rows;
}

/**
 * Get unread count for user
 * @param {string} userId - User ID
 */
export async function getUnreadCount(userId) {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}
