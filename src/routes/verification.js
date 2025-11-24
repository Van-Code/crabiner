import express from "express";
import { body } from "express-validator";
import { replyRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../utils/validation.js";
import {
  createVerificationCode,
  verifyCode,
} from "../services/verificationService.js";
import { sendReply } from "../services/replyService.js";
import { getPostById } from "../services/postService.js";

const router = express.Router();

// Step 1: Request verification code
router.post(
  "/request",
  replyRateLimiter,
  body("postId").isUUID(),
  body("message").trim().isLength({ min: 10, max: 1000 }),
  body("email").isEmail().normalizeEmail(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId, email, message } = req.body;

      // Verify post exists
      const post = await getPostById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found or expired" });
      }

      // Create verification code
      const result = await createVerificationCode(postId, email, message);

      res.json({
        message: "Verification code sent to your email",
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      if (error.message.includes("wait 2 minutes")) {
        return res.status(429).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Step 2: Verify code and submit reply
router.post(
  "/verify",
  body("postId").isUUID(),
  body("email").isEmail().normalizeEmail(),
  body("code").isLength({ min: 6, max: 6 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId, email, code } = req.body;

      // Verify the code
      const verification = await verifyCode(email, code, postId);

      // Send the reply
      const reply = await sendReply(postId, verification.message, email);

      res.json({
        message: "Reply sent successfully!",
        verified: true,
      });
    } catch (error) {
      if (
        error.message.includes("Invalid") ||
        error.message.includes("expired") ||
        error.message.includes("attempts")
      ) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

export default router;
