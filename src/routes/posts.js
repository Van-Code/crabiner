import express from "express";
import { body, query } from "express-validator";
import { postRateLimiter } from "../middleware/rateLimiter.js";
import {
  createPost,
  getPosts,
  getPostById,
  searchPosts,
  getPopularSearches,
} from "../services/postService.js";
import { query as dbQuery } from "../config/database.js";
import { sendManagementEmail } from "../services/emailService.js";
import { validateRequest } from "../utils/validation.js";

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes
// Search posts
router.get(
  "/search",
  query("q").optional().trim().isLength({ max: 200 }),
  query("page").optional().isInt({ min: 1 }),
  query("cityKey").optional().trim().isLength({ max: 50 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { q, page = 1, location, cityKey } = req.query;

      const results = await searchPosts({
        queryString: q,
        page: parseInt(page),
        location,
        cityKey,
      });

      res.json(results);
    } catch (error) {
      next(error);
    }
  }
);
// Get city counts
router.get("/city-counts", async (req, res, next) => {
  try {
    const result = await dbQuery(
      `SELECT city_key, COUNT(*) as count
       FROM posts
       WHERE is_deleted = FALSE
         AND expires_at > NOW()
         AND city_key IS NOT NULL
       GROUP BY city_key
       ORDER BY count DESC`
    );

    res.json({ counts: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get popular searches
router.get("/popular-searches", async (req, res, next) => {
  try {
    const searches = await getPopularSearches();
    res.json({ searches });
  } catch (error) {
    next(error);
  }
});

// List posts (paginated)
router.get(
  "/",
  query("page").optional().isInt({ min: 1 }),
  query("cityKey").optional().trim().isLength({ max: 50 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { page = 1, location, cityKey } = req.query;
      const posts = await getPosts({
        page: parseInt(page),
        location,
        cityKey,
      });
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

// Create new post (POST routes can be anywhere)
router.post(
  "/",
  postRateLimiter,
  body("location").trim().isLength({ min: 2, max: 100 }),
  body("cityKey").optional().trim().isLength({ max: 50 }),
  body("title").trim().isLength({ min: 1, max: 100 }),
  body("description").trim().isLength({ min: 10, max: 2000 }),
  body("expiresInDays").isInt({ min: 7, max: 30 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await createPost(req.body);

      res.status(201).json({
        id: result.id,
        sessionToken: result.sessionToken,
        message: "Post created successfully!",
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
