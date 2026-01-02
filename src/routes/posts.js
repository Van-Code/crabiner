/**
 * Post Routes
 * Handles post creation, listing, and management
 */

import express from "express";
import { body, query } from "express-validator";
import { postRateLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createPost,
  getPosts,
  getPostById,
  getUserPosts,
  deleteUserPost,
} from "../services/postService.js";
import { validateRequest } from "../utils/validation.js";

const router = express.Router();

// Get user's own posts
router.get("/my-posts", requireAuth, async (req, res, next) => {
  try {
    const posts = await getUserPosts(req.user.id);
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

// List posts (paginated)
router.get(
  "/",
  query("page").optional().isInt({ min: 1 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { page = 1 } = req.query;
      const posts = await getPosts({ page: parseInt(page) });
      res.json(posts);
    } catch (error) {
      next(error);
    }
  }
);

// Get single post (KEEP THIS AFTER all other GET routes)
router.get("/:id", async (req, res, next) => {
  try {
    const post = await getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found or expired" });
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
});

// Create new post (requires authentication)
router.post(
  "/",
  requireAuth,
  postRateLimiter,
  body("title").trim().isLength({ min: 1, max: 100 }),
  body("body").trim().isLength({ min: 10, max: 2000 }),
  body("expiresInDays").isInt({ min: 7, max: 30 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await createPost(req.body, req.user.id);

      res.status(201).json({
        id: result.id,
        message: "Post created successfully!",
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      if (error.message.includes("Authentication required")) {
        return res.status(401).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Delete a post (auth required - only owner can delete)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await deleteUserPost(req.user.id, req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }
    if (error.message === "Post not found") {
      return res.status(404).json({ error: "Post not found" });
    }
    next(error);
  }
});

export default router;
