# Crabiner Mobile App - Complete Implementation Guide

This document provides a complete overview of the Crabiner mobile app implementation, including all commands needed to run and test the application.

## Architecture Overview

The Crabiner mobile app is built with:
- **Expo** (SDK 51): Cross-platform React Native framework
- **TypeScript**: Type-safe development
- **React Navigation**: Native navigation
- **Expo Notifications**: Push notifications
- **Expo SecureStore**: Secure token storage
- **expo-auth-session**: Google OAuth integration

## Security Architecture

### Token Management

#### Access Token (In-Memory Only)
- **Storage**: JavaScript variable in memory
- **Never persisted**: Not in AsyncStorage, SecureStore, or localStorage
- **Lifetime**: Lost on app restart
- **Location**: `src/auth/authState.ts`

#### Refresh Token (Secure Storage)
- **Storage**: Expo SecureStore (encrypted)
- **Persistent**: Survives app restarts
- **Lifetime**: 30 days (configurable on backend)
- **Location**: Expo SecureStore with key "refreshToken"

### Auto-Refresh Flow

```
1. API call with access token
   ↓
2. Receives 401 Unauthorized
   ↓
3. Call POST /auth/refresh with refresh token
   ↓
4. Receive new access token (and rotated refresh token)
   ↓
5. Update in-memory access token
   ↓
6. Retry original API call once
```

## Complete File Structure

```
apps/mobile/
├── App.tsx                          # Root component with push notification setup
├── app.json                         # Expo configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── babel.config.js                  # Babel configuration
├── jest.config.js                   # Jest test configuration
├── jest.setup.js                    # Jest setup and mocks
├── .env.example                     # Environment variables template
│
├── src/
│   ├── api/
│   │   └── client.ts                # API client with auto-refresh
│   │
│   ├── auth/
│   │   ├── authState.ts             # Auth state management (in-memory)
│   │   └── googleAuth.ts            # Google OAuth integration
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Navigation configuration
│   │
│   ├── screens/
│   │   ├── AuthScreen.tsx           # Google Sign-In screen
│   │   ├── BrowseScreen.tsx         # Browse posts with search
│   │   ├── PostDetailScreen.tsx     # Post details with replies
│   │   ├── CreatePostScreen.tsx     # Create new post form
│   │   ├── InboxScreen.tsx          # Posts with replies and unread counts
│   │   ├── MyPostsScreen.tsx        # Manage user's posts
│   │   ├── NotificationsScreen.tsx  # Notification center
│   │   └── SettingsScreen.tsx       # Settings and logout
│   │
│   └── utils/
│       └── notifications.ts         # Push notification utilities
│
└── __tests__/
    ├── authState.test.ts            # Auth state tests
    └── apiClient.test.ts            # API client tests
```

## Installation Commands

### 1. Backend Setup (if not already running)

```bash
# From repository root
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and Google OAuth credentials

# Run database migrations
npm run db:migrate  # If you have this script

# Start backend
npm run dev
```

### 2. Mobile App Setup

```bash
# Navigate to mobile app directory
cd apps/mobile

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your configuration:
# - API_BASE_URL (e.g., http://localhost:3000)
# - GOOGLE_WEB_CLIENT_ID
# - GOOGLE_IOS_CLIENT_ID
# - GOOGLE_ANDROID_CLIENT_ID
```

### 3. Google OAuth Configuration

1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Web Client ID**: For general auth
   - **iOS Client ID**: Bundle ID `com.crabiner.app`
   - **Android Client ID**: Package `com.crabiner.app`
5. Add credentials to `.env` file

## Running the App

### Development Mode

```bash
# Start Expo development server
npm start

# Or start with specific platform
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web browser
```

### Development Tips

**Using Physical Device:**
1. Install Expo Go app from App Store/Play Store
2. Run `npm start`
3. Scan QR code with camera (iOS) or Expo Go (Android)

**Using Emulator/Simulator:**
- **iOS**: Xcode must be installed, press `i` in terminal
- **Android**: Android Studio must be installed, press `a` in terminal

## Testing

### Run All Tests

```bash
cd apps/mobile
npm test
```

### Run Specific Test File

```bash
npm test -- authState.test.ts
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Watch Mode

```bash
npm test -- --watch
```

### Expected Test Output

```
PASS  __tests__/authState.test.ts
  Auth State Module
    Access Token (In-Memory)
      ✓ should store access token in memory only
      ✓ should clear access token from memory
      ✓ should NOT persist access token to AsyncStorage or SecureStore
    ...

PASS  __tests__/apiClient.test.ts
  API Client
    Authorization Header Injection
      ✓ should add Authorization header when token exists
      ✓ should not add Authorization header when no token
    401 Auto-Retry
      ✓ should retry once on 401 after refreshing token
      ✓ should not retry more than once to prevent infinite loops
      ✓ should clear auth if refresh fails
    ...

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
```

## Manual Verification Checklist

### Authentication
- [ ] App shows Google Sign-In button when not authenticated
- [ ] Tapping Sign-In opens Google OAuth flow
- [ ] After successful auth, user is redirected to main app
- [ ] User info (name, email) displays in Settings screen
- [ ] Access token is NOT in AsyncStorage (check with React Native Debugger)
- [ ] Refresh token IS in SecureStore (verified by successful app restart auth)

### Browse Posts
- [ ] Posts load and display correctly
- [ ] Search functionality works
- [ ] Create Post button navigates to create screen
- [ ] Tapping a post navigates to detail screen
- [ ] Pull-to-refresh works

### Post Detail
- [ ] Post content displays correctly
- [ ] Replies load and display
- [ ] Reply composer allows posting replies
- [ ] Reply submission shows success message
- [ ] New reply appears in list immediately

### Create Post
- [ ] All fields (title, description, location, when) are editable
- [ ] Form validation works (required fields)
- [ ] Submission creates post successfully
- [ ] After success, redirects back to browse

### Inbox
- [ ] Shows posts with replies
- [ ] Unread counts display correctly
- [ ] Tapping item navigates to post detail
- [ ] Pulls to refresh works

### My Posts
- [ ] Shows user's posts only
- [ ] Delete button prompts confirmation
- [ ] Delete removes post from list
- [ ] Empty state shows helpful message

### Notifications
- [ ] Notifications list loads
- [ ] Unread notifications have visual indicator
- [ ] Tapping notification marks as read and navigates
- [ ] "Mark All as Read" button works
- [ ] Pull to refresh works

### Settings
- [ ] User profile info displays
- [ ] Notification toggles work and persist
- [ ] Logout button prompts confirmation
- [ ] Logout clears auth and returns to login screen

### Push Notifications
- [ ] Permission request appears on first app launch
- [ ] Push token registers with backend
- [ ] Foreground notifications show banner
- [ ] Tapping notification navigates to relevant screen
- [ ] Badge count updates correctly

### Token Refresh
- [ ] After access token expires (15 min), API calls trigger refresh
- [ ] Refresh happens automatically on 401
- [ ] App continues to work after refresh
- [ ] On refresh failure, user is logged out

## API Endpoints Used

```
POST   /auth/google/mobile       # Exchange Google ID token
POST   /auth/refresh              # Refresh access token
POST   /auth/logout               # Logout and revoke refresh token

GET    /api/posts                 # Browse posts
POST   /api/posts                 # Create post
GET    /api/posts/:id             # Get post detail
GET    /api/posts/:id/replies     # Get replies
POST   /api/posts/:id/replies     # Create reply

GET    /api/inbox                 # Get inbox items

GET    /api/manage/posts          # Get user's posts
DELETE /api/manage/posts/:id      # Delete post

GET    /api/notifications         # Get notifications
POST   /api/notifications/read    # Mark as read
GET    /api/notifications/preferences
PATCH  /api/notifications/preferences

POST   /api/push/register         # Register push token
DELETE /api/push/unregister       # Unregister push token
```

## Web Client Commands

The web client is already integrated in the backend:

```bash
# From repository root
npm run dev

# Access web client at:
# http://localhost:3000/
```

The web client uses the same auth pattern:
- Access token in memory only (see `public/scripts/authState.js`)
- Refresh token in httpOnly cookie
- API client wrapper with auto-refresh (see `public/scripts/apiClient.js`)

## Build for Production

### Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for development
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Build

```bash
# Build for production
eas build --profile production --platform ios
eas build --profile production --platform android
```

### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## Troubleshooting

### Common Issues

**"Cannot connect to backend"**
- Ensure backend is running on correct port
- Check API_BASE_URL in .env
- For physical device, use your computer's IP instead of localhost

**"Google Sign-In fails"**
- Verify OAuth client IDs in .env
- Check that credentials match platform (iOS/Android/Web)
- Ensure Google+ API is enabled in Cloud Console

**"Push notifications not working"**
- Must use physical device (not simulator)
- Check notification permissions in device settings
- Verify push token is registered (check backend logs)
- Ensure EAS project ID is configured

**"Tests failing"**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear jest cache: `npm test -- --clearCache`
- Check that all mocks are properly configured in jest.setup.js

### Getting Help

1. Check backend logs: `npm run dev` output
2. Check mobile logs: Expo DevTools console
3. Use React Native Debugger for inspecting state
4. Check network tab for API call failures

## Performance Optimization

### Token Refresh Optimization

The app uses several strategies to optimize token refresh:

1. **Single In-Flight Refresh**: Multiple 401s trigger only one refresh
2. **No Retry Loops**: Maximum one retry per request
3. **Token Rotation**: Refresh tokens are rotated on each refresh
4. **Automatic Cleanup**: Old refresh tokens are invalidated

### Network Optimization

1. **Pagination**: Posts are paginated (20 per page)
2. **Pull to Refresh**: Manual refresh instead of polling
3. **Lazy Loading**: Screens load data on focus
4. **Image Caching**: Avatar images cached by React Native

## License

See root LICENSE file.
