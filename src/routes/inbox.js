import express from "express";
import { body, query } from "express-validator";
import { validateRequest } from "../utils/validation.js";
import { requireAuth } from "../middleware/auth.js";

import {
  getInboxMessages,
  getUserInboxPosts,
  markMessageAsRead,
  deleteMessage,
} from "../services/replyService.js";
import { getPostBySessionToken } from "../services/postService.js";
import { posterReplyToMessage } from "../services/replyService.js";

const router = express.Router();

// Get authenticated user's inbox (all posts with replies)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all posts with replies
    const posts = await getUserInboxPosts(userId);

    res.json({
      posts,
      totalUnread: posts.reduce((sum, p) => sum + parseInt(p.unread_count), 0),
    });
  } catch (error) {
    next(error);
  }
});

// Get user's inbox (requires session token - for anonymous posters)
router.get("/:sessionToken", async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    // Verify session and get post info
    const post = await getPostBySessionToken(sessionToken);

    if (!post) {
      return res.status(404).json({ error: "Invalid or expired session" });
    }

    // Get messages
    const messages = await getInboxMessages(sessionToken);

    res.json({
      post: {
        id: post.id,
        location: post.location,
        description: post.description,
        posted_at: post.posted_at,
        expires_at: post.expires_at,
      },
      messages,
      unreadCount: messages.filter((m) => !m.is_read).length,
    });
  } catch (error) {
    next(error);
  }
});

// Poster replies to a message
router.post(
  "/:sessionToken/messages/:replyId/reply",
  body("message").trim().isLength({ min: 1, max: 1000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { sessionToken, replyId } = req.params;
      const { message } = req.body;

      await posterReplyToMessage(sessionToken, replyId, message);

      res.json({ message: "Reply sent successfully" });
    } catch (error) {
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Mark message as read
router.patch(
  "/:sessionToken/messages/:messageId/read",
  async (req, res, next) => {
    try {
      const { sessionToken, messageId } = req.params;

      await markMessageAsRead(messageId, sessionToken);

      res.json({ message: "Marked as read" });
    } catch (error) {
      if (error.message === "Message not found or unauthorized") {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Delete message
router.delete("/:sessionToken/messages/:messageId", async (req, res, next) => {
  try {
    const { sessionToken, messageId } = req.params;

    await deleteMessage(messageId, sessionToken);

    res.json({ message: "Message deleted" });
  } catch (error) {
    if (error.message === "Message not found or unauthorized") {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
