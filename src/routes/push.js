/**
 * Push Token Routes
 * Handles push token registration and management
 */

import express from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import { query } from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * POST /api/push/register
 * Register a push token for the authenticated user
 * Body: { token: string, platform: string }
 */
router.post(
  "/register",
  requireAuth,
  body("token").isString().trim().notEmpty().withMessage("Token is required"),
  body("platform")
    .isString()
    .trim()
    .isIn(["ios", "android", "web"])
    .withMessage("Platform must be ios, android, or web"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { token, platform } = req.body;
      const userId = req.user.id;

      // Check if token already exists for this user
      const existing = await query(
        `SELECT id, revoked_at
         FROM user_push_tokens
         WHERE user_id = $1 AND token = $2`,
        [userId, token]
      );

      if (existing.rows.length > 0) {
        const existingToken = existing.rows[0];

        if (existingToken.revoked_at) {
          // Re-activate revoked token
          await query(
            `UPDATE user_push_tokens
             SET revoked_at = NULL,
                 last_seen_at = NOW(),
                 platform = $3
             WHERE id = $1`,
            [existingToken.id, platform]
          );

          logger.info("Push token re-activated", { userId, platform });
        } else {
          // Update last_seen_at
          await query(
            `UPDATE user_push_tokens
             SET last_seen_at = NOW()
             WHERE id = $1`,
            [existingToken.id]
          );

          logger.debug("Push token updated", { userId, platform });
        }

        return res.json({
          success: true,
          message: "Token updated",
        });
      }

      // Insert new token
      const result = await query(
        `INSERT INTO user_push_tokens (user_id, token, platform, last_seen_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [userId, token, platform]
      );

      logger.info("Push token registered", { userId, platform });

      res.json({
        success: true,
        message: "Token registered",
        id: result.rows[0].id,
      });
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        return res.status(409).json({
          error: "Token already registered",
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/push/unregister
 * Unregister (revoke) a push token
 * Body: { token: string }
 */
router.post(
  "/unregister",
  requireAuth,
  body("token").isString().trim().notEmpty().withMessage("Token is required"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      const result = await query(
        `UPDATE user_push_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1 AND token = $2 AND revoked_at IS NULL
         RETURNING id`,
        [userId, token]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Token not found or already revoked",
        });
      }

      logger.info("Push token unregistered", { userId });

      res.json({
        success: true,
        message: "Token unregistered",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/push/tokens
 * Get user's active push tokens
 */
router.get("/tokens", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, platform, created_at, last_seen_at
       FROM user_push_tokens
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      tokens: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
