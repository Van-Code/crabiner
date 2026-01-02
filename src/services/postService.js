/**
 * Post Service
 * Handles post creation and management with UUID-based schema
 */

import { query } from "../config/database.js";
import logger from "../utils/logger.js";

/**
 * Create a new post (requires authentication)
 * @param {Object} data - Post data { title, body, expiresInDays }
 * @param {string} userId - User ID (required)
 */
export async function createPost(data, userId) {
  if (!userId) {
    throw new Error("Authentication required to create posts");
  }

  const { title, body, expiresInDays = 30 } = data;

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const result = await query(
    `INSERT INTO posts (user_id, title, body, expires_at, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, expires_at`,
    [userId, title, body, expiresAt, "active"]
  );

  const postId = result.rows[0].id;

  logger.info("Post created", { postId, userId });

  return {
    id: postId,
    createdAt: result.rows[0].created_at,
    expiresAt: result.rows[0].expires_at,
  };
}

/**
 * Get posts with pagination
 * @param {Object} options - Query options { page, limit }
 */
export async function getPosts({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT
      p.id,
      p.title,
      p.body,
      p.created_at,
      p.expires_at,
      u.id as user_id,
      u.name as user_name,
      u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.status = 'active'
      AND p.expires_at > NOW()
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    posts: result.rows,
    page,
    hasMore: result.rows.length === limit,
  };
}

/**
 * Get post by ID
 * @param {string} id - Post ID
 */
export async function getPostById(id) {
  const result = await query(
    `SELECT
      p.id,
      p.title,
      p.body,
      p.created_at,
      p.expires_at,
      p.user_id,
      u.name as user_name,
      u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = $1
      AND p.status = 'active'
      AND p.expires_at > NOW()`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get user's own posts
 * @param {string} userId - User ID
 */
export async function getUserPosts(userId) {
  const result = await query(
    `SELECT
      p.id,
      p.title,
      p.body,
      p.created_at,
      p.expires_at,
      p.status,
      COUNT(DISTINCT r.id) FILTER (WHERE r.deleted_at IS NULL) as reply_count,
      COUNT(DISTINCT r.id) FILTER (WHERE r.read_at IS NULL AND r.deleted_at IS NULL) as unread_count
    FROM posts p
    LEFT JOIN replies r ON r.post_id = p.id AND r.to_user_id = p.user_id
    WHERE p.user_id = $1
      AND p.status = 'active'
      AND p.expires_at > NOW()
    GROUP BY p.id
    ORDER BY p.created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Delete user's post (only owner can delete)
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 */
export async function deleteUserPost(userId, postId) {
  const result = await query(
    `SELECT id FROM posts WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [postId, userId]
  );

  if (result.rows.length === 0) {
    // Check if post exists at all
    const exists = await query(
      `SELECT id FROM posts WHERE id = $1 AND status = 'active'`,
      [postId]
    );

    if (exists.rows.length === 0) {
      throw new Error("Post not found");
    }
    throw new Error("Unauthorized");
  }

  await query(`UPDATE posts SET status = 'deleted' WHERE id = $1`, [postId]);

  logger.info("Post deleted by user", { postId, userId });

  return { success: true };
}
