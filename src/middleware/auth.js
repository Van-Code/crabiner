import { verifyAccessToken } from "../utils/tokens.js";
import { query } from "../config/database.js";
import logger from "../utils/logger.js";

/**
 * Middleware to require JWT authentication
 * Validates Authorization: Bearer <token> header
 * Attaches req.user with consistent shape
 */
export async function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.message === "Access token expired") {
        return res.status(401).json({
          error: "Token expired",
          message: "Access token has expired. Please refresh your token.",
        });
      }
      return res.status(401).json({
        error: "Invalid token",
        message: "Access token is invalid or malformed",
      });
    }

    // Fetch full user data from database to ensure user still exists
    const result = await query(
      "SELECT id, google_sub, email, email_verified, name, avatar_url FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      logger.warn("Token valid but user not found", { userId: decoded.userId });
      return res.status(401).json({
        error: "User not found",
        message: "User account no longer exists",
      });
    }

    const user = result.rows[0];

    // Attach user to request with consistent shape
    req.user = {
      id: user.id,
      googleSub: user.google_sub,
      email: user.email,
      emailVerified: user.email_verified,
      name: user.name,
      avatarUrl: user.avatar_url,
      // Keep legacy fields for compatibility during migration
      profile_picture: user.avatar_url,
    };

    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(500).json({
      error: "Authentication error",
      message: "An error occurred during authentication",
    });
  }
}

/**
 * Middleware to attach user if authenticated (optional)
 * Does not require authentication
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);

      // Fetch user data
      const result = await query(
        "SELECT id, google_sub, email, email_verified, name, avatar_url FROM users WHERE id = $1",
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        req.user = {
          id: user.id,
          googleSub: user.google_sub,
          email: user.email,
          emailVerified: user.email_verified,
          name: user.name,
          avatarUrl: user.avatar_url,
          profile_picture: user.avatar_url,
        };
      }
    } catch (error) {
      // Token invalid/expired, but that's ok for optional auth
      logger.debug("Optional auth token invalid:", error.message);
    }

    next();
  } catch (error) {
    logger.error("Optional auth middleware error:", error);
    next(); // Continue even if error
  }
}
