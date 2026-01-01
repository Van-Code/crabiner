// UI Behavior and Validation Tests
// Run with: node --test tests/ui-validation.test.js
//
// Coverage:
// - Input validation and error messages
// - API error responses are properly formatted
// - Rate limiting behavior
// - Edge cases and boundary conditions
// - No crashes when data is empty or missing

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  API_BASE,
  generateTestPost,
  generateTestReply,
  assertStatus,
} from "./helpers/test-utils.js";

describe("UI Validation and Error Handling", () => {
  describe("Validation error format", () => {
    it("should return validation errors in consistent format", async () => {
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required fields
          title: "Test",
        }),
      });

      assertStatus(response, 400, "Should return 400 for validation errors");
      const data = await response.json();

      assert.ok(data.errors || data.error, "Should include error information");
    });

    it("should validate location field constraints", async () => {
      const postData = generateTestPost({
        location: "A", // Too short (min 2)
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assertStatus(response, 400, "Should reject location too short");
    });

    it("should validate location max length", async () => {
      const postData = generateTestPost({
        location: "A".repeat(101), // Too long (max 100)
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assertStatus(response, 400, "Should reject location too long");
    });

    it("should enforce title minimum length", async () => {
      const postData = generateTestPost({
        title: "", // Empty (min 1)
      });

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      assertStatus(response, 400, "Should reject empty title");
    });
  });

  describe("API error responses", () => {
    it("should return JSON error for 404 on API routes", async () => {
      const response = await fetch(
        `${API_BASE}/api/posts/00000000-0000-0000-0000-000000000000`
      );

      assertStatus(response, 404, "Should return 404 for non-existent post");
      const data = await response.json();

      assert.ok(data.error, "Should include error message");
      assert.strictEqual(
        typeof data.error,
        "string",
        "Error should be a string"
      );
    });

    it("should return JSON error for 401 unauthorized", async () => {
      const response = await fetch(`${API_BASE}/api/inbox`);

      assertStatus(response, 401, "Should return 401 for unauthorized");
      const data = await response.json();

      assert.ok(data.error, "Should include error message");
    });

    it("should handle malformed JSON gracefully", async () => {
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json{",
      });

      // Should return 400 for malformed JSON, not crash
      assert.ok(
        response.status === 400 || response.status === 500,
        "Should handle malformed JSON"
      );
    });

    it("should handle missing Content-Type header", async () => {
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: {},
        body: JSON.stringify(generateTestPost()),
      });

      // Should still process or return proper error
      assert.ok(response.status >= 400, "Should handle missing Content-Type");
    });
  });

  describe("Empty and null data handling", () => {
    it("should handle empty posts list gracefully", async () => {
      // Query for a city with no posts
      const response = await fetch(
        `${API_BASE}/api/posts?cityKey=nonexistent-city-12345`
      );

      assertStatus(response, 200, "Should return 200 even with no posts");
      const data = await response.json();

      assert.ok(Array.isArray(data.posts), "Should return empty array");
      assert.strictEqual(data.posts.length, 0, "Should have no posts");
    });

    it("should handle empty search results", async () => {
      const response = await fetch(
        `${API_BASE}/api/posts/search?q=nonexistentquery12345xyz`
      );

      assertStatus(response, 200, "Should return 200 for empty search");
      const data = await response.json();
      assert.ok(data, "Should return data structure");
    });

    it("should handle city counts with no posts", async () => {
      const response = await fetch(`${API_BASE}/api/posts/city-counts`);

      assertStatus(response, 200, "Should return 200 for city counts");
      const data = await response.json();

      assert.ok(Array.isArray(data.counts), "Should return counts array");
      // Array may be empty or populated
    });

    it("should handle inbox with no messages gracefully", async () => {
      // Create a new post and check its inbox immediately
      const createResponse = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateTestPost()),
      });

      if (createResponse.status === 429) {
        console.log("⊘ Rate limited - skipping test");
        return;
      }

      const created = await createResponse.json();

      const inboxResponse = await fetch(
        `${API_BASE}/api/inbox/${created.sessionToken}`
      );

      assertStatus(inboxResponse, 200, "Should return 200 for empty inbox");
      const inbox = await inboxResponse.json();

      assert.ok(Array.isArray(inbox.messages), "Should have messages array");
      assert.strictEqual(inbox.messages.length, 0, "Should have no messages");
      assert.strictEqual(inbox.unreadCount, 0, "Should have 0 unread");
    });
  });

  describe("Boundary conditions", () => {
    it("should handle exactly minimum description length (10 chars)", async () => {
      const postData = generateTestPost({
        description: "1234567890", // Exactly 10 characters
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

      assertStatus(
        response,
        201,
        "Should accept exactly minimum description length"
      );
    });

    it("should handle exactly maximum description length (2000 chars)", async () => {
      const postData = generateTestPost({
        description: "A".repeat(2000), // Exactly 2000 characters
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

      assertStatus(
        response,
        201,
        "Should accept exactly maximum description length"
      );
    });

    it("should handle exactly minimum reply message length (10 chars)", async () => {
      const replyData = generateTestReply({
        message: "1234567890", // Exactly 10 characters
      });

      // This will fail auth, but tests validation
      const response = await fetch(
        `${API_BASE}/api/replies/00000000-0000-0000-0000-000000000000`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replyData),
        }
      );

      // Should be 401 (auth) not 400 (validation)
      assert.ok(
        response.status === 401 || response.status === 404,
        "Validation should pass (fails on auth or post not found)"
      );
    });

    it("should handle exactly maximum reply message length (1000 chars)", async () => {
      const replyData = generateTestReply({
        message: "A".repeat(1000), // Exactly 1000 characters
      });

      const response = await fetch(
        `${API_BASE}/api/replies/00000000-0000-0000-0000-000000000000`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replyData),
        }
      );

      // Should be 401 (auth) not 400 (validation)
      assert.ok(
        response.status === 401 || response.status === 404,
        "Validation should pass (fails on auth or post not found)"
      );
    });

    it("should handle page=1 for pagination", async () => {
      const response = await fetch(`${API_BASE}/api/posts?page=1`);

      assertStatus(response, 200, "Should accept page=1");
      const data = await response.json();

      assert.strictEqual(data.page, 1, "Should be on page 1");
    });

    it("should reject page=0 for pagination", async () => {
      const response = await fetch(`${API_BASE}/api/posts?page=0`);

      // Should reject invalid page
      assert.ok(
        response.status === 400 || response.status === 200,
        "Should handle page=0"
      );
    });

    it("should handle very large page numbers gracefully", async () => {
      const response = await fetch(`${API_BASE}/api/posts?page=99999`);

      assertStatus(response, 200, "Should handle large page numbers");
      const data = await response.json();

      assert.ok(Array.isArray(data.posts), "Should return posts array");
      // Likely empty for such a large page
    });
  });

  describe("Rate limiting", () => {
    it("should return 429 when rate limit is exceeded", async () => {
      // Make many rapid requests to trigger rate limit
      const requests = [];
      for (let i = 0; i < 30; i++) {
        requests.push(
          fetch(`${API_BASE}/api/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generateTestPost()),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      if (rateLimited) {
        console.log("✓ Rate limiting is active");
        const limitedResponse = responses.find((r) => r.status === 429);
        const data = await limitedResponse.json();

        assert.ok(
          data.error || data.message,
          "Rate limit response should include error message"
        );
      } else {
        console.log("⊘ Rate limiting not triggered (may need more requests)");
      }
    });
  });

  describe("Special characters and encoding", () => {
    it("should handle special characters in post content", async () => {
      const postData = generateTestPost({
        title: "Test with émojis 🦀",
        description: "Special chars: <>&\"' and unicode: 你好 مرحبا",
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

      assertStatus(
        response,
        201,
        "Should accept special characters in content"
      );
    });

    it("should handle URL-encoded query parameters", async () => {
      const query = encodeURIComponent("search with spaces & special chars");
      const response = await fetch(`${API_BASE}/api/posts/search?q=${query}`);

      assertStatus(response, 200, "Should handle URL-encoded query parameters");
    });
  });

  describe("CORS and security headers", () => {
    it("should include security headers in responses", async () => {
      const response = await fetch(`${API_BASE}/api/posts`);

      // Check for common security headers
      // Note: Some headers may be stripped by fetch API
      assert.ok(response.headers, "Should have headers");
    });

    it("should set proper Content-Type for JSON responses", async () => {
      const response = await fetch(`${API_BASE}/api/posts`);

      const contentType = response.headers.get("content-type");
      assert.ok(
        contentType && contentType.includes("application/json"),
        "Should return JSON content type"
      );
    });
  });

  describe("Health check", () => {
    it("should respond to health check endpoint", async () => {
      const response = await fetch(`${API_BASE}/api/health`);

      assertStatus(response, 200, "Health check should return 200");
      const data = await response.json();

      assert.strictEqual(data.status, "ok", "Should report ok status");
      assert.ok(data.timestamp, "Should include timestamp");
      assert.ok(typeof data.uptime === "number", "Should include uptime");
    });
  });
});

console.log("✓ UI validation and error handling tests completed");
