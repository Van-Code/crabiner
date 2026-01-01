// Conversations and Matching Tests
// Run with: node --test tests/conversations.test.js
//
// Coverage:
// - Sending replies requires authentication
// - Reply validation (message length, email format)
// - Viewing inbox requires authentication or session token
// - Conversation message retrieval
// - Mark as read functionality
// - Delete message functionality
// - Session token-based inbox access (anonymous posters)

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  API_BASE,
  generateTestPost,
  generateTestReply,
  assertStatus,
  assertSuccess,
} from './helpers/test-utils.js';

describe('Conversations and Messaging', () => {
  let testPost = null;

  // Create a test post to work with
  before(async () => {
    const response = await fetch(`${API_BASE}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        generateTestPost({
          title: 'Conversation Test Post',
          description: 'This post is used for testing conversations and replies functionality.',
        })
      ),
    });

    if (response.ok) {
      testPost = await response.json();
    }
  });

  describe('Reply creation', () => {
    it('should require authentication to send a reply', async () => {
      if (!testPost) {
        console.log('⊘ Skipping: No test post available');
        return;
      }

      const response = await fetch(`${API_BASE}/api/replies/${testPost.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateTestReply()),
      });

      assertStatus(
        response,
        401,
        'Should require authentication to send reply'
      );
      const data = await response.json();
      assert.ok(data.error, 'Should include error message');
    });

    it('should reject reply with message too short', async () => {
      if (!testPost) {
        console.log('⊘ Skipping: No test post available');
        return;
      }

      const response = await fetch(`${API_BASE}/api/replies/${testPost.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Too short',
          contactEmail: 'test@example.com',
        }),
      });

      // Will be 401 (auth) or 400 (validation) depending on auth state
      assert.ok(
        response.status === 400 || response.status === 401,
        'Should reject short message'
      );
    });

    it('should reject reply with message too long', async () => {
      if (!testPost) {
        console.log('⊘ Skipping: No test post available');
        return;
      }

      const response = await fetch(`${API_BASE}/api/replies/${testPost.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'A'.repeat(1001),
          contactEmail: 'test@example.com',
        }),
      });

      assert.ok(
        response.status === 400 || response.status === 401,
        'Should reject long message'
      );
    });

    it('should reject reply with invalid email', async () => {
      if (!testPost) {
        console.log('⊘ Skipping: No test post available');
        return;
      }

      const response = await fetch(`${API_BASE}/api/replies/${testPost.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test message that is long enough for validation.',
          contactEmail: 'not-an-email',
        }),
      });

      assert.ok(
        response.status === 400 || response.status === 401,
        'Should reject invalid email'
      );
    });

    it('should reject reply without contactEmail', async () => {
      if (!testPost) {
        console.log('⊘ Skipping: No test post available');
        return;
      }

      const response = await fetch(`${API_BASE}/api/replies/${testPost.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test message that is long enough for validation.',
        }),
      });

      assert.ok(
        response.status === 400 || response.status === 401,
        'Should require contactEmail'
      );
    });

    it('should reject reply to non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(`${API_BASE}/api/replies/${fakeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateTestReply()),
      });

      // Will be 401 (auth required) or 404 (post not found) depending on auth
      assert.ok(
        response.status === 404 || response.status === 401,
        'Should reject reply to non-existent post'
      );
    });
  });

  describe('Inbox access control', () => {
    it('should require authentication for authenticated inbox endpoint', async () => {
      const response = await fetch(`${API_BASE}/api/inbox`);

      assertStatus(
        response,
        401,
        'Should require authentication for inbox'
      );
      const data = await response.json();
      assert.ok(data.error, 'Should include error message');
    });

    it('should allow session token-based inbox access', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}`
      );

      assertSuccess(
        response,
        'Should allow inbox access with session token'
      );
      const data = await response.json();

      assert.ok(data.post, 'Should include post information');
      assert.ok(Array.isArray(data.messages), 'Should include messages array');
      assert.ok(
        typeof data.unreadCount === 'number',
        'Should include unread count'
      );
    });

    it('should return 404 for invalid session token', async () => {
      const fakeToken = 'invalid-session-token-123';

      const response = await fetch(`${API_BASE}/api/inbox/${fakeToken}`);

      assertStatus(
        response,
        404,
        'Should reject invalid session token'
      );
      const data = await response.json();
      assert.ok(data.error, 'Should include error message');
    });

    it('should include correct post metadata in session token inbox', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}`
      );

      assertSuccess(response, 'Should fetch inbox successfully');
      const data = await response.json();

      assert.strictEqual(data.post.id, testPost.id, 'Should have correct post ID');
      assert.ok(data.post.location, 'Should have location');
      assert.ok(data.post.description, 'Should have description');
      assert.ok(data.post.posted_at, 'Should have posted_at');
      assert.ok(data.post.expires_at, 'Should have expires_at');
    });

    it('should not expose sensitive data in inbox response', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}`
      );

      assertSuccess(response, 'Should fetch inbox successfully');
      const data = await response.json();

      // Should not expose management token or other sensitive fields
      assert.ok(!data.post.management_token, 'Should not expose management token');
      assert.ok(!data.post.session_token, 'Should not expose session token');
      assert.ok(
        !data.post.management_token_hash,
        'Should not expose token hash'
      );
    });
  });

  describe('Message management', () => {
    it('should require session token to mark message as read', async () => {
      const fakeMessageId = '00000000-0000-0000-0000-000000000000';
      const fakeToken = 'invalid-token';

      const response = await fetch(
        `${API_BASE}/api/inbox/${fakeToken}/messages/${fakeMessageId}/read`,
        {
          method: 'PATCH',
        }
      );

      assertStatus(
        response,
        404,
        'Should reject invalid session token'
      );
    });

    it('should require session token to delete message', async () => {
      const fakeMessageId = '00000000-0000-0000-0000-000000000000';
      const fakeToken = 'invalid-token';

      const response = await fetch(
        `${API_BASE}/api/inbox/${fakeToken}/messages/${fakeMessageId}`,
        {
          method: 'DELETE',
        }
      );

      assertStatus(
        response,
        404,
        'Should reject invalid session token'
      );
    });

    it('should validate poster reply message length', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const fakeReplyId = '00000000-0000-0000-0000-000000000000';

      // Empty message
      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}/messages/${fakeReplyId}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '' }),
        }
      );

      assert.strictEqual(
        response.status,
        400,
        'Should reject empty message'
      );
    });

    it('should reject poster reply with message too long', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const fakeReplyId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}/messages/${fakeReplyId}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'A'.repeat(1001) }),
        }
      );

      assert.strictEqual(
        response.status,
        400,
        'Should reject message too long'
      );
    });
  });

  describe('Inbox data integrity', () => {
    it('should initialize inbox with empty messages array', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}`
      );

      assertSuccess(response, 'Should fetch inbox successfully');
      const data = await response.json();

      assert.ok(Array.isArray(data.messages), 'Messages should be an array');
      assert.strictEqual(
        data.unreadCount,
        0,
        'New post should have 0 unread messages'
      );
    });

    it('should handle null or missing post data gracefully', async () => {
      // This tests the requirement: "Conversation view does not allow null or missing post data"
      const fakeToken = 'nonexistent-token-12345';

      const response = await fetch(`${API_BASE}/api/inbox/${fakeToken}`);

      assertStatus(
        response,
        404,
        'Should return 404 for missing post data'
      );
      const data = await response.json();
      assert.ok(data.error, 'Should include error message');
    });

    it('should return proper structure for empty inbox', async () => {
      if (!testPost || !testPost.sessionToken) {
        console.log('⊘ Skipping: No test post session token available');
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/inbox/${testPost.sessionToken}`
      );

      assertSuccess(response, 'Should fetch inbox successfully');
      const data = await response.json();

      // Verify complete structure
      assert.ok(data.post, 'Should have post object');
      assert.ok(Array.isArray(data.messages), 'Should have messages array');
      assert.ok(
        typeof data.unreadCount === 'number',
        'Should have unreadCount number'
      );

      // Post should have all required fields
      assert.ok(data.post.id, 'Post should have id');
      assert.ok(data.post.location, 'Post should have location');
      assert.ok(data.post.description, 'Post should have description');
      assert.ok(data.post.posted_at, 'Post should have posted_at');
      assert.ok(data.post.expires_at, 'Post should have expires_at');
    });
  });
});

console.log('✓ Conversations and messaging tests completed');
