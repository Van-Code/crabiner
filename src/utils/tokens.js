import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env.js";
import { query } from "../config/database.js";
import logger from "./logger.js";

// Token configuration
const ACCESS_TOKEN_TTL = "15m"; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 30; // 30 days

/**
 * Generate a JWT access token
 * @param {Object} user - User object with id, email, name
 * @returns {string} JWT access token
 */
export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: "crabiner",
    audience: "crabiner-api",
  });
}

/**
 * Verify and decode a JWT access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getJwtSecret(), {
      issuer: "crabiner",
      audience: "crabiner-api",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Access token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid access token");
    }
    throw error;
  }
}

/**
 * Generate a cryptographically random refresh token
 * @returns {string} Random refresh token (hex)
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a refresh token for storage
 * @param {string} token - Plain refresh token
 * @returns {string} SHA-256 hash of token
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Store a refresh token in the database
 * @param {string} userId - User ID
 * @param {string} token - Plain refresh token
 * @param {Object} options - Additional options (userAgent, ip)
 * @returns {Promise<Object>} Created token record
 */
export async function storeRefreshToken(userId, token, options = {}) {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const result = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, created_at, expires_at`,
    [
      userId,
      tokenHash,
      expiresAt,
      options.userAgent || null,
      options.ip || null,
    ]
  );

  return result.rows[0];
}

/**
 * Verify a refresh token and get the associated user
 * @param {string} token - Plain refresh token
 * @returns {Promise<Object|null>} User object if valid, null otherwise
 */
export async function verifyRefreshToken(token) {
  const tokenHash = hashToken(token);

  const result = await query(
    `SELECT rt.id as token_id, rt.expires_at, rt.revoked_at, rt.user_id,
            u.id, u.google_sub, u.email, u.email_verified, u.name, u.avatar_url
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    logger.warn("Refresh token not found");
    return null;
  }

  const tokenData = result.rows[0];

  // Check if token is revoked
  if (tokenData.revoked_at) {
    logger.warn("Refresh token has been revoked", {
      tokenId: tokenData.token_id,
    });
    return null;
  }

  // Check if token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    logger.warn("Refresh token has expired", { tokenId: tokenData.token_id });
    return null;
  }

  return {
    tokenId: tokenData.token_id,
    user: {
      id: tokenData.id,
      googleSub: tokenData.google_sub,
      email: tokenData.email,
      emailVerified: tokenData.email_verified,
      name: tokenData.name,
      avatarUrl: tokenData.avatar_url,
    },
  };
}

/**
 * Rotate a refresh token (revoke old, create new)
 * @param {string} oldToken - Current refresh token
 * @param {Object} options - Additional options (userAgent, ip)
 * @returns {Promise<Object>} New token and user data
 */
export async function rotateRefreshToken(oldToken, options = {}) {
  const verification = await verifyRefreshToken(oldToken);

  if (!verification) {
    throw new Error("Invalid or expired refresh token");
  }

  const { tokenId, user } = verification;

  // Generate new token
  const newToken = generateRefreshToken();
  const newTokenRecord = await storeRefreshToken(user.id, newToken, options);

  // Mark old token as replaced
  await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW(), replaced_by_token_id = $1
     WHERE id = $2`,
    [newTokenRecord.id, tokenId]
  );

  logger.info("Refresh token rotated", {
    userId: user.id,
    oldTokenId: tokenId,
    newTokenId: newTokenRecord.id,
  });

  return {
    refreshToken: newToken,
    user,
  };
}

/**
 * Revoke a refresh token
 * @param {string} token - Refresh token to revoke
 * @returns {Promise<boolean>} True if revoked, false if not found
 */
export async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);

  const result = await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL
     RETURNING id`,
    [tokenHash]
  );

  if (result.rows.length > 0) {
    logger.info("Refresh token revoked", { tokenId: result.rows[0].id });
    return true;
  }

  return false;
}

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export async function revokeAllUserTokens(userId) {
  const result = await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId]
  );

  logger.info("All user tokens revoked", {
    userId,
    count: result.rows.length,
  });

  return result.rows.length;
}

/**
 * Clean up expired and old revoked tokens
 * Called by cleanup service
 */
export async function cleanupExpiredTokens() {
  // Delete tokens expired more than 7 days ago or revoked more than 30 days ago
  const result = await query(
    `DELETE FROM refresh_tokens
     WHERE (expires_at < NOW() - INTERVAL '7 days')
        OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')`
  );

  if (result.rowCount > 0) {
    logger.info("Expired refresh tokens cleaned up", {
      count: result.rowCount,
    });
  }

  return result.rowCount;
}

/**
 * Get JWT secret from environment
 * @returns {string} JWT secret
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }

  if (secret.length < 32) {
    logger.warn("JWT_SECRET should be at least 32 characters");
  }

  return secret;
}
