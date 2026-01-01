# Crabiner Test Suite

Comprehensive automated tests covering Crabiner's core functionality and guarding against regressions.

## Overview

This test suite covers:
- Authentication and access control
- Post creation and browsing
- Conversations and messaging
- Inbox and notifications
- UI validation and error handling

## Prerequisites

1. **Running server**: The API must be running before tests execute
   ```bash
   npm run dev:test    # Recommended: Runs with rate limiting disabled
   # or
   npm run dev         # Standard dev mode (rate limits apply)
   ```

2. **Environment variables**: Set `API_BASE` if not using default
   ```bash
   export API_BASE=http://localhost:3000
   ```

3. **Database**: Tests interact with the actual database, so ensure:
   - Database is running and accessible
   - Schema is up to date
   - Test data will be created (and expires automatically)

**Note**: Tests automatically disable rate limiting via `DISABLE_RATE_LIMIT=true` environment variable.

## Running Tests

### Run all tests
```bash
npm test
```

### Run individual test suites
```bash
# Authentication and access control tests
npm run test:auth

# Post creation and browsing tests
npm run test:posts

# Conversations and messaging tests
npm run test:conversations

# Inbox and notifications tests
npm run test:inbox

# UI validation and error handling tests
npm run test:ui
```

### Run legacy tests
```bash
npm run test:legacy
```

### Direct test execution
You can also run tests directly with Node:
```bash
# Using Node's built-in test runner (with rate limiting disabled)
DISABLE_RATE_LIMIT=true node --test tests/auth-flow.test.js

# Multiple files
DISABLE_RATE_LIMIT=true node --test tests/**/*.test.js

# With custom API endpoint
DISABLE_RATE_LIMIT=true API_BASE=http://localhost:8080 node --test tests/auth-flow.test.js
```

## Test Coverage

### 1. Authentication and Access Control (`auth-flow.test.js`)

**What it tests:**
- ✓ Signed-out users can browse posts
- ✓ Signed-out users can view individual posts
- ✓ Signed-out users can view city counts and search
- ✓ Signed-out users receive 401 when trying to reply
- ✓ Signed-out users receive 401 when accessing inbox
- ✓ Signed-out users receive 401 when accessing my-posts
- ✓ Signed-out users receive 401 when accessing saved posts
- ✓ Signed-out users receive 401 when trying to save a post
- ✓ Signed-out users receive 401 when trying to delete a post
- ✓ Auth status endpoint returns correct state
- ✓ User endpoint requires authentication
- ✓ Anonymous post creation works

**Key scenarios:**
- Unauthenticated browsing works as expected
- Protected endpoints properly return 401 with error messages
- No sensitive data leakage in auth responses

### 2. Post Creation and Browsing (`post-lifecycle.test.js`)

**What it tests:**
- ✓ Creating posts with valid input succeeds
- ✓ Required fields are enforced (location, title, description)
- ✓ Field length validation (min/max for all fields)
- ✓ Expiration validation (7-30 days)
- ✓ Input sanitization (whitespace trimming)
- ✓ Posts list with pagination
- ✓ Posts sorted by date (newest first)
- ✓ City-based filtering works
- ✓ Deleted/expired posts are excluded
- ✓ Individual post retrieval
- ✓ 404 for non-existent posts
- ✓ Search functionality
- ✓ City counts endpoint

**Key scenarios:**
- All validation rules are enforced correctly
- Posts are properly filtered and sorted
- Empty results handled gracefully

### 3. Conversations and Messaging (`conversations.test.js`)

**What it tests:**
- ✓ Replies require authentication
- ✓ Reply message validation (10-1000 chars)
- ✓ Email format validation for contact email
- ✓ Reply to non-existent post returns 404
- ✓ Inbox requires authentication or session token
- ✓ Session token-based inbox access works
- ✓ Invalid session tokens rejected
- ✓ Post metadata included correctly in inbox
- ✓ No sensitive data exposed in inbox
- ✓ Mark as read functionality
- ✓ Delete message functionality
- ✓ Poster reply validation
- ✓ Inbox data integrity (no null/missing data)

**Key scenarios:**
- All reply operations properly authenticated
- Conversation data always complete and valid
- Session tokens provide secure anonymous access

### 4. Inbox and Notifications (`inbox-notifications.test.js`)

**What it tests:**
- ✓ Authenticated inbox requires authentication
- ✓ Session-based inbox access works
- ✓ Unread count tracking
- ✓ Empty inbox returns proper structure
- ✓ Read status tracked for messages
- ✓ Mark as read endpoint works
- ✓ Message deletion requires authorization
- ✓ Poster reply functionality
- ✓ All required fields present (no null data)
- ✓ Error handling for invalid tokens/IDs

**Key scenarios:**
- Unread/read state properly managed
- Inbox always returns complete data structure
- Authorization enforced for all operations

### 5. UI Validation and Error Handling (`ui-validation.test.js`)

**What it tests:**
- ✓ Validation error format consistency
- ✓ All field constraint validations
- ✓ JSON error responses for API routes
- ✓ Malformed JSON handling
- ✓ Empty data handling (posts, search, inbox)
- ✓ Boundary conditions (exact min/max lengths)
- ✓ Pagination edge cases
- ✓ Rate limiting behavior
- ✓ Special characters and unicode support
- ✓ URL encoding handling
- ✓ Security headers present
- ✓ Health check endpoint

**Key scenarios:**
- No crashes on edge cases or invalid input
- Consistent error response format
- Graceful handling of empty data

## Test Structure

### Test Utilities (`helpers/test-utils.js`)

Shared utilities for all tests:
- `TestSession` - Mock authentication sessions
- `generateTestPost()` - Generate valid test post data
- `generateTestReply()` - Generate valid test reply data
- `authenticatedFetch()` - Make authenticated requests
- `assertSuccess()` - Assert successful responses
- `assertStatus()` - Assert specific status codes
- `MockDate` - Time manipulation utilities
- `TestDatabase` - Database cleanup helpers

### Test Patterns

Tests follow these patterns:
1. **Integration tests over unit tests** - Test user flows, not implementation
2. **No implementation details** - Test behavior, not internals
3. **Cleanup handled automatically** - Posts expire, no manual cleanup needed
4. **Rate limit aware** - Tests skip gracefully when rate limited
5. **Consistent naming** - `should <behavior> when <condition>`

## Writing New Tests

### Example test structure:
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { API_BASE, generateTestPost, assertSuccess } from './helpers/test-utils.js';

describe('Feature Name', () => {
  let testData;

  before(async () => {
    // Setup test data
  });

  after(async () => {
    // Cleanup if needed (usually not required)
  });

  describe('Specific behavior', () => {
    it('should behave correctly when condition is met', async () => {
      const response = await fetch(`${API_BASE}/api/endpoint`);

      assertSuccess(response, 'Should succeed');
      const data = await response.json();

      assert.strictEqual(data.field, expectedValue, 'Should match');
    });
  });
});
```

### Guidelines:
1. Test user-facing behavior, not internals
2. Use descriptive test names
3. Include error cases
4. Test edge cases and boundaries
5. Keep tests independent (no shared state)
6. Handle rate limiting gracefully
7. Don't modify production code unless necessary

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    DISABLE_RATE_LIMIT=true npm run dev &
    sleep 5
    npm test
```

Or use the dedicated test server command:

```yaml
- name: Run tests
  run: |
    npm run dev:test &
    sleep 5
    npm test
```

## Troubleshooting

### Tests fail with "Connection refused"
- Ensure the server is running: `npm run dev:test` or `npm run dev`
- Check `API_BASE` environment variable

### Rate limit errors (should not occur)
- Tests automatically disable rate limiting via `DISABLE_RATE_LIMIT=true`
- If using server without `npm run dev:test`, start with: `DISABLE_RATE_LIMIT=true npm run dev`
- Or verify the server was started with rate limiting disabled

### Database connection errors
- Verify database is running
- Check `DATABASE_URL` in `.env`
- Ensure schema is up to date

### Authentication tests fail
- Some tests require actual authentication setup
- Session-based tests should work without auth
- Check passport configuration

## Test Data

Tests create real data in the database:
- Posts expire automatically (7-30 days)
- No sensitive data is used in tests
- Test emails use `test-*.example.com` pattern
- UUIDs prevent collisions

## Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Authentication | 12 | Auth flows, access control, session management |
| Post Creation | 18 | Validation, creation, sanitization |
| Post Browsing | 12 | Listing, filtering, search, pagination |
| Conversations | 16 | Replies, validation, authorization |
| Inbox | 14 | Notifications, read state, message management |
| UI/Validation | 20+ | Error handling, edge cases, boundaries |
| **Total** | **90+** | Comprehensive coverage of core features |

## Future Enhancements

Potential additions:
- E2E tests with Playwright/Puppeteer for full UI flows
- Performance tests for load handling
- Database integration tests with test containers
- Authenticated user flow tests (requires OAuth mocking)
- WebSocket tests for real-time features (if added)

## Contributing

When adding new features:
1. Write tests first (TDD) or alongside implementation
2. Ensure tests are isolated and repeatable
3. Add test commands to package.json if needed
4. Update this README with coverage info
5. Follow existing naming and structure patterns

## License

Same as Crabiner project.
