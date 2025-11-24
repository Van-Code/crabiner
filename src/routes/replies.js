import express from "express";
import { body } from "express-validator";
import { replyRateLimiter } from "../middleware/rateLimiter.js";
import { sendReply } from "../services/replyService.js";
import { validateRequest } from "../utils/validation.js";

const router = express.Router();

// Send reply to a post
router.post(
  "/:postId",
  replyRateLimiter,
  body("message").trim().isLength({ min: 10, max: 1000 }),
  body("contactEmail").isEmail().normalizeEmail(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const { message, contactEmail } = req.body;

      await sendReply(postId, message, contactEmail);

      res.json({
        message:
          "Reply sent successfully! The poster will receive your message.",
      });
    } catch (error) {
      if (error.message === "Post not found or has expired") {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
);

export default router;
