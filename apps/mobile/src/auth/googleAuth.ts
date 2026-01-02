/**
 * Google Authentication for Expo
 * Uses expo-auth-session for OAuth flow
 */

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { setAuth, setRefreshToken } from './authState';
import { apiPost } from '../api/client';

// This is required for the OAuth flow to work properly
WebBrowser.maybeCompleteAuthSession();

// Get Google Client IDs from environment
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || '';
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId || '';
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId || '';

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Initialize Google OAuth
 * Returns request, response, and promptAsync function
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  return { request, response, promptAsync };
}

/**
 * Sign in with Google using ID token
 * @param idToken - Google ID token from OAuth flow
 * @returns Authentication result
 */
export async function signInWithGoogle(idToken: string): Promise<GoogleAuthResult> {
  try {
    // Send ID token to backend
    const response = await apiPost<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: number;
        email: string;
        name: string;
        avatarUrl?: string;
      };
    }>('/auth/google/mobile', { idToken });

    // Store tokens and user
    setAuth(response.accessToken, response.user);
    await setRefreshToken(response.refreshToken);

    return { success: true };
  } catch (error: any) {
    console.error('Google sign-in failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
}

/**
 * Handle Google OAuth response
 * @param response - Response from Google OAuth
 * @returns Authentication result
 */
export async function handleGoogleResponse(
  response: Google.TokenResponse | null
): Promise<GoogleAuthResult> {
  if (!response) {
    return { success: false, error: 'No response from Google' };
  }

  if (response.type !== 'success') {
    return { success: false, error: 'Authentication cancelled or failed' };
  }

  const { id_token } = response.params;

  if (!id_token) {
    return { success: false, error: 'No ID token received' };
  }

  return signInWithGoogle(id_token);
}
