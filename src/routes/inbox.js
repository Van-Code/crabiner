/**
 * Inbox Routes
 * Handles authenticated user's inbox (replies they received)
 */

import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getUserReplies,
  getUnreadReplyCount,
  markReplyAsRead,
  deleteReply,
} from "../services/replyService.js";

const router = express.Router();

// Get authenticated user's inbox (all replies received)
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

// Mark reply as read
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

// Delete reply
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
