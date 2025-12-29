import { query } from "../config/database.js";
import { generateToken, hashToken } from "../utils/crypto.js";
import logger from "../utils/logger.js";
import { checkContentSafety } from "./moderationService.js";

export async function createPost(data) {
  const { location, title, description, expiresInDays, cityKey } = data;

  // Check content safety BEFORE creating post
  const concatText = title + " " + description;
  const safetyCheck = await checkContentSafety(concatText);

  if (safetyCheck.shouldBlock) {
    throw new Error(
      "Your post contains content that violates our community guidelines. Please review and try again."
    );
  }

  // Round posted_at to nearest hour for privacy
  const postedAt = new Date();
  postedAt.setMinutes(0, 0, 0);

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Generate secure management token
  const managementToken = generateToken();
  const tokenHash = await hashToken(managementToken);

  // Generate session token for inbox access
  const sessionToken = generateToken();

  const result = await query(
    `INSERT INTO posts
     (location, title, description, posted_at, expires_at,
      management_token_hash, session_token, city_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, posted_at, expires_at`,
    [
      location,
      title,
      description,
      postedAt,
      expiresAt,
      tokenHash,
      sessionToken,
      cityKey,
    ]
  );

  const postId = result.rows[0].id;

  // Log flags if any (but still allow post)
  if (!safetyCheck.isSafe && !safetyCheck.shouldBlock) {
    await checkContentSafety(description, postId);
    logger.warn("Post created with flags", {
      postId,
      flags: safetyCheck.flags.length,
      requiresReview: safetyCheck.requiresReview,
    });
  }

  logger.info("Post created", { postId });

  return {
    id: postId,
    managementToken,
    sessionToken,
    postedAt: result.rows[0].posted_at,
    expiresAt: result.rows[0].expires_at,
    needsReview: safetyCheck.requiresReview,
  };
}

export async function getPosts({
  page = 1,
  location = null,
  cityKey = null,
  limit = 20,
}) {
  const offset = (page - 1) * limit;
  const now = new Date();

  let queryText = `
    SELECT id, location, title, description, posted_at, expires_at, city_key
    FROM posts
    WHERE is_deleted = FALSE
      AND expires_at > $1
  `;

  const params = [now];
  let paramCount = 1;

  // Prefer city_key filter over location text filter
  if (cityKey) {
    queryText += ` AND city_key = $${++paramCount}`;
    params.push(cityKey);
  } else if (location) {
    queryText += ` AND location ILIKE $${++paramCount}`;
    params.push(`%${location}%`);
  }

  queryText += `
    ORDER BY posted_at DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);

  const result = await query(queryText, params);

  return {
    posts: result.rows,
    page,
    hasMore: result.rows.length === limit,
  };
}

export async function getPostById(id) {
  const now = new Date();

  const result = await query(
    `SELECT id, location, title, description, posted_at, expires_at, city_key
     FROM posts
     WHERE id = $1
       AND is_deleted = FALSE
       AND expires_at > $2`,
    [id, now]
  );

  return result.rows[0] || null;
}

export async function deletePost(id, token) {
  const result = await query(
    `SELECT management_token_hash FROM posts WHERE id = $1 AND is_deleted = FALSE`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Post not found");
  }

  const { verifyToken } = await import("../utils/crypto.js");
  const isValid = await verifyToken(
    token,
    result.rows[0].management_token_hash
  );

  if (!isValid) {
    throw new Error("Invalid management token");
  }

  await query(`UPDATE posts SET is_deleted = TRUE WHERE id = $1`, [id]);

  logger.info("Post deleted", { postId: id });

  return { success: true };
}

export async function getPostBySessionToken(sessionToken) {
  const result = await query(
    `SELECT id, location, title, description, posted_at, expires_at
     FROM posts
     WHERE session_token = $1 
       AND is_deleted = FALSE 
       AND expires_at > NOW()`,
    [sessionToken]
  );

  return result.rows[0] || null;
}

export async function searchPosts({
  queryString,
  page = 1,
  location = null,
  cityKey = null,
  limit = 20,
}) {
  const offset = (page - 1) * limit;
  const now = new Date();

  let queryText = `
    SELECT id, location, title, description, posted_at, expires_at, city_key,
      ts_rank(to_tsvector('english', description || ' ' || location),
      plainto_tsquery('english', $1)) as rank
    FROM posts
    WHERE is_deleted = FALSE
      AND expires_at > $2
  `;

  const params = [queryString, now];
  let paramCount = 2;

  // Add search condition
  if (queryString && queryString.trim()) {
    queryText += ` AND (
      to_tsvector('english', title) @@ plainto_tsquery('english', $1)
      OR to_tsvector('english', description) @@ plainto_tsquery('english', $1)
      OR to_tsvector('english', location) @@ plainto_tsquery('english', $1)
      OR description ILIKE $${++paramCount}
      OR location ILIKE $${paramCount}
    )`;
    params.push(`%${queryString}%`);
  }

  // Add city_key filter (preferred over location filter)
  if (cityKey) {
    queryText += ` AND city_key = $${++paramCount}`;
    params.push(cityKey);
  } else if (location) {
    queryText += ` AND location ILIKE $${++paramCount}`;
    params.push(`%${location}%`);
  }

  queryText += `
    ORDER BY rank DESC, posted_at DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `;

  params.push(limit, offset);

  const result = await query(queryText, params);

  // Log search query
  if (queryString && queryString.trim()) {
    await query(
      `INSERT INTO search_queries (query, results_count) VALUES ($1, $2)`,
      [queryString, result.rows.length]
    );
  }

  return {
    posts: result.rows,
    page,
    hasMore: result.rows.length === limit,
    queryString: queryString || null,
  };
}

// Get popular searches
export async function getPopularSearches(limit = 10) {
  const result = await query(
    `SELECT query, COUNT(*) as count
     FROM search_queries
     WHERE searched_at > NOW() - INTERVAL '7 days'
     GROUP BY query
     ORDER BY count DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}
