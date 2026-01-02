import express from "express";
import { body } from "express-validator";
import { validateRequest } from "../utils/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * Register a push notification token
 * POST /api/push/register
 * Body: { platform: 'expo' | 'ios' | 'android' | 'web', token: string, deviceInfo?: object }
 */
router.post(
  "/register",
  requireAuth,
  body("platform")
    .isString()
    .isIn(["expo", "ios", "android", "web"])
    .withMessage("Invalid platform"),
  body("token").isString().notEmpty().withMessage("Token is required"),
  body("deviceInfo").optional().isObject(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { platform, token, deviceInfo } = req.body;
      const userId = req.user.id;

      // Upsert push token (update if exists, insert if not)
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
        [userId, platform, token, deviceInfo || null]
      );

      logger.info("Push token registered", {
        userId,
        platform,
        tokenId: result.rows[0].id,
      });

      res.json({
        success: true,
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
 * Unregister a push notification token
 * DELETE /api/push/unregister
 * Body: { token: string }
 */
router.delete(
  "/unregister",
  requireAuth,
  body("token").isString().notEmpty().withMessage("Token is required"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      await query(
        "DELETE FROM push_tokens WHERE user_id = $1 AND token = $2",
        [userId, token]
      );

      logger.info("Push token unregistered", { userId, token });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all push tokens for current user
 * GET /api/push/tokens
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
