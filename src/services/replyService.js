/**
 * Reply Service
 * Handles reply creation and management with the new clean schema
 */

import { query } from "../config/database.js";
import { notifyNewReply } from "./notificationService.js";
import logger from "../utils/logger.js";

/**
 * Send reply to a post
 * @param {string} postId - Post ID
 * @param {string} body - Reply message body
 * @param {string} fromUserId - Sender user ID
 */
export async function sendReply(postId, body, fromUserId) {
  // Verify post exists and is active
  const postResult = await query(
    `SELECT id, user_id, status, expires_at
     FROM posts
     WHERE id = $1`,
    [postId]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Post not found");
  }

  const post = postResult.rows[0];

  if (post.status !== "active" || new Date(post.expires_at) < new Date()) {
    throw new Error("Post not found or has expired");
  }

  const toUserId = post.user_id;

  // Prevent self-replies
  if (fromUserId === toUserId) {
    throw new Error("Cannot reply to your own post");
  }

  // Create reply
  const result = await query(
    `INSERT INTO replies (post_id, from_user_id, to_user_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [postId, fromUserId, toUserId, body]
  );

  const replyId = result.rows[0].id;

  logger.info("Reply created", {
    replyId,
    postId,
    fromUserId,
    toUserId,
  });

  // Send notification (async, don't block on this)
  try {
    await notifyNewReply(replyId, toUserId, fromUserId);
  } catch (error) {
    logger.error("Failed to send notification for reply", {
      replyId,
      error: error.message,
    });
    // Don't throw - reply was still created successfully
  }

  return {
    success: true,
    replyId,
    createdAt: result.rows[0].created_at,
  };
}

/**
 * Get replies for a user's inbox
 * @param {string} userId - User ID
 * @param {Object} options - Query options { limit, offset, unreadOnly }
 */
export async function getUserReplies(
  userId,
  options = { limit: 50, offset: 0, unreadOnly: false }
) {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  let sql = `
    SELECT
      r.id,
      r.post_id,
      r.body,
      r.created_at,
      r.read_at,
      r.deleted_at,
      p.title as post_title,
      p.body as post_body,
      u.id as sender_id,
      u.name as sender_name,
      u.email as sender_email,
      u.avatar_url as sender_avatar_url
    FROM replies r
    JOIN posts p ON p.id = r.post_id
    JOIN users u ON u.id = r.from_user_id
    WHERE r.to_user_id = $1 AND r.deleted_at IS NULL
  `;

  const params = [userId];

  if (unreadOnly) {
    sql += ` AND r.read_at IS NULL`;
  }

  sql += `
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  params.push(limit, offset);

  const result = await query(sql, params);

  return result.rows;
}

/**
 * Get unread reply count for user
 * @param {string} userId - User ID
 */
export async function getUnreadReplyCount(userId) {
  const result = await query(
    `SELECT COUNT(*) as count
     FROM replies
     WHERE to_user_id = $1 AND read_at IS NULL AND deleted_at IS NULL`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Mark reply as read
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID (for verification)
 */
export async function markReplyAsRead(replyId, userId) {
  const result = await query(
    `UPDATE replies
     SET read_at = NOW()
     WHERE id = $1 AND to_user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [replyId, userId]
  );

  return result.rows.length > 0;
}

/**
 * Delete reply (soft delete)
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID (for verification)
 */
export async function deleteReply(replyId, userId) {
  const result = await query(
    `UPDATE replies
     SET deleted_at = NOW()
     WHERE id = $1 AND to_user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [replyId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Reply not found or already deleted");
  }

  return { success: true };
}

/**
 * Get reply by ID (with permissions check)
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID (must be sender or recipient)
 */
export async function getReplyById(replyId, userId) {
  const result = await query(
    `SELECT
      r.id,
      r.post_id,
      r.body,
      r.created_at,
      r.read_at,
      r.deleted_at,
      r.from_user_id,
      r.to_user_id,
      p.title as post_title,
      sender.name as sender_name,
      sender.email as sender_email,
      sender.avatar_url as sender_avatar_url,
      recipient.name as recipient_name,
      recipient.email as recipient_email
    FROM replies r
    JOIN posts p ON p.id = r.post_id
    JOIN users sender ON sender.id = r.from_user_id
    JOIN users recipient ON recipient.id = r.to_user_id
    WHERE r.id = $1 AND (r.from_user_id = $2 OR r.to_user_id = $2)`,
    [replyId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
