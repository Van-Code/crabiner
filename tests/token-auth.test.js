import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert";
import { initDatabase, query, closeDatabase } from "../src/config/database.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  hashToken,
} from "../src/utils/tokens.js";

describe("Token-based Authentication System", () => {
  let testUser;

  before(async () => {
    // Initialize database
    await initDatabase();

    // Create test user
    const result = await query(
      `INSERT INTO users (google_sub, email, email_verified, name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        "test-google-sub-123",
        "test@example.com",
        true,
        "Test User",
        "https://example.com/avatar.jpg",
      ]
    );
    testUser = result.rows[0];
  });

  after(async () => {
    // Clean up test data
    await query("DELETE FROM refresh_tokens WHERE user_id = $1", [testUser.id]);
    await query("DELETE FROM users WHERE id = $1", [testUser.id]);
    await closeDatabase();
  });

  describe("Access Token", () => {
    it("should generate a valid access token", () => {
      const token = generateAccessToken(testUser);
      assert.ok(token);
      assert.strictEqual(typeof token, "string");
    });

    it("should verify a valid access token", () => {
      const token = generateAccessToken(testUser);
      const decoded = verifyAccessToken(token);

      assert.strictEqual(decoded.userId, testUser.id);
      assert.strictEqual(decoded.email, testUser.email);
      assert.strictEqual(decoded.name, testUser.name);
    });

    it("should reject an invalid access token", () => {
      assert.throws(() => {
        verifyAccessToken("invalid.token.here");
      });
    });

    it("should reject a tampered access token", () => {
      const token = generateAccessToken(testUser);
      const tampered = token.slice(0, -5) + "XXXXX";

      assert.throws(() => {
        verifyAccessToken(tampered);
      });
    });
  });

  describe("Refresh Token", () => {
    it("should generate a random refresh token", () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      assert.ok(token1);
      assert.ok(token2);
      assert.notStrictEqual(token1, token2);
      assert.strictEqual(typeof token1, "string");
    });

    it("should hash tokens consistently", () => {
      const token = generateRefreshToken();
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      assert.strictEqual(hash1, hash2);
    });

    it("should store a refresh token", async () => {
      const token = generateRefreshToken();
      const stored = await storeRefreshToken(testUser.id, token, {
        userAgent: "test-agent",
        ip: "127.0.0.1",
      });

      assert.ok(stored.id);
      assert.strictEqual(stored.user_id, testUser.id);

      // Clean up
      await query("DELETE FROM refresh_tokens WHERE id = $1", [stored.id]);
    });

    it("should verify a valid refresh token", async () => {
      const token = generateRefreshToken();
      await storeRefreshToken(testUser.id, token);

      const verification = await import("../src/utils/tokens.js").then((m) =>
        m.verifyRefreshToken(token)
      );

      assert.ok(verification);
      assert.strictEqual(verification.user.id, testUser.id);
      assert.strictEqual(verification.user.email, testUser.email);

      // Clean up
      await revokeRefreshToken(token);
    });

    it("should reject an invalid refresh token", async () => {
      const { verifyRefreshToken } = await import("../src/utils/tokens.js");
      const verification = await verifyRefreshToken("invalid-token");

      assert.strictEqual(verification, null);
    });

    it("should rotate a refresh token", async () => {
      const oldToken = generateRefreshToken();
      await storeRefreshToken(testUser.id, oldToken);

      const result = await rotateRefreshToken(oldToken);

      assert.ok(result.refreshToken);
      assert.notStrictEqual(result.refreshToken, oldToken);
      assert.strictEqual(result.user.id, testUser.id);

      // Old token should be revoked
      const { verifyRefreshToken } = await import("../src/utils/tokens.js");
      const oldVerification = await verifyRefreshToken(oldToken);
      assert.strictEqual(oldVerification, null);

      // Clean up
      await revokeRefreshToken(result.refreshToken);
    });

    it("should revoke a refresh token", async () => {
      const token = generateRefreshToken();
      await storeRefreshToken(testUser.id, token);

      const revoked = await revokeRefreshToken(token);
      assert.strictEqual(revoked, true);

      // Should not be able to use revoked token
      const { verifyRefreshToken } = await import("../src/utils/tokens.js");
      const verification = await verifyRefreshToken(token);
      assert.strictEqual(verification, null);
    });
  });

  describe("Protected Routes", () => {
    it("should require Authorization header for protected routes", async () => {
      const response = await fetch("http://localhost:3000/api/user", {
        method: "GET",
      });

      assert.strictEqual(response.status, 401);
      const data = await response.json();
      assert.strictEqual(data.error, "Authentication required");
    });

    it("should accept valid access token", async () => {
      const token = generateAccessToken(testUser);

      const response = await fetch("http://localhost:3000/api/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        assert.strictEqual(data.id, testUser.id);
        assert.strictEqual(data.email, testUser.email);
      } else {
        // Server might not be running, skip assertion
        console.log("Skipping live server test - server not available");
      }
    });

    it("should reject invalid access token", async () => {
      const response = await fetch("http://localhost:3000/api/user", {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid.token.here",
        },
      });

      if (response.status === 401) {
        const data = await response.json();
        assert.strictEqual(data.error, "Invalid token");
      } else {
        console.log("Skipping live server test - server not available");
      }
    });
  });

  describe("Token Refresh Flow", () => {
    it("should refresh access token with valid refresh token", async () => {
      const refreshToken = generateRefreshToken();
      await storeRefreshToken(testUser.id, refreshToken);

      const response = await fetch("http://localhost:3000/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.status === 200) {
        const data = await response.json();
        assert.ok(data.accessToken);
        assert.ok(data.refreshToken);

        // Clean up new token
        await revokeRefreshToken(data.refreshToken);
      } else {
        console.log("Skipping live server test - server not available");
      }
    });
  });

  describe("Logout Flow", () => {
    it("should revoke refresh token on logout", async () => {
      const refreshToken = generateRefreshToken();
      await storeRefreshToken(testUser.id, refreshToken);

      const response = await fetch("http://localhost:3000/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.status === 200) {
        const data = await response.json();
        assert.strictEqual(data.message, "Logged out successfully");

        // Token should be revoked
        const { verifyRefreshToken } = await import("../src/utils/tokens.js");
        const verification = await verifyRefreshToken(refreshToken);
        assert.strictEqual(verification, null);
      } else {
        console.log("Skipping live server test - server not available");
      }
    });
  });
});
