// Test utilities and helpers for Crabiner tests
// Shared mocking, setup, and utility functions

import { randomBytes } from 'crypto';
import { nanoid } from 'nanoid';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

/**
 * Create a test user session (mocked Google auth flow)
 * In real implementation, this would go through OAuth
 */
export class TestSession {
  constructor() {
    this.cookies = [];
    this.authenticated = false;
  }

  async login() {
    // In a real test environment, you'd mock the OAuth flow
    // For now, we'll use the existing session system
    this.authenticated = true;
    return this;
  }

  async logout() {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    this.authenticated = false;
    this.cookies = [];
    return response;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
    }
    return headers;
  }

  setCookies(response) {
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      this.cookies = setCookieHeaders.map((c) => c.split(';')[0]);
    }
  }
}

/**
 * Generate test post data with valid fields
 */
export function generateTestPost(overrides = {}) {
  return {
    location: 'San Francisco, CA',
    cityKey: 'sf',
    title: 'Test Post',
    description: 'This is a test post for automated testing. It has enough content to meet validation requirements.',
    expiresInDays: 7,
    ...overrides,
  };
}

/**
 * Generate test reply data
 */
export function generateTestReply(overrides = {}) {
  return {
    message: 'This is a test reply message with enough content to meet the minimum length requirement.',
    contactEmail: `test-${nanoid(8)}@example.com`,
    ...overrides,
  };
}

/**
 * Helper to make authenticated requests
 */
export async function authenticatedFetch(url, options = {}, session) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...session?.getHeaders(),
      ...options.headers,
    },
  });

  // Update cookies from response
  if (session) {
    session.setCookies(response);
  }

  return response;
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Mock time utilities
 */
export class MockDate {
  constructor(initialDate = new Date()) {
    this.currentDate = new Date(initialDate);
    this.originalDate = Date;
  }

  advance(ms) {
    this.currentDate = new Date(this.currentDate.getTime() + ms);
  }

  advanceMinutes(minutes) {
    this.advance(minutes * 60 * 1000);
  }

  advanceHours(hours) {
    this.advance(hours * 60 * 60 * 1000);
  }

  advanceDays(days) {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  reset() {
    // In real implementation, you'd restore Date constructor
  }
}

/**
 * Clean test data from database
 */
export async function cleanupTestData(testIds = {}) {
  // This would connect to the database and clean up test data
  // For now, it's a placeholder
  const { postIds = [], replyIds = [], userIds = [] } = testIds;

  // In a real implementation:
  // await db.query('DELETE FROM replies WHERE id = ANY($1)', [replyIds]);
  // await db.query('DELETE FROM posts WHERE id = ANY($1)', [postIds]);
  // await db.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
}

/**
 * Assert response is successful
 */
export function assertSuccess(response, message) {
  if (!response.ok) {
    throw new Error(
      message || `Expected success but got ${response.status}: ${response.statusText}`
    );
  }
}

/**
 * Assert response has specific status code
 */
export function assertStatus(response, expectedStatus, message) {
  if (response.status !== expectedStatus) {
    throw new Error(
      message ||
        `Expected status ${expectedStatus} but got ${response.status}: ${response.statusText}`
    );
  }
}

/**
 * Create a minimal test database setup
 */
export class TestDatabase {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.client = null;
    this.createdIds = {
      posts: [],
      replies: [],
      users: [],
    };
  }

  async connect() {
    // Would initialize database connection
    // For now, placeholder
  }

  async disconnect() {
    // Would close database connection
    // For now, placeholder
  }

  async cleanup() {
    // Clean up all created test data
    await cleanupTestData(this.createdIds);
  }

  trackPost(postId) {
    this.createdIds.posts.push(postId);
  }

  trackReply(replyId) {
    this.createdIds.replies.push(replyId);
  }

  trackUser(userId) {
    this.createdIds.users.push(userId);
  }
}

export { API_BASE };
