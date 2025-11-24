import express from "express";
import { body } from "express-validator";
import { validateRequest } from "../utils/validation.js";
import {
  reportPost,
  getPendingReports,
  getFlaggedContent,
  reviewReport,
} from "../services/moderationService.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiter for reports (prevent abuse)
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reports per hour
  message: { error: "Too many reports. Please try again later." },
});

// Report a post (anonymous)
router.post(
  "/report",
  reportLimiter,
  body("postId").isUUID(),
  body("reason").isIn([
    "spam",
    "harassment",
    "inappropriate",
    "scam",
    "fake",
    "offensive",
    "other",
  ]),
  body("details").optional().trim().isLength({ max: 500 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { postId, reason, details } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await reportPost(postId, reason, details, ipAddress);

      res.json({
        message:
          "Report submitted. Thank you for helping keep our community safe.",
        reportId: result.reportId,
      });
    } catch (error) {
      if (error.message.includes("already reported")) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Get pending reports (moderator only - add auth later)
router.get("/reports/pending", async (req, res, next) => {
  try {
    // TODO: Add moderator authentication
    const reports = await getPendingReports();
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

// Get flagged content (moderator only)
router.get("/flagged", async (req, res, next) => {
  try {
    // TODO: Add moderator authentication
    const flagged = await getFlaggedContent();
    res.json({ flagged });
  } catch (error) {
    next(error);
  }
});

// Review a report (moderator only)
router.post(
  "/reports/:reportId/review",
  body("action").isIn(["delete", "warn", "no_action", "dismiss"]),
  body("reviewerName").trim().isLength({ min: 2, max: 100 }),
  validateRequest,
  async (req, res, next) => {
    try {
      // TODO: Add moderator authentication
      const { reportId } = req.params;
      const { action, reviewerName } = req.body;

      await reviewReport(reportId, action, reviewerName);

      res.json({ message: "Report reviewed successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
