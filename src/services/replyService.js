import { getPostById } from "./postService.js";
import { query } from "../config/database.js";
import { generateToken } from "../utils/crypto.js";
import { sendReplyNotification } from "./posterVerificationService.js";
import logger from "../utils/logger.js";

export async function sendReply(postId, message, replierEmail, userId) {
  // Verify post exists and is active
  const post = await getPostById(postId);

  if (!post) {
    throw new Error("Post not found or has expired");
  }

  // Generate session token for replier to check responses
  const replierSessionToken = generateToken();

  // Calculate message expiry (30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Store message in database with user_id
  const result = await query(
    `INSERT INTO replies
     (post_id, message, replier_email, replier_session_token, expires_at, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [postId, message, replierEmail, replierSessionToken, expiresAt, userId]
  );

  logger.info("Reply sent", { postId, replyId: result.rows[0].id, userId });

  // Send notification to poster if enabled (don't fail if this errors)
  try {
    await sendReplyNotification(postId);
  } catch (error) {
    logger.error("Failed to send reply notification:", error);
    // Don't throw - reply was still saved successfully
  }

  return {
    success: true,
    replyId: result.rows[0].id,
    sessionToken: replierSessionToken,
  };
}

export async function markMessageAsRead(messageId, sessionToken) {
  // Verify this message belongs to this user's post
  const result = await query(
    `UPDATE replies r
     SET is_read = TRUE
     FROM posts p
     WHERE r.id = $1 
       AND r.post_id = p.id 
       AND p.session_token = $2
     RETURNING r.id`,
    [messageId, sessionToken]
  );

  if (result.rows.length === 0) {
    throw new Error("Message not found or unauthorized");
  }

  return { success: true };
}

export async function deleteMessage(messageId, sessionToken) {
  const result = await query(
    `DELETE FROM replies r
     USING posts p
     WHERE r.id = $1 
       AND r.post_id = p.id 
       AND p.session_token = $2
     RETURNING r.id`,
    [messageId, sessionToken]
  );

  if (result.rows.length === 0) {
    throw new Error("Message not found or unauthorized");
  }

  return { success: true };
}

// Poster responds to a reply
export async function posterReplyToMessage(sessionToken, replyId, message) {
  // Verify this is the poster's session
  const postResult = await query(
    `SELECT p.id FROM posts p
     JOIN replies r ON r.post_id = p.id
     WHERE p.session_token = $1 AND r.id = $2`,
    [sessionToken, replyId]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Unauthorized or reply not found");
  }

  const postId = postResult.rows[0].id;

  // Get original reply details
  const originalReply = await query(
    `SELECT replier_email FROM replies WHERE id = $1`,
    [replyId]
  );

  if (originalReply.rows.length === 0) {
    throw new Error("Reply not found");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Create nested reply from poster
  const result = await query(
    `INSERT INTO replies 
     (post_id, message, replier_email, parent_reply_id, is_from_poster, expires_at)
     VALUES ($1, $2, 'poster', $3, TRUE, $4)
     RETURNING id`,
    [postId, message, replyId, expiresAt]
  );

  logger.info("Poster replied to message", { replyId: result.rows[0].id });

  // TODO: Send notification to original replier

  return {
    success: true,
    replyId: result.rows[0].id,
  };
}

// Get threaded messages for inbox (session-based for anonymous posters)
export async function getInboxMessages(sessionToken) {
  // Find post by session token
  const postResult = await query(
    `SELECT id FROM posts WHERE session_token = $1`,
    [sessionToken]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Invalid session");
  }

  const postId = postResult.rows[0].id;

  // Get all replies with threading
  const result = await query(
    `WITH RECURSIVE reply_tree AS (
      -- Get top-level replies (no parent)
      SELECT
        id, message, replier_email, replied_at, is_read,
        parent_reply_id, is_from_poster, expires_at,
        ARRAY[id] as path,
        0 as depth
      FROM replies
      WHERE post_id = $1 AND parent_reply_id IS NULL AND expires_at > NOW()

      UNION ALL

      -- Get nested replies
      SELECT
        r.id, r.message, r.replier_email, r.replied_at, r.is_read,
        r.parent_reply_id, r.is_from_poster, r.expires_at,
        rt.path || r.id,
        rt.depth + 1
      FROM replies r
      JOIN reply_tree rt ON r.parent_reply_id = rt.id
      WHERE r.expires_at > NOW()
    )
    SELECT * FROM reply_tree
    ORDER BY path`,
    [postId]
  );

  return result.rows;
}

// Get all posts with replies for authenticated user's inbox
export async function getUserInboxPosts(userId) {
  // Get all posts by this user that have replies
  const result = await query(
    `SELECT
      p.id,
      p.title,
      p.location,
      p.city_key,
      p.description,
      p.posted_at,
      p.expires_at,
      p.session_token,
      COUNT(r.id) as reply_count,
      COUNT(r.id) FILTER (WHERE r.is_read = FALSE) as unread_count
    FROM posts p
    LEFT JOIN replies r ON r.post_id = p.id AND r.expires_at > NOW() AND r.is_from_poster = FALSE
    WHERE p.user_id = $1
      AND p.is_deleted = FALSE
      AND p.expires_at > NOW()
    GROUP BY p.id
    HAVING COUNT(r.id) > 0
    ORDER BY MAX(r.replied_at) DESC`,
    [userId]
  );

  return result.rows;
}
