import express from "express";
import { body } from "express-validator";
import { validateRequest } from "../utils/validation.js";
import {
  requestPosterVerification,
  verifyPosterEmail,
} from "../services/posterVerificationService.js";

const router = express.Router();

// Request verification code for poster
router.post(
  "/request",
  body("postId").isUUID(),
  body("email").isEmail().normalizeEmail(),
  body("sessionToken").notEmpty(),
  body("notifyOnReply").isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId, email, sessionToken, notifyOnReply } = req.body;

      await requestPosterVerification(
        postId,
        email,
        sessionToken,
        notifyOnReply
      );

      res.json({
        message: "Verification code sent to your email",
        expiresIn: 15,
      });
    } catch (error) {
      if (error.message.includes("wait 2 minutes")) {
        return res.status(429).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Verify poster's email
router.post(
  "/verify",
  body("postId").isUUID(),
  body("email").isEmail().normalizeEmail(),
  body("code").isLength({ min: 6, max: 6 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId, email, code } = req.body;

      await verifyPosterEmail(postId, email, code);

      res.json({
        message: "Email verified! Check your inbox for the link.",
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
