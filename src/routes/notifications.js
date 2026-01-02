/**
 * Notification Routes
 * Handles notification listing, marking as read
 */

import express from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../utils/validation.js";
import {
  getUserNotifications,
  markNotificationRead,
  getUnreadCount,
} from "../services/notificationService.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/notifications
 * Get user's notifications
 * Query params: limit, offset, unreadOnly
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === "true";

    const notifications = await getUserNotifications(req.user.id, {
      limit,
      offset,
      unreadOnly,
    });

    const unreadCount = await getUnreadCount(req.user.id);

    res.json({
      notifications,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const success = await markNotificationRead(id, req.user.id);

    if (!success) {
      return res.status(404).json({
        error: "Notification not found or already read",
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/unread/count
 * Get unread notification count
 */
router.get("/unread/count", requireAuth, async (req, res, next) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

export default router;
