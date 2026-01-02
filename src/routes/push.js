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
 * Body: { token: string, platform: string, deviceInfo?: object }
 */
router.post(
  "/register",
  requireAuth,
  body("token").isString().trim().notEmpty().withMessage("Token is required"),
  body("platform")
    .isString()
    .trim()
    .isIn(["expo", "ios", "android", "web"])
    .withMessage("Platform must be expo, ios, android, or web"),
  body("deviceInfo").optional().isObject(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { token, platform, deviceInfo } = req.body;
      const userId = req.user.id;

      // Upsert push token (insert or update if exists)
      const result = await query(
        `INSERT INTO push_tokens (user_id, platform, token, device_info, updated_at, last_used_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id, token)
         DO UPDATE SET
           platform = EXCLUDED.platform,
           device_info = EXCLUDED.device_info,
           updated_at = NOW(),
           last_used_at = NOW()
         RETURNING id, platform, token`,
        [userId, platform, token, deviceInfo ? JSON.stringify(deviceInfo) : null]
      );

      logger.info("Push token registered", {
        userId,
        platform,
        tokenId: result.rows[0].id,
      });

      res.json({
        success: true,
        message: "Token registered",
        token: {
          id: result.rows[0].id,
          platform: result.rows[0].platform,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/push/unregister
 * Unregister (delete) a push token
 * Body: { token: string }
 */
router.delete(
  "/unregister",
  requireAuth,
  body("token").isString().trim().notEmpty().withMessage("Token is required"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      const result = await query(
        `DELETE FROM push_tokens
         WHERE user_id = $1 AND token = $2
         RETURNING id`,
        [userId, token]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Token not found",
        });
      }

      logger.info("Push token unregistered", { userId, token });

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
      `SELECT id, platform, token, device_info, created_at, updated_at, last_used_at
       FROM push_tokens
       WHERE user_id = $1
       ORDER BY last_used_at DESC`,
      [userId]
    );

    res.json({
      tokens: result.rows.map((row) => ({
        id: row.id,
        platform: row.platform,
        token: row.token,
        deviceInfo: row.device_info,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastUsedAt: row.last_used_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
