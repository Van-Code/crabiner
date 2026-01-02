import express from "express";
import { body, query as queryValidator } from "express-validator";
import { validateRequest } from "../utils/validation.js";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * Get notifications for current user
 * GET /api/notifications
 * Query params: limit, offset, unreadOnly
 */
router.get(
  "/",
  requireAuth,
  queryValidator("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  queryValidator("offset").optional().isInt({ min: 0 }).toInt(),
  queryValidator("unreadOnly").optional().isBoolean().toBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit || 50;
      const offset = req.query.offset || 0;
      const unreadOnly = req.query.unreadOnly === true;

      let sql = `
        SELECT id, type, title, body, data, read, created_at, read_at
        FROM notifications
        WHERE user_id = $1
      `;

      const params = [userId];

      if (unreadOnly) {
        sql += ` AND read = false`;
      }

      sql += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);

      const result = await query(sql, params);

      // Get unread count
      const countResult = await query(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false",
        [userId]
      );

      res.json({
        notifications: result.rows.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          data: row.data,
          read: row.read,
          createdAt: row.created_at,
          readAt: row.read_at,
        })),
        unreadCount: parseInt(countResult.rows[0].count),
        hasMore: result.rows.length === limit,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Mark notification(s) as read
 * POST /api/notifications/read
 * Body: { notificationIds: number[] } or { all: true }
 */
router.post(
  "/read",
  requireAuth,
  body("notificationIds").optional().isArray(),
  body("all").optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { notificationIds, all } = req.body;

      if (all) {
        // Mark all as read
        await query(
          `UPDATE notifications
           SET read = true, read_at = NOW()
           WHERE user_id = $1 AND read = false`,
          [userId]
        );

        logger.info("All notifications marked as read", { userId });
      } else if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read
        await query(
          `UPDATE notifications
           SET read = true, read_at = NOW()
           WHERE user_id = $1 AND id = ANY($2) AND read = false`,
          [userId, notificationIds]
        );

        logger.info("Notifications marked as read", {
          userId,
          count: notificationIds.length,
        });
      } else {
        return res
          .status(400)
          .json({ error: "Must provide notificationIds or all:true" });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete notification(s)
 * DELETE /api/notifications
 * Body: { notificationIds: number[] }
 */
router.delete(
  "/",
  requireAuth,
  body("notificationIds").isArray().notEmpty(),
  validateRequest,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { notificationIds } = req.body;

      await query(
        "DELETE FROM notifications WHERE user_id = $1 AND id = ANY($2)",
        [userId, notificationIds]
      );

      logger.info("Notifications deleted", { userId, count: notificationIds.length });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get("/preferences", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      "SELECT notification_preferences FROM users WHERE id = $1",
      [userId]
    );

    res.json({
      preferences:
        result.rows[0]?.notification_preferences || {
          replies: true,
          mentions: true,
          system: false,
        },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update notification preferences
 * PATCH /api/notifications/preferences
 * Body: { replies?: boolean, mentions?: boolean, system?: boolean }
 */
router.patch(
  "/preferences",
  requireAuth,
  body("replies").optional().isBoolean(),
  body("mentions").optional().isBoolean(),
  body("system").optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { replies, mentions, system } = req.body;

      // Get current preferences
      const current = await query(
        "SELECT notification_preferences FROM users WHERE id = $1",
        [userId]
      );

      const currentPrefs =
        current.rows[0]?.notification_preferences || {
          replies: true,
          mentions: true,
          system: false,
        };

      // Update with new values
      const newPrefs = {
        ...currentPrefs,
        ...(replies !== undefined && { replies }),
        ...(mentions !== undefined && { mentions }),
        ...(system !== undefined && { system }),
      };

      await query(
        "UPDATE users SET notification_preferences = $1 WHERE id = $2",
        [JSON.stringify(newPrefs), userId]
      );

      logger.info("Notification preferences updated", { userId, preferences: newPrefs });

      res.json({ preferences: newPrefs });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
