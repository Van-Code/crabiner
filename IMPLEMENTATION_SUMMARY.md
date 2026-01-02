# Crabiner Backend Cleanup - Implementation Summary

## Overview

Complete backend refactor with clean database schema, unified auth system, and notification infrastructure.

## Files Changed

### Database Schema and Seeding

#### `db/schema.sql` (REPLACED)
- **Purpose**: Clean, consolidated database schema
- **Tables Created**:
  - `users` - User accounts (id, google_sub, email, email_verified, name, avatar_url, created_at, last_login)
  - `posts` - User posts (id, user_id, title, body, created_at, expires_at, status)
  - `replies` - Post replies (id, post_id, from_user_id, to_user_id, body, created_at, read_at, deleted_at)
  - `refresh_tokens` - JWT refresh tokens (id, user_id, token_hash, created_at, expires_at, revoked_at, replaced_by_token_id, user_agent, ip)
  - `user_push_tokens` - Push notification tokens (id, user_id, token, platform, created_at, last_seen_at, revoked_at)
  - `notifications` - In-app notifications (id, user_id, type, entity_id, title, body, created_at, read_at)
- **Removed**: All legacy session tables, session columns, and management token columns

#### `db/seed.js` (NEW)
- **Purpose**: Comprehensive test data generator
- **Creates**:
  - 5 test users with Google OAuth profiles
  - 15 posts (3 expired, 12 active)
  - Multiple replies with varying read/unread states
  - Notifications for each reply
  - Proper inbox unread counts

### Notification System

#### `src/services/notificationService.js` (NEW)
- **Exports**:
  - `setPushSender(sender)` - Dependency injection for push service
  - `sendPushNotification(userId, payload)` - Send push to all user devices
  - `notifyNewReply(replyId, toUserId, fromUserId)` - Create notification and send push
  - `markNotificationRead(notificationId, userId)` - Mark notification as read
  - `getUserNotifications(userId, options)` - Get user notifications
  - `getUnreadCount(userId)` - Get unread notification count
- **Features**:
  - Mock push sender by default (logs only)
  - Testable via dependency injection
  - Sends to all active push tokens
  - Automatic notification creation on reply

#### `src/routes/notifications.js` (NEW)
- **Endpoints**:
  - `GET /api/notifications` - List user notifications (with pagination)
  - `POST /api/notifications/:id/read` - Mark notification as read
  - `GET /api/notifications/unread/count` - Get unread count
- **Auth**: All routes require JWT authentication

#### `src/routes/push.js` (NEW)
- **Endpoints**:
  - `POST /api/push/register` - Register push token (body: {token, platform})
  - `POST /api/push/unregister` - Revoke push token (body: {token})
  - `GET /api/push/tokens` - List user's active push tokens
- **Auth**: All routes require JWT authentication
- **Platforms**: ios, android, web
- **Features**: Automatic re-activation of revoked tokens

### Reply System Updates

#### `src/services/replyService.js` (REPLACED)
- **Updated for new schema**: Removed all legacy columns
- **Exports**:
  - `sendReply(postId, body, fromUserId)` - Create reply and trigger notification
  - `getUserReplies(userId, options)` - Get inbox replies
  - `getUnreadReplyCount(userId)` - Get unread count
  - `markReplyAsRead(replyId, userId)` - Mark reply as read
  - `deleteReply(replyId, userId)` - Soft delete reply
  - `getReplyById(replyId, userId)` - Get single reply with permissions
- **Features**:
  - Prevents self-replies
  - Calls notification service automatically
  - Full JOIN queries with user data

#### `src/routes/replies.js` (UPDATED)
- **Updated endpoints**:
  - `POST /api/replies/:postId` - Send reply (body changed from {message, contactEmail} to {body})
  - `GET /api/replies` - Get user inbox
  - `POST /api/replies/:id/read` - Mark reply as read
  - `DELETE /api/replies/:id` - Delete reply
- **Auth**: All routes require JWT authentication

### Server Configuration

#### `src/server.js` (UPDATED)
- **Added route imports**: notificationsRouter, pushRouter
- **Registered routes**:
  - `app.use("/api/notifications", notificationsRouter)`
  - `app.use("/api/push", pushRouter)`
- **No other changes**: CORS and auth middleware already correct

### Tests

#### `tests/notifications.test.js` (NEW)
- **Test Coverage**:
  - ✅ Creating a reply creates a notification
  - ✅ Push sender is called with correct data
  - ✅ GET /api/notifications returns user notifications
  - ✅ POST /api/notifications/:id/read marks as read
  - ✅ POST /api/push/register registers token
  - ✅ POST /api/push/unregister revokes token
  - ✅ Inbox unread counts reflect read status
  - ✅ Cannot reply to own post
  - ✅ Unauthenticated requests return 401
- **Mocking**: Uses mock push sender for testing
- **Cleanup**: Automatic test data cleanup

### Configuration

#### `.env.example` (UPDATED)
- **Added variables**:
  ```bash
  JWT_SECRET=generate_a_secure_random_jwt_secret_here
  REFRESH_COOKIE_NAME=refreshToken
  APP_BASE_URL=http://localhost:3000
  PUSH_SERVICE_KEY=your_firebase_or_apns_key_here  # Future use
  PUSH_SERVICE_URL=https://fcm.googleapis.com/...   # Future use
  DISABLE_RATE_LIMIT=true                           # For testing
  ```
- **Updated**: Google OAuth credentials removed from template

#### `package.json` (UPDATED)
- **Added scripts**:
  ```json
  "db:reset": "psql -U postgres -c 'DROP DATABASE IF EXISTS crabiner;' && psql -U postgres -c 'CREATE DATABASE crabiner;'",
  "db:schema": "psql $DATABASE_URL < db/schema.sql",
  "db:seed": "node db/seed.js",
  "db:setup": "npm run db:reset && npm run db:schema && npm run db:seed",
  "test:notifications": "DISABLE_RATE_LIMIT=true node --test tests/notifications.test.js"
  ```
- **Removed**: Legacy test scripts

### Documentation

#### `DATABASE_SETUP.md` (NEW)
- Complete guide for database operations
- Exact commands for reset, schema, seed, test, and start
- Troubleshooting section
- Environment variable reference

## Exact Commands

### Database Reset, Schema, Seed

```bash
# Complete database setup (destroys all data!)
npm run db:setup

# Or step by step:
npm run db:reset   # Drop and recreate database
npm run db:schema  # Apply schema
npm run db:seed    # Seed test data
```

### Run Tests

```bash
# All tests
npm test

# Notification tests only
npm run test:notifications

# Auth tests
npm run test:auth
```

### Start API

```bash
# Development (with .env.local)
npm run dev

# Development with rate limiting disabled
npm run dev:test

# Production
npm start
```

## API Endpoints Summary

### Authentication
- `GET /auth/google` - Initiate OAuth login
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/google/mobile` - Mobile token exchange
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke token
- `GET /auth/status` - Check auth status
- `GET /api/user` - Get current user info (requires auth)

### Replies
- `POST /api/replies/:postId` - Send reply (requires auth)
- `GET /api/replies` - Get inbox (requires auth)
- `POST /api/replies/:id/read` - Mark reply as read (requires auth)
- `DELETE /api/replies/:id` - Delete reply (requires auth)

### Notifications
- `GET /api/notifications` - List notifications (requires auth)
- `POST /api/notifications/:id/read` - Mark notification as read (requires auth)
- `GET /api/notifications/unread/count` - Get unread count (requires auth)

### Push Tokens
- `POST /api/push/register` - Register push token (requires auth)
- `POST /api/push/unregister` - Revoke push token (requires auth)
- `GET /api/push/tokens` - List active tokens (requires auth)

## Auth Flow

### Web Client
1. User clicks "Sign in with Google"
2. Redirects to `/auth/google`
3. Google OAuth flow
4. Callback to `/auth/google/callback`
5. Server sets refresh token in httpOnly cookie
6. Redirects to `/#auth=success&token={accessToken}`
7. Client picks up token from URL fragment
8. Client stores access token in memory only (NOT localStorage)
9. Client calls `/auth/refresh` on load to get fresh access token
10. All API calls include `Authorization: Bearer {accessToken}`
11. On 401, client automatically calls `/auth/refresh` and retries once

### Mobile Client
1. User signs in with Google SDK
2. App gets Google ID token
3. POST `/auth/google/mobile` with {idToken}
4. Server returns {accessToken, refreshToken, user}
5. App stores refresh token securely
6. All API calls include `Authorization: Bearer {accessToken}`
7. On 401, app calls `/auth/refresh` with refresh token in body

## Security Features

✅ No access tokens in localStorage/sessionStorage
✅ Refresh tokens in httpOnly cookies (web)
✅ JWT access tokens expire in 15 minutes
✅ Refresh tokens expire in 30 days
✅ Refresh token rotation on refresh
✅ CORS configured for credentials and Authorization header
✅ Rate limiting (can be disabled with DISABLE_RATE_LIMIT=true)
✅ Input validation on all endpoints
✅ SQL injection protection via parameterized queries
✅ No raw tokens logged

## Testing Features

✅ Mock push notification sender
✅ Dependency injection for testability
✅ Automatic test data cleanup
✅ Rate limiting disabled in test mode
✅ Comprehensive test coverage

## Migration Notes

### Breaking Changes
- Old schema is completely replaced
- All data will be lost on reset
- Reply endpoint changed from POST with {message, contactEmail} to POST with {body}
- Removed session-based authentication (JWT only)

### No Breaking Changes
- CORS configuration unchanged
- Auth middleware unchanged
- Client-side auth code unchanged (already correct)

## Next Steps

1. ✅ Apply schema: `npm run db:schema`
2. ✅ Seed data: `npm run db:seed`
3. ✅ Run tests: `npm test`
4. ✅ Start server: `npm start`
5. 🔄 Implement actual push notification service (FCM/APNs)
6. 🔄 Add post creation endpoints (if needed)
7. 🔄 Update client UI to use new notification endpoints
