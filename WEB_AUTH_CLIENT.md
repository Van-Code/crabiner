# Web Authentication Client Implementation

## Overview

Implemented a complete in-memory JWT authentication client for the web frontend. The system uses:
- **Access tokens** stored in memory only (cleared on page refresh)
- **Refresh tokens** stored in httpOnly cookies (managed by backend)
- **Automatic token refresh** on 401 responses with single retry
- **Centralized API client** that handles all authentication headers

## Files Changed

### New Files

#### `public/scripts/authState.js`
In-memory authentication state module. **Never uses localStorage or sessionStorage**.

```javascript
// Exports:
- getAccessToken()     // Get current JWT access token
- setAccessToken(token) // Set access token
- getUser()            // Get current user object
- setUser(user)        // Set user object
- isAuthenticated()    // Check if user has valid token
- clearAuth()          // Clear all auth state (logout)
- setAuth(token, user) // Set both token and user
```

#### `public/scripts/apiClient.js`
Centralized API client with automatic authorization and retry logic.

```javascript
// Exports:
- apiFetch(url, options)    // Enhanced fetch with auth headers
- apiJson(url, options)     // Convenience method for JSON APIs
- logout()                  // Logout and clear state
- bootstrapAuth()           // Initialize auth on app load
```

**Key Features:**
- Automatically adds `Authorization: Bearer ${token}` header when token exists
- Always sends `credentials: "include"` for refresh token cookie
- On 401 response:
  1. Calls POST /auth/refresh once to get new token
  2. Retries original request once with new token
  3. Uses `_isRetry` flag to prevent infinite loops
- Concurrent refresh protection (single refresh promise)

### Modified Files

#### `src/routes/auth.js`
Updated POST /auth/refresh endpoint to return user object:

```javascript
// Before:
res.json({ accessToken })

// After:
res.json({
  accessToken,
  user: {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    avatarUrl: result.user.avatarUrl,
  }
})
```

#### `public/scripts/auth.js`
Complete rewrite to use in-memory auth state:

- Removed fetch to /auth/status
- Now calls `bootstrapAuth()` on page load
- Uses `getUser()` and `isAuthenticated()` to check auth state
- Logout button calls `logout()` from apiClient.js

#### `public/scripts/my-posts.js`
Updated to use API client:

```javascript
// Before:
const response = await fetch("/api/posts/my-posts", {
  credentials: "include"
});

// After:
const data = await apiJson("/api/posts/my-posts");
```

#### `public/scripts/inbox.js`
Updated authenticated inbox to use API client:

```javascript
// Before:
const authResponse = await fetch("/auth/status", { credentials: "include" });
const response = await fetch("/api/inbox", { credentials: "include" });

// After:
if (!isAuthenticated()) { showAuthRequired(); return; }
const data = await apiJson("/api/inbox");
```

Note: Session-based inbox (for anonymous posters) still uses regular fetch.

#### `public/scripts/saved.js`
Updated to use API client:

```javascript
// Before:
const response = await fetch("/api/posts/saved", { credentials: "include" });

// After:
const data = await apiJson("/api/posts/saved");
```

#### `public/scripts/view.js`
Updated reply submission to use API client:

```javascript
// Before:
const response = await fetch(`/api/replies/${postId}`, {
  method: "POST",
  credentials: "include",
  ...
});

// After:
const response = await apiFetch(`/api/replies/${postId}`, {
  method: "POST",
  ...
});
```

## Authentication Flow

### 1. App Bootstrap (Page Load)

```
User opens page
  ↓
auth.js loads → calls bootstrapAuth()
  ↓
bootstrapAuth() → POST /auth/refresh (with credentials)
  ↓
Success? → Store accessToken and user in memory
  ↓
auth.js → updateAuthUI() shows user menu
```

### 2. API Request Flow

```
User action triggers API call
  ↓
apiFetch(url, options)
  ↓
Add Authorization: Bearer ${token} header
  ↓
fetch(url, { ...options, credentials: "include" })
  ↓
200 OK? → Return response
  ↓
401 Unauthorized?
  ↓
Call refreshAccessToken()
  ↓
POST /auth/refresh (with credentials)
  ↓
Success? → Store new token, retry original request
  ↓
Failure? → clearAuth(), return 401
```

### 3. Logout Flow

```
User clicks "Sign out"
  ↓
logout() function called
  ↓
POST /auth/logout (with credentials) → Revokes refresh token on server
  ↓
clearAuth() → Clears memory (token + user)
  ↓
Redirect to "/"
```

## Security Features

### ✅ Implemented

1. **No localStorage/sessionStorage**: Access tokens only in memory
   - Cleared on page refresh
   - Not accessible to XSS attacks via storage APIs

2. **httpOnly Cookies**: Refresh tokens in httpOnly cookies
   - Cannot be accessed by JavaScript
   - Prevents XSS token theft

3. **Automatic CSRF Protection**: SameSite=Lax cookies
   - Refresh tokens only sent to same site
   - Prevents CSRF attacks

4. **Single Retry**: Prevents infinite loops
   - Max 1 refresh attempt per request
   - Uses `_isRetry` flag

5. **Concurrent Refresh Protection**: Single refresh promise
   - Multiple concurrent 401s share same refresh
   - Prevents refresh token race conditions

## Testing

### Manual Testing Commands

```bash
# Start dev server
npm run dev

# Test auth flow:
1. Open browser to http://localhost:3000
2. Click "Sign in with Google"
3. Complete OAuth
4. Verify user menu appears
5. Navigate to /my-posts.html
6. Verify posts load with Authorization header
```

### Test Cases to Verify

1. **Initial Load**
   - [ ] Page loads and calls POST /auth/refresh
   - [ ] If refresh token valid, user menu appears
   - [ ] If no refresh token, shows "Sign in with Google"

2. **Protected Routes**
   - [ ] /my-posts.html requires auth
   - [ ] /inbox.html requires auth
   - [ ] /saved.html requires auth
   - [ ] All send Authorization header

3. **Token Refresh**
   - [ ] Access token expires after 15 min
   - [ ] Next API call gets 401
   - [ ] Auto-refreshes and retries
   - [ ] User doesn't notice

4. **Logout**
   - [ ] Clicking "Sign out" calls POST /auth/logout
   - [ ] Refresh token revoked on server
   - [ ] User redirected to home
   - [ ] Protected routes show "Sign in required"

5. **Security**
   - [ ] Access token NOT in localStorage
   - [ ] Access token NOT in sessionStorage
   - [ ] Refresh token in httpOnly cookie
   - [ ] Authorization header sent on API calls

## Debugging

### Check Auth State

```javascript
// In browser console:
import { getAccessToken, getUser } from './scripts/authState.js';

// Check if authenticated
console.log('Token:', getAccessToken());
console.log('User:', getUser());
```

### Watch Network Requests

1. Open DevTools → Network tab
2. Filter: `fetch/xhr`
3. Look for:
   - POST /auth/refresh on page load
   - Authorization: Bearer header on API calls
   - 401 → POST /auth/refresh → retry sequence

### Common Issues

**Issue: "Access token NOT in localStorage" test fails**
- Check: Access tokens should ONLY be in memory
- Fix: Remove any `localStorage.setItem('accessToken', ...)` calls

**Issue: Protected routes don't require auth**
- Check: Route uses `apiFetch()` or `apiJson()`
- Check: Backend requires auth for that endpoint
- Fix: Replace `fetch()` with `apiFetch()`

**Issue: Infinite retry loop**
- Check: `_isRetry` flag is set on retry
- Check: Only one refresh attempt per request
- Fix: Ensure `options._isRetry` is checked in apiFetch

**Issue: Refresh token not sent**
- Check: `credentials: "include"` in fetch options
- Check: Cookie exists (DevTools → Application → Cookies)
- Fix: Ensure CORS allows credentials

## Migration Notes

### Old Code (Session-Based)

```javascript
// Check auth
const response = await fetch("/auth/status", {
  credentials: "include"
});
const data = await response.json();
if (!data.authenticated) { /* not logged in */ }

// API call
const response = await fetch("/api/posts/my-posts", {
  credentials: "include"
});
```

### New Code (Token-Based)

```javascript
import { isAuthenticated } from "./authState.js";
import { apiJson } from "./apiClient.js";

// Check auth
if (!isAuthenticated()) { /* not logged in */ }

// API call
const data = await apiJson("/api/posts/my-posts");
```

## Performance Impact

### Before (Session-Based)
- Every protected page: 1 fetch to /auth/status
- Every API call: Cookie sent automatically
- Total: N+1 requests

### After (Token-Based)
- Page load: 1 POST /auth/refresh (gets token + user)
- Every API call: Authorization header added
- Token refresh: Only on 401 (every 15 min)
- Total: N requests (same or better)

### Benefits
- Fewer requests (no separate /auth/status check)
- Faster auth checks (in-memory, no network)
- More explicit auth (Authorization header vs implicit cookie)
- Better mobile support (refresh token in body for native apps)

## Next Steps

1. **Add Tests**
   - Unit tests for authState.js
   - Unit tests for apiClient.js
   - Integration tests for auth flow

2. **Error Handling**
   - Better error messages for network failures
   - Retry logic for network errors (not just 401)
   - Toast notifications for auth errors

3. **Monitoring**
   - Log refresh attempts
   - Track 401 error rates
   - Monitor token expiration patterns

4. **Optimization**
   - Proactive token refresh (before expiration)
   - Token refresh on tab focus
   - Shared worker for cross-tab auth state
