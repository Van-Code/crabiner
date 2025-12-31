// Basic tests for auth enforcement on replies and inbox
// Run with: npm test tests/auth-replies.test.js

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

describe('Auth Enforcement Tests', () => {
  describe('Reply endpoints', () => {
    it('should return 401 when trying to reply without auth', async () => {
      const response = await fetch(`${API_BASE}/api/replies/test-post-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          contactEmail: 'test@example.com',
        }),
      });

      assert.strictEqual(response.status, 401, 'Expected 401 for unauthenticated reply');
      const data = await response.json();
      assert.ok(data.error, 'Expected error message in response');
    });
  });

  describe('Inbox endpoints', () => {
    it('should return 401 when accessing inbox without auth', async () => {
      const response = await fetch(`${API_BASE}/api/inbox`, {
        method: 'GET',
      });

      assert.strictEqual(response.status, 401, 'Expected 401 for unauthenticated inbox access');
      const data = await response.json();
      assert.ok(data.error, 'Expected error message in response');
    });
  });

  describe('Auth status endpoint', () => {
    it('should return authenticated: false when not logged in', async () => {
      const response = await fetch(`${API_BASE}/auth/status`);

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.authenticated, false);
      assert.strictEqual(data.user, null);
    });
  });
});

console.log('Auth enforcement tests completed');
