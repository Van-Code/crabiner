/**
 * API Client with automatic token refresh on 401
 * - Injects Authorization: Bearer header
 * - Auto-retries once on 401 after refreshing token
 * - Prevents infinite retry loops
 */

import Constants from 'expo-constants';
import {
  getAccessToken,
  setAuth,
  clearAuth,
  getRefreshToken,
  clearRefreshToken,
} from '../auth/authState';

// Get base URL from environment or use default
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';

// Track if we're currently refreshing to prevent concurrent refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the access token using the refresh token from SecureStore
 * @returns True if refresh succeeded, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that request to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        clearAuth();
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear auth state
        clearAuth();
        await clearRefreshToken();
        return false;
      }

      const data = await response.json();

      // Update auth state with new tokens
      setAuth(data.accessToken, data.user);

      // Update refresh token if rotated
      if (data.refreshToken) {
        const { setRefreshToken } = await import('../auth/authState');
        await setRefreshToken(data.refreshToken);
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
      await clearRefreshToken();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiOptions extends RequestInit {
  _isRetry?: boolean;
}

/**
 * Enhanced fetch wrapper with automatic token handling
 * @param url - Request URL (relative or absolute)
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  // Construct full URL if relative
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Prepare headers
  const headers = new Headers(options.headers);

  // Add Authorization header if we have an access token
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set content type if not already set and we have a body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
  };

  // Make the request
  let response = await fetch(fullUrl, finalOptions);

  // If 401 and we haven't already tried to refresh, attempt refresh once
  if (response.status === 401 && !options._isRetry) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Retry the original request once with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
      }

      response = await fetch(fullUrl, {
        ...finalOptions,
        headers,
      });
    }
  }

  return response;
}

/**
 * Convenience wrapper for JSON API calls
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws Error if response is not ok
 */
export async function apiJson<T = any>(url: string, options: ApiOptions = {}): Promise<T> {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    let error: any;
    try {
      error = await response.json();
    } catch {
      error = { error: 'Request failed', message: response.statusText };
    }
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

/**
 * GET request helper
 */
export function apiGet<T = any>(url: string, options?: ApiOptions): Promise<T> {
  return apiJson<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T = any>(url: string, body?: any, options?: ApiOptions): Promise<T> {
  return apiJson<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export function apiPatch<T = any>(url: string, body?: any, options?: ApiOptions): Promise<T> {
  return apiJson<T>(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T = any>(url: string, options?: ApiOptions): Promise<T> {
  return apiJson<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Bootstrap authentication on app load
 * Attempts to refresh token to get current user
 * @returns True if authenticated, false otherwise
 */
export async function bootstrapAuth(): Promise<boolean> {
  const refreshed = await refreshAccessToken();
  return refreshed;
}

/**
 * Logout: Call POST /auth/logout and clear local state
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (error) {
    console.error('Logout request failed:', error);
    // Continue with logout even if request fails
  }

  // Clear auth state
  clearAuth();
  await clearRefreshToken();
}
