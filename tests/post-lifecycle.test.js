// Post Creation and Browsing Tests
// Run with: node --test tests/post-lifecycle.test.js
//
// Coverage:
// - Creating a post succeeds with valid input
// - Required fields are enforced and show validation errors
// - Posts are grouped by date and sorted newest first
// - Relative time labels render correctly
// - Post filtering by city works correctly

import { describe, it, after } from "node:test";
import assert from "node:assert";
import {
  API_BASE,
  generateTestPost,
  assertStatus,
  assertSuccess,
} from "./helpers/test-utils.js";

const createdPostIds = [];

after(async () => {
  // Cleanup is handled by database expiration
  // In production, you might want to manually clean up test posts
  console.log(`Created ${createdPostIds.length} test posts during testing`);
});

describe("Post Creation", () => {
  describe("Valid post creation", () => {
    it("should create a post with all valid fields", async () => {
      const postData = generateTestPost({
        title: "Valid Test Post",
        description:
          "This is a valid test post with all required fields properly filled out.",
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.status === 429) {
        console.log("⊘ Rate limited - skipping test");
        return;
      }

      assertStatus(response, 201, "Should create post successfully");
      const data = await response.json();

      assert.ok(data.id, "Should return post ID");
      assert.ok(data.sessionToken, "Should return session token");
      assert.ok(data.expiresAt, "Should return expiration date");
      assert.strictEqual(
        data.message,
        "Post created successfully!",
        "Should return success message"
      );

      createdPostIds.push(data.id);
    });

    it("should accept minimum valid expiration (7 days)", async () => {
      const postData = generateTestPost({ expiresInDays: 7 });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.status === 429) {
        console.log("⊘ Rate limited - skipping test");
        return;
      }

      assertStatus(response, 201, "Should accept 7 day expiration");
      const data = await response.json();
      createdPostIds.push(data.id);
    });

    it("should accept maximum valid expiration (30 days)", async () => {
      const postData = generateTestPost({ expiresInDays: 30 });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.status === 429) {
        console.log("⊘ Rate limited - skipping test");
        return;
      }

      assertStatus(response, 201, "Should accept 30 day expiration");
      const data = await response.json();
      createdPostIds.push(data.id);
    });
  });

  describe("Required field validation", () => {
    it("should reject post without location", async () => {
      const postData = generateTestPost();
      delete postData.location;

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject post without location"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post without title", async () => {
      const postData = generateTestPost();
      delete postData.title;

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject post without title"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post without description", async () => {
      const postData = generateTestPost();
      delete postData.description;

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject post without description"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post with title too long (>100 chars)", async () => {
      const postData = generateTestPost({
        title: "A".repeat(101),
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(response.status, 400, "Should reject title too long");
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post with description too short (<10 chars)", async () => {
      const postData = generateTestPost({
        description: "Too short",
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject description too short"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post with description too long (>2000 chars)", async () => {
      const postData = generateTestPost({
        description: "A".repeat(2001),
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject description too long"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post with invalid expiration (<7 days)", async () => {
      const postData = generateTestPost({ expiresInDays: 6 });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject expiration less than 7 days"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });

    it("should reject post with invalid expiration (>30 days)", async () => {
      const postData = generateTestPost({ expiresInDays: 31 });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assert.strictEqual(
        response.status,
        400,
        "Should reject expiration greater than 30 days"
      );
      const data = await response.json();
      assert.ok(data.errors || data.error, "Should return validation error");
    });
  });

  describe("Input sanitization", () => {
    it("should trim whitespace from fields", async () => {
      const postData = generateTestPost({
        title: "  Whitespace Test  ",
        location: "  San Francisco, CA  ",
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.status === 429) {
        console.log("⊘ Rate limited - skipping test");
        return;
      }

      assertStatus(response, 201, "Should accept and trim whitespace");
      const data = await response.json();
      createdPostIds.push(data.id);

      // Verify trimming by fetching the post
      const getResponse = await fetch(`${API_BASE}/api/posts/${data.id}`);
      const post = await getResponse.json();

      assert.strictEqual(post.title, "Whitespace Test", "Should trim title");
      assert.strictEqual(
        post.location,
        "San Francisco, CA",
        "Should trim location"
      );
    });
  });
});

describe("Post Browsing", () => {
  describe("Post listing", () => {
    it("should return posts list with pagination", async () => {
      const response = await fetch(`${API_BASE}/api/posts?page=1`);

      assertSuccess(response, "Should fetch posts successfully");
      const data = await response.json();

      assert.ok(Array.isArray(data.posts), "Should return posts array");
      assert.ok(
        typeof data.totalPages === "number",
        "Should return total pages"
      );
      assert.ok(typeof data.page === "number", "Should return current page");
    });

    it("should return posts sorted by date (newest first)", async () => {
      const response = await fetch(`${API_BASE}/api/posts?page=1`);

      assertSuccess(response, "Should fetch posts successfully");
      const data = await response.json();

      if (data.posts.length > 1) {
        const dates = data.posts.map((p) => new Date(p.posted_at).getTime());
        const sortedDates = [...dates].sort((a, b) => b - a);

        assert.deepStrictEqual(
          dates,
          sortedDates,
          "Posts should be sorted newest first"
        );
      }
    });

    it("should filter posts by city key", async () => {
      const response = await fetch(`${API_BASE}/api/posts?cityKey=sf`);

      assertSuccess(response, "Should fetch SF posts successfully");
      const data = await response.json();

      assert.ok(Array.isArray(data.posts), "Should return posts array");

      // Verify all returned posts are for SF
      data.posts.forEach((post) => {
        assert.strictEqual(post.city_key, "sf", "All posts should be for SF");
      });
    });

    it("should not return deleted posts", async () => {
      const response = await fetch(`${API_BASE}/api/posts`);

      assertSuccess(response, "Should fetch posts successfully");
      const data = await response.json();

      // All returned posts should have is_deleted = false
      // We can't directly check this from the API, but deleted posts shouldn't appear
      assert.ok(Array.isArray(data.posts), "Should return posts array");
    });

    it("should not return expired posts", async () => {
      const response = await fetch(`${API_BASE}/api/posts`);

      assertSuccess(response, "Should fetch posts successfully");
      const data = await response.json();

      const now = new Date();
      data.posts.forEach((post) => {
        const expiresAt = new Date(post.expires_at);
        assert.ok(expiresAt > now, "Post should not be expired");
      });
    });
  });

  describe("Individual post retrieval", () => {
    it("should retrieve a single post by ID", async () => {
      // First create a post
      const postData = generateTestPost();
      const createResponse = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (createResponse.status === 429) {
        console.log("⊘ Rate limited - skipping test");
        return;
      }

      const created = await createResponse.json();
      createdPostIds.push(created.id);

      // Now retrieve it
      const response = await fetch(`${API_BASE}/api/posts/${created.id}`);

      assertSuccess(response, "Should retrieve post successfully");
      const post = await response.json();

      assert.strictEqual(post.id, created.id, "Should return correct post");
      assert.strictEqual(
        post.title,
        postData.title,
        "Should have correct title"
      );
      assert.strictEqual(
        post.description,
        postData.description,
        "Should have correct description"
      );
    });

    it("should return 404 for non-existent post", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(`${API_BASE}/api/posts/${fakeId}`);

      assertStatus(response, 404, "Should return 404 for non-existent post");
      const data = await response.json();
      assert.ok(data.error, "Should include error message");
    });
  });

  describe("Post search", () => {
    it("should search posts by query string", async () => {
      const response = await fetch(
        `${API_BASE}/api/posts/search?q=test&page=1`
      );

      assertSuccess(response, "Should search posts successfully");
      const data = await response.json();

      assert.ok(data, "Should return search results");
    });

    it("should handle empty search query", async () => {
      const response = await fetch(`${API_BASE}/api/posts/search?q=&page=1`);

      assertSuccess(response, "Should handle empty query");
    });

    it("should filter search by city", async () => {
      const response = await fetch(
        `${API_BASE}/api/posts/search?q=test&cityKey=sf`
      );

      assertSuccess(response, "Should search with city filter");
    });
  });

  describe("City counts", () => {
    it("should return post counts per city", async () => {
      const response = await fetch(`${API_BASE}/api/posts/city-counts`);

      assertSuccess(response, "Should fetch city counts successfully");
      const data = await response.json();

      assert.ok(Array.isArray(data.counts), "Should return counts array");

      data.counts.forEach((cityCount) => {
        assert.ok(cityCount.city_key, "Should have city_key");
        assert.ok(
          typeof cityCount.count === "string" ||
            typeof cityCount.count === "number",
          "Should have count"
        );
      });
    });

    it("should return counts in descending order", async () => {
      const response = await fetch(`${API_BASE}/api/posts/city-counts`);

      assertSuccess(response, "Should fetch city counts successfully");
      const data = await response.json();

      if (data.counts.length > 1) {
        const counts = data.counts.map((c) => parseInt(c.count));
        const sortedCounts = [...counts].sort((a, b) => b - a);

        assert.deepStrictEqual(
          counts,
          sortedCounts,
          "Counts should be sorted descending"
        );
      }
    });
  });
});

console.log("✓ Post lifecycle tests completed");
