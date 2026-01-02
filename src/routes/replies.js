/**
 * Reply Routes
 * Handles sending replies to posts
 */

import express from "express";
import { body } from "express-validator";
import { replyRateLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";
import {
  sendReply,
  getUserReplies,
  getUnreadReplyCount,
  markReplyAsRead,
  deleteReply,
} from "../services/replyService.js";
import { validateRequest } from "../utils/validation.js";

const router = express.Router();

/**
 * POST /api/replies/:postId
 * Send reply to a post - REQUIRES AUTHENTICATION
 */
router.post(
  "/:postId",
  requireAuth,
  replyRateLimiter,
  body("body")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Reply must be between 10 and 1000 characters"),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { body } = req.body;
      const userId = req.user.id;

      const result = await sendReply(postId, body, userId);

      res.json({
        success: true,
        message: "Reply sent successfully!",
        replyId: result.replyId,
      });
    } catch (error) {
      if (
        error.message === "Post not found" ||
        error.message === "Post not found or has expired"
      ) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "Cannot reply to your own post") {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

/**
 * GET /api/replies
 * Get user's inbox replies
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === "true";

    const replies = await getUserReplies(userId, { limit, offset, unreadOnly });
    const unreadCount = await getUnreadReplyCount(userId);

    res.json({
      replies,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/replies/:id/read
 * Mark reply as read
 */
router.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const success = await markReplyAsRead(id, userId);

    if (!success) {
      return res.status(404).json({
        error: "Reply not found or already read",
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/replies/:id
 * Delete (soft delete) a reply
 */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await deleteReply(id, userId);

    res.json({ success: true, message: "Reply deleted" });
  } catch (error) {
    if (error.message === "Reply not found or already deleted") {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
