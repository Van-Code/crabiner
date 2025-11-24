import express from "express";
import { deletePost } from "../services/postService.js";

const router = express.Router();

// Delete post with management token
router.delete("/:id/:token", async (req, res, next) => {
  try {
    const { id, token } = req.params;

    await deletePost(id, token);

    res.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    if (error.message === "Post not found") {
      return res.status(404).json({ error: "Post not found" });
    }
    if (error.message === "Invalid management token") {
      return res.status(403).json({ error: "Invalid management token" });
    }
    next(error);
  }
});

export default router;
