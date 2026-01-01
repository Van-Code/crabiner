# Token-Based Authentication Guide

Crabiner now uses a uniform, token-based authentication system that supports both web and mobile clients.

## Architecture Overview

The authentication system uses:
- **JWT Access Tokens**: Short-lived (15 minutes), signed with `JWT_SECRET`
- **Refresh Tokens**: Long-lived (30 days), cryptographically random, stored hashed in database
- **Stateless Authentication**: No server-side sessions, Passport used only for OAuth redirect flow

## Environment Variables

Add the following to your `.env` file:

```bash
# Required for authentication
JWT_SECRET=your-secret-key-at-least-32-characters-long
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

## Database Schema

The system uses two tables:

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID,
  user_agent TEXT,
  ip TEXT
);
```

## Migration

Run the migration to drop old session tables and create new token tables:

```bash
psql $DATABASE_URL -f db/migrations/002_token_auth_system.sql
```

**⚠️ Warning**: This migration drops the `session` table and recreates the `users` table. All existing sessions and user data will be lost.

## Authentication Flows

### 1. Web Authentication (Google OAuth Redirect)

**Initiate Login:**
```
GET /auth/google?returnTo=/browse
```

**Callback (handled automatically):**
```
GET /auth/google/callback
```
- Creates or updates user in database
- Issues access token and refresh token
- Sets refresh token as httpOnly cookie
- Redirects to `returnTo` with access token in URL fragment: `/#auth=success&token={accessToken}`

**Client-Side Token Handling:**
```javascript
// On page load, check for token in URL fragment
const hash = window.location.hash;
if (hash.includes('token=')) {
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('token');

  // Store access token in memory or sessionStorage
  sessionStorage.setItem('accessToken', accessToken);

  // Clean up URL
  window.history.replaceState(null, '', window.location.pathname);
}

// Use token for API requests
fetch('/api/user', {
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
  }
});
```

### 2. Mobile Authentication (Google ID Token Exchange)

**Exchange Google ID Token:**
```
POST /auth/google/mobile
Content-Type: application/json

{
  "idToken": "google-id-token-from-native-sdk"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://..."
  }
}
```

**Mobile Client Storage:**
```javascript
// Store tokens securely
await SecureStore.setItemAsync('accessToken', data.accessToken);
await SecureStore.setItemAsync('refreshToken', data.refreshToken);

// Use for API requests
const accessToken = await SecureStore.getItemAsync('accessToken');
fetch('/api/user', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 3. Token Refresh

**Refresh Access Token:**

**Web (uses cookie automatically):**
```
POST /auth/refresh
```

**Mobile (send refresh token in body):**
```
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "stored-refresh-token"
}
```

**Response (Web):**
```json
{
  "accessToken": "new-access-token"
}
```

**Response (Mobile):**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

**Automatic Refresh Logic:**
```javascript
// Decode JWT to check expiration
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 < Date.now();
}

// Refresh before making request
async function fetchWithAuth(url, options = {}) {
  let accessToken = sessionStorage.getItem('accessToken');

  if (!accessToken || isTokenExpired(accessToken)) {
    const response = await fetch('/auth/refresh', { method: 'POST' });
    const data = await response.json();
    accessToken = data.accessToken;
    sessionStorage.setItem('accessToken', accessToken);
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
}
```

### 4. Logout

**Web (uses cookie automatically):**
```
POST /auth/logout
```

**Mobile (send refresh token in body):**
```
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "stored-refresh-token"
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Client Cleanup:**
```javascript
// Clear stored tokens
sessionStorage.removeItem('accessToken');
// On mobile: await SecureStore.deleteItemAsync('accessToken');
// On mobile: await SecureStore.deleteItemAsync('refreshToken');
```

## Protected API Routes

All protected routes require the `Authorization: Bearer <token>` header.

**Example:**
```javascript
fetch('/api/posts/my-posts', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**Protected Endpoints:**
- `GET /api/user` - Get current user info
- `GET /api/posts/my-posts` - Get user's posts
- `POST /api/replies/:postId` - Send reply (requires auth)
- `GET /api/inbox` - Get authenticated user's inbox
- `POST /api/posts/:postId/save` - Save post
- `DELETE /api/posts/:postId/save` - Unsave post
- `GET /api/posts/saved` - Get saved posts
- `DELETE /api/posts/:postId` - Delete user's post

## Error Handling

### Authentication Errors

**401 Unauthorized - Missing Token:**
```json
{
  "error": "Authentication required",
  "message": "Missing or invalid Authorization header"
}
```

**401 Unauthorized - Expired Token:**
```json
{
  "error": "Token expired",
  "message": "Access token has expired. Please refresh your token."
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "error": "Invalid token",
  "message": "Access token is invalid or malformed"
}
```

**Client Handling:**
```javascript
const response = await fetch('/api/user', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.status === 401) {
  const error = await response.json();

  if (error.error === 'Token expired') {
    // Refresh token and retry
    await refreshAccessToken();
    return fetchWithAuth('/api/user');
  } else {
    // Invalid token, redirect to login
    window.location.href = '/auth/google';
  }
}
```

## Security Features

1. **JWT Signing**: Access tokens signed with HS256 algorithm
2. **Refresh Token Hashing**: Refresh tokens stored as SHA-256 hashes
3. **Token Rotation**: Refresh tokens rotated on each use
4. **Token Revocation**: Tokens can be revoked on logout
5. **httpOnly Cookies**: Web refresh tokens in httpOnly cookies (XSS protection)
6. **Secure Cookies**: Cookies use Secure flag in production (HTTPS only)
7. **SameSite**: Cookies use SameSite=Lax (CSRF protection)
8. **Short TTL**: Access tokens expire after 15 minutes
9. **User Agent & IP Tracking**: Refresh tokens track device info for audit

## Testing

Run token authentication tests:

```bash
npm run test:token-auth
```

The test suite covers:
- Access token generation and verification
- Refresh token storage and rotation
- Token revocation
- Protected route access control
- Token refresh flow
- Logout flow

**Mock Google OAuth for Testing:**

Tests mock Google ID token verification to avoid network calls:

```javascript
// Mock Google client
mock.method(googleClient, 'verifyIdToken', () => ({
  getPayload: () => ({
    sub: 'test-google-sub',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg'
  })
}));
```

## Comparison: Web vs Mobile

| Feature | Web | Mobile |
|---------|-----|--------|
| **Initial Auth** | Google OAuth redirect | Google ID token exchange |
| **Refresh Token Storage** | httpOnly cookie | Secure device storage |
| **Access Token Storage** | sessionStorage / memory | Secure device storage |
| **Refresh Endpoint** | POST /auth/refresh (cookie) | POST /auth/refresh (body) |
| **Logout** | POST /auth/logout (cookie) | POST /auth/logout (body) |

## Troubleshooting

### "JWT_SECRET not set" Error

Add `JWT_SECRET` to your `.env` file with at least 32 characters.

### Refresh Token Not Working

Check that:
1. Cookie is being sent (web) or token in body (mobile)
2. Token hasn't expired (30 days)
3. Token hasn't been revoked
4. Database connection is working

### Access Token Expired Immediately

Check that:
1. Server and client clocks are synchronized
2. JWT_SECRET is consistent across restarts
3. Token TTL is configured correctly (15 minutes default)

### CORS Issues with Authorization Header

Ensure `Authorization` is in allowed headers:

```javascript
cors({
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

## Migration from Sessions

### Old (Session-Based):
```javascript
// Login created session cookie automatically
fetch('/api/user'); // Session cookie sent automatically
```

### New (Token-Based):
```javascript
// Login returns token
const token = getTokenFromFragment();
sessionStorage.setItem('accessToken', token);

// Must send token explicitly
fetch('/api/user', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Cleanup

Expired and revoked tokens are automatically cleaned up by the cleanup service:
- Tokens expired > 7 days ago are deleted
- Revoked tokens > 30 days old are deleted

Manual cleanup:
```bash
npm run cleanup
```
