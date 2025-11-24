import rateLimit from "express-rate-limit";
import { config } from "../config/env.js";

// Global rate limiter (all requests)
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      message: "Please slow down and try again in a few minutes.",
    });
  },
});

// Post creation rate limiter (stricter)
export const postRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: config.rateLimit.maxPostsPerDay,
  message: {
    error: `Maximum ${config.rateLimit.maxPostsPerDay} posts per day.`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Daily post limit reached",
      message: `You can create up to ${config.rateLimit.maxPostsPerDay} posts per day. Please try again tomorrow.`,
    });
  },
});

// Reply rate limiter
export const replyRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: config.rateLimit.maxRepliesPerDay,
  message: {
    error: `Maximum ${config.rateLimit.maxRepliesPerDay} replies per day.`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Daily reply limit reached",
      message: `You can send up to ${config.rateLimit.maxRepliesPerDay} replies per day. Please try again tomorrow.`,
    });
  },
});
