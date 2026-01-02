/**
 * Centralized API client wrapper
 * - Automatically adds Authorization: Bearer header when token present
 * - Always sends credentials: "include" for refresh token cookie
 * - Auto-retries once on 401 after refreshing token
 * - Prevents infinite retry loops
 */

import {
  getAccessToken,
  setAuth,
  clearAuth,
  isAuthenticated,
} from "./authState.js";

// Track if we're currently refreshing to prevent concurrent refresh calls
let isRefreshing = false;
let refreshPromise = null;

/**
 * Refresh the access token by calling POST /auth/refresh
 * @returns {Promise<boolean>} True if refresh succeeded, false otherwise
 */
async function refreshAccessToken() {
  // If already refreshing, wait for that request to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        credentials: "include", // Send refresh token cookie
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Refresh failed - clear auth state
        clearAuth();
        return false;
      }

      const data = await response.json();

      // Update auth state with new token and user info
      setAuth(data.accessToken, data.user);

      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      clearAuth();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Enhanced fetch wrapper with automatic token handling
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function apiFetch(url, options = {}) {
  // Prepare headers
  const headers = new Headers(options.headers || {});

  // Add Authorization header if we have an access token
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Always include credentials for refresh token cookie
  const finalOptions = {
    ...options,
    headers,
    credentials: "include",
  };

  // Make the request
  let response = await fetch(url, finalOptions);

  // If 401 and we haven't already tried to refresh, attempt refresh once
  if (response.status === 401 && !options._isRetry) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Retry the original request once with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
      }

      response = await fetch(url, {
        ...finalOptions,
        headers,
        _isRetry: true, // Mark as retry to prevent infinite loops
      });
    }
  }

  return response;
}

/**
 * Convenience wrapper for JSON API calls
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If response is not ok
 */
export async function apiJson(url, options = {}) {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Request failed",
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || "Request failed");
  }

  return response.json();
}

/**
 * Logout: Call POST /auth/logout and clear local state
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout request failed:", error);
    // Continue with logout even if request fails
  }

  // Clear auth state
  clearAuth();

  // Redirect to home
  window.location.href = "/";
}

/**
 * Bootstrap authentication on app load
 * Attempts to refresh token to get current user
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function bootstrapAuth() {
  const refreshed = await refreshAccessToken();
  return refreshed;
}
