# Quick Start - Crabiner Tests

## Run All Tests (2 commands)

```bash
# 1. Start the server with rate limiting disabled (recommended for testing)
npm run dev:test

# 2. In a new terminal, run all tests
npm test

# Or run individual test suites:
npm run test:auth          # Authentication & access control
npm run test:posts         # Post creation & browsing
npm run test:conversations # Messaging & conversations
npm run test:inbox         # Inbox & notifications
npm run test:ui            # Validation & error handling
```

## What Gets Tested

✅ **Authentication (12 tests)**
- Unauthenticated browsing allowed
- Protected actions return 401
- Session management works

✅ **Post Creation (18 tests)**
- All validation rules enforced
- Required fields checked
- Length limits work correctly

✅ **Post Browsing (12 tests)**
- Pagination works
- Filtering by city works
- Sorting by date (newest first)
- Expired/deleted posts excluded

✅ **Conversations (16 tests)**
- Replies require authentication
- Message validation enforced
- Session token access works
- No null/missing data

✅ **Inbox (14 tests)**
- Unread/read tracking
- Message operations authorized
- Complete data structure always

✅ **UI Validation (20+ tests)**
- Error responses consistent
- Edge cases handled gracefully
- No crashes on invalid input

**Total: 90+ tests** covering all core functionality

## Requirements

- Node.js (built-in test runner, no external deps needed)
- Running server (localhost:3000 by default)
- Database connection

**Important**: Use `npm run dev:test` to start the server with rate limiting disabled for testing.

## Custom API URL

```bash
API_BASE=http://localhost:8080 npm test
```

## Rate Limiting

Tests automatically disable rate limiting by setting `DISABLE_RATE_LIMIT=true`. No configuration needed - just run `npm test`!

## Expected Output

```
✓ Auth and access control tests completed
✓ Post lifecycle tests completed
✓ Conversations and messaging tests completed
✓ Inbox and notifications tests completed
✓ UI validation and error handling tests completed

All tests passed (90 tests)
```

## Common Issues

**"Connection refused"** → Start the server first: `npm run dev:test`

**Rate limit errors** → Should not occur (tests disable rate limiting automatically)

**Some tests skip** → Usually marked with "⊘ Skipping" (e.g., when test post not available)

## Files Created

```
tests/
├── README.md                      # Full documentation
├── QUICK_START.md                # This file
├── helpers/
│   └── test-utils.js             # Shared utilities
├── auth-flow.test.js             # Authentication tests
├── post-lifecycle.test.js        # Post creation/browsing tests
├── conversations.test.js         # Messaging tests
├── inbox-notifications.test.js   # Inbox tests
└── ui-validation.test.js         # Validation tests
```

## Next Steps

1. Run tests to verify everything works
2. Check `tests/README.md` for detailed coverage
3. Add tests when adding new features
4. Integrate into CI/CD pipeline

---

**Happy Testing! 🦀**
