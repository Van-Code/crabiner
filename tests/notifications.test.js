/**
 * Notification System Tests
 * Tests notification creation, push token registration, and notification endpoints
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import pkg from "pg";
const { Client } = pkg;

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_DB_URL = process.env.DATABASE_URL;

// Mock push sender for testing
let mockPushCalls = [];

// Test users
const TEST_USERS = [
  {
    google_sub: "test_notifications_user_1",
    email: "notif_alice@test.com",
    name: "Alice Test",
  },
  {
    google_sub: "test_notifications_user_2",
    email: "notif_bob@test.com",
    name: "Bob Test",
  },
];

let dbClient;
let server;
let userTokens = [];

describe("Notification System Tests", () => {
  beforeEach(async () => {
    // Connect to database
    dbClient = new Client({ connectionString: TEST_DB_URL });
    await dbClient.connect();

    // Clean up test data
    await dbClient.query("DELETE FROM notifications WHERE 1=1");
    await dbClient.query("DELETE FROM user_push_tokens WHERE 1=1");
    await dbClient.query("DELETE FROM replies WHERE 1=1");
    await dbClient.query("DELETE FROM posts WHERE 1=1");
    await dbClient.query("DELETE FROM refresh_tokens WHERE 1=1");
    await dbClient.query(
      "DELETE FROM users WHERE email LIKE '%@test.com' OR google_sub LIKE 'test_%'"
    );

    // Create test users and get tokens
    userTokens = [];
    for (const userData of TEST_USERS) {
      // Create user
      const userResult = await dbClient.query(
        `INSERT INTO users (google_sub, email, email_verified, name, avatar_url)
         VALUES ($1, $2, true, $3, 'https://example.com/avatar.jpg')
         RETURNING id`,
        [userData.google_sub, userData.email, userData.name]
      );

      const userId = userResult.rows[0].id;

      // Generate access token by calling the token generation directly
      const { generateAccessToken } = await import(
        "../src/utils/tokens.js"
      );
      const accessToken = generateAccessToken({
        id: userId,
        google_sub: userData.google_sub,
        email: userData.email,
        email_verified: true,
        name: userData.name,
        avatar_url: "https://example.com/avatar.jpg",
      });

      userTokens.push({
        userId,
        accessToken,
        userData,
      });
    }

    // Reset mock push calls
    mockPushCalls = [];

    // Set mock push sender
    const { setPushSender } = await import(
      "../src/services/notificationService.js"
    );
    setPushSender(async (userId, payload) => {
      mockPushCalls.push({ userId, payload });
      return { success: true, mock: true };
    });
  });

  afterEach(async () => {
    if (dbClient) {
      await dbClient.end();
    }
  });

  test("Creating a reply should create a notification", async () => {
    const [user1, user2] = userTokens;

    // User 1 creates a post
    const postResult = await dbClient.query(
      `INSERT INTO posts (user_id, title, body, expires_at, status)
       VALUES ($1, 'Test Post', 'This is a test post', NOW() + INTERVAL '7 days', 'active')
       RETURNING id`,
      [user1.userId]
    );
    const postId = postResult.rows[0].id;

    // User 2 replies to the post
    const replyResponse = await fetch(`${BASE_URL}/api/replies/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2.accessToken}`,
      },
      body: JSON.stringify({
        body: "This is a test reply to your post!",
      }),
    });

    assert.strictEqual(
      replyResponse.status,
      200,
      "Reply creation should succeed"
    );
    const replyData = await replyResponse.json();
    assert.ok(replyData.success);
    assert.ok(replyData.replyId);

    // Check that a notification was created for user 1
    const notificationResult = await dbClient.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND type = 'new_reply'`,
      [user1.userId]
    );

    assert.strictEqual(
      notificationResult.rows.length,
      1,
      "One notification should be created"
    );

    const notification = notificationResult.rows[0];
    assert.strictEqual(notification.type, "new_reply");
    assert.strictEqual(notification.entity_id, replyData.replyId);
    assert.ok(notification.title.includes("Reply"));
    assert.ok(notification.body.includes("Bob Test"));
    assert.strictEqual(notification.read_at, null);
  });

  test("Push sender should be called with correct data", async () => {
    const [user1, user2] = userTokens;

    // Register a push token for user 1
    const registerResponse = await fetch(`${BASE_URL}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({
        token: "test_push_token_123",
        platform: "ios",
      }),
    });

    assert.strictEqual(registerResponse.status, 200);

    // User 1 creates a post
    const postResult = await dbClient.query(
      `INSERT INTO posts (user_id, title, body, expires_at, status)
       VALUES ($1, 'Test Post', 'This is a test post', NOW() + INTERVAL '7 days', 'active')
       RETURNING id`,
      [user1.userId]
    );
    const postId = postResult.rows[0].id;

    // User 2 replies to the post
    await fetch(`${BASE_URL}/api/replies/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2.accessToken}`,
      },
      body: JSON.stringify({
        body: "This is a test reply!",
      }),
    });

    // Check that push sender was called
    assert.strictEqual(
      mockPushCalls.length,
      1,
      "Push sender should be called once"
    );

    const pushCall = mockPushCalls[0];
    assert.strictEqual(pushCall.userId, user1.userId);
    assert.ok(pushCall.payload.title.includes("Reply"));
    assert.ok(pushCall.payload.body.includes("Bob Test"));
    assert.strictEqual(pushCall.payload.platform, "ios");
    assert.strictEqual(pushCall.payload.token, "test_push_token_123");
  });

  test("GET /api/notifications should return user notifications", async () => {
    const [user1, user2] = userTokens;

    // Create a notification for user 1
    await dbClient.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'new_reply', 'Test Notification', 'Test Body')`,
      [user1.userId]
    );

    // Get notifications
    const response = await fetch(`${BASE_URL}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${user1.accessToken}`,
      },
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json();

    assert.strictEqual(data.notifications.length, 1);
    assert.strictEqual(data.notifications[0].title, "Test Notification");
    assert.strictEqual(data.unreadCount, 1);
  });

  test("POST /api/notifications/:id/read should mark notification as read", async () => {
    const [user1] = userTokens;

    // Create a notification
    const notifResult = await dbClient.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'new_reply', 'Test', 'Body')
       RETURNING id`,
      [user1.userId]
    );
    const notifId = notifResult.rows[0].id;

    // Mark as read
    const response = await fetch(
      `${BASE_URL}/api/notifications/${notifId}/read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user1.accessToken}`,
        },
      }
    );

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.ok(data.success);

    // Verify it's marked as read in DB
    const checkResult = await dbClient.query(
      `SELECT read_at FROM notifications WHERE id = $1`,
      [notifId]
    );
    assert.notStrictEqual(checkResult.rows[0].read_at, null);
  });

  test("POST /api/push/register should register push token", async () => {
    const [user1] = userTokens;

    const response = await fetch(`${BASE_URL}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({
        token: "test_token_abc",
        platform: "android",
      }),
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.ok(data.success);

    // Verify token in database
    const tokenResult = await dbClient.query(
      `SELECT * FROM user_push_tokens WHERE user_id = $1 AND token = $2`,
      [user1.userId, "test_token_abc"]
    );

    assert.strictEqual(tokenResult.rows.length, 1);
    assert.strictEqual(tokenResult.rows[0].platform, "android");
    assert.strictEqual(tokenResult.rows[0].revoked_at, null);
  });

  test("POST /api/push/unregister should revoke push token", async () => {
    const [user1] = userTokens;

    // Register token first
    await fetch(`${BASE_URL}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({
        token: "test_token_xyz",
        platform: "web",
      }),
    });

    // Unregister token
    const response = await fetch(`${BASE_URL}/api/push/unregister`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({
        token: "test_token_xyz",
      }),
    });

    assert.strictEqual(response.status, 200);

    // Verify token is revoked
    const tokenResult = await dbClient.query(
      `SELECT revoked_at FROM user_push_tokens WHERE user_id = $1 AND token = $2`,
      [user1.userId, "test_token_xyz"]
    );

    assert.notStrictEqual(tokenResult.rows[0].revoked_at, null);
  });

  test("Inbox unread counts should reflect reply read status", async () => {
    const [user1, user2] = userTokens;

    // User 1 creates a post
    const postResult = await dbClient.query(
      `INSERT INTO posts (user_id, title, body, expires_at, status)
       VALUES ($1, 'Post 1', 'Body', NOW() + INTERVAL '7 days', 'active')
       RETURNING id`,
      [user1.userId]
    );
    const postId = postResult.rows[0].id;

    // User 2 sends 3 replies
    for (let i = 0; i < 3; i++) {
      await fetch(`${BASE_URL}/api/replies/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user2.accessToken}`,
        },
        body: JSON.stringify({
          body: `Test reply number ${i + 1}`,
        }),
      });
    }

    // Get user1's replies
    const repliesResponse = await fetch(`${BASE_URL}/api/replies`, {
      headers: {
        Authorization: `Bearer ${user1.accessToken}`,
      },
    });

    const repliesData = await repliesResponse.json();
    assert.strictEqual(repliesData.replies.length, 3);
    assert.strictEqual(repliesData.unreadCount, 3);

    // Mark one as read
    const replyId = repliesData.replies[0].id;
    await fetch(`${BASE_URL}/api/replies/${replyId}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user1.accessToken}`,
      },
    });

    // Check unread count again
    const updatedResponse = await fetch(`${BASE_URL}/api/replies`, {
      headers: {
        Authorization: `Bearer ${user1.accessToken}`,
      },
    });

    const updatedData = await updatedResponse.json();
    assert.strictEqual(updatedData.unreadCount, 2);
  });

  test("Cannot reply to own post", async () => {
    const [user1] = userTokens;

    // User 1 creates a post
    const postResult = await dbClient.query(
      `INSERT INTO posts (user_id, title, body, expires_at, status)
       VALUES ($1, 'My Post', 'Body', NOW() + INTERVAL '7 days', 'active')
       RETURNING id`,
      [user1.userId]
    );
    const postId = postResult.rows[0].id;

    // User 1 tries to reply to their own post
    const response = await fetch(`${BASE_URL}/api/replies/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({
        body: "Replying to my own post",
      }),
    });

    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.ok(data.error.includes("own post"));
  });

  test("Unauthenticated requests to notifications should return 401", async () => {
    const response = await fetch(`${BASE_URL}/api/notifications`);
    assert.strictEqual(response.status, 401);
  });

  test("Unauthenticated requests to push register should return 401", async () => {
    const response = await fetch(`${BASE_URL}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: "test",
        platform: "ios",
      }),
    });
    assert.strictEqual(response.status, 401);
  });
});

console.log("✓ All notification tests completed");
