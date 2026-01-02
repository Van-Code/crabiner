# Crabiner Mobile App

React Native app built with Expo for Crabiner - Missed Connections Rediscovered.

## Features

- ✅ Token-based authentication with Google Sign-In
- ✅ In-memory access token storage (never persisted)
- ✅ Secure refresh token storage in Expo SecureStore
- ✅ Automatic token refresh on 401 errors
- ✅ Browse and search posts
- ✅ Create new posts
- ✅ Reply to posts with threaded conversations
- ✅ Inbox with unread counts
- ✅ Manage your own posts
- ✅ Push notifications with Expo Notifications
- ✅ Notification center with read/unread status
- ✅ User settings and preferences

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- For iOS: Xcode and iOS Simulator
- For Android: Android Studio and Android Emulator
- Google Cloud Console project with OAuth credentials

## Setup

### 1. Install Dependencies

```bash
cd apps/mobile
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

- `API_BASE_URL`: Your backend API URL (default: http://localhost:3000)
- `GOOGLE_WEB_CLIENT_ID`: Google OAuth Web Client ID
- `GOOGLE_IOS_CLIENT_ID`: Google OAuth iOS Client ID
- `GOOGLE_ANDROID_CLIENT_ID`: Google OAuth Android Client ID

### 3. Update app.json

Edit `app.json` and update:
- `expo.extra.eas.projectId`: Your EAS project ID
- Update push notification project ID in `src/utils/notifications.ts`

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials for:
   - Web application (for web client ID)
   - iOS application (with bundle identifier `com.crabiner.app`)
   - Android application (with package name `com.crabiner.app`)
3. Add the client IDs to your `.env` file

## Running the App

### Start Expo Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

### Run on iOS Simulator

```bash
npm run ios
```

### Run on Android Emulator

```bash
npm run android
```

### Run on Web

```bash
npm run web
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## Project Structure

```
apps/mobile/
├── App.tsx                 # Main app entry point
├── src/
│   ├── api/
│   │   └── client.ts       # API client with auto-refresh
│   ├── auth/
│   │   ├── authState.ts    # In-memory auth state
│   │   └── googleAuth.ts   # Google Sign-In integration
│   ├── navigation/
│   │   └── AppNavigator.tsx # Navigation setup
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── BrowseScreen.tsx
│   │   ├── PostDetailScreen.tsx
│   │   ├── CreatePostScreen.tsx
│   │   ├── InboxScreen.tsx
│   │   ├── MyPostsScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── utils/
│   │   └── notifications.ts # Push notification utilities
│   └── types/              # TypeScript type definitions
├── __tests__/              # Test files
└── package.json

```

## Authentication Flow

1. User taps "Sign in with Google"
2. App opens Google OAuth flow via expo-auth-session
3. User authenticates with Google
4. App receives Google ID token
5. App sends ID token to backend `/auth/google/mobile`
6. Backend validates token and returns access + refresh tokens
7. Access token stored in memory only
8. Refresh token stored in Expo SecureStore
9. All API calls use Authorization: Bearer header
10. On 401, app automatically refreshes token and retries

## Push Notifications

### Setup

Push notifications require an Expo account and EAS project:

1. Create Expo account at https://expo.dev
2. Run `eas build:configure` to create EAS project
3. Update project ID in app.json
4. Build app with `eas build`

### Testing Locally

You can test push notifications in development:

1. Run `expo start` and scan QR code with Expo Go app
2. Grant notification permissions when prompted
3. Push token will be registered with backend
4. Use Expo push notification tool to send test notifications

## Security Features

### Token Storage

- ✅ **Access Token**: Stored in memory only (never in AsyncStorage/SecureStore)
- ✅ **Refresh Token**: Stored in SecureStore (encrypted on device)
- ✅ **Auto-refresh**: Automatically refreshes on 401 errors
- ✅ **No infinite loops**: Retries only once to prevent loops

### API Security

All API calls go through the centralized API client that:
- Automatically injects Authorization header
- Refreshes tokens on 401
- Handles errors consistently
- Prevents double-refresh race conditions

## Common Issues

### "Expo Go app is not compatible"

If you see compatibility issues, build a development build:

```bash
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

### Push notifications not working

- Ensure you're using a physical device (push doesn't work in simulator)
- Check notification permissions in device settings
- Verify EAS project ID is correct
- Check backend logs for push registration

### Google Sign-In fails

- Verify OAuth client IDs in .env match Google Cloud Console
- Ensure redirect URIs are configured correctly
- Check that Google OAuth credentials are for correct platform

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

### Submit to App Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## License

See root LICENSE file.
