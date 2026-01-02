/**
 * In-memory auth state module
 * Stores access token and user info in memory only (NOT localStorage/sessionStorage)
 * Single source of truth for authentication state
 */

let accessToken = null;
let currentUser = null;

/**
 * Get the current access token
 * @returns {string|null} Access token or null if not authenticated
 */
export function getAccessToken() {
  return accessToken;
}

/**
 * Set the access token
 * @param {string} token - JWT access token
 */
export function setAccessToken(token) {
  accessToken = token;
}

/**
 * Get the current user
 * @returns {Object|null} User object or null if not authenticated
 */
export function getUser() {
  return currentUser;
}

/**
 * Set the current user
 * @param {Object} user - User object with id, email, name, avatarUrl
 */
export function setUser(user) {
  currentUser = user;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if access token exists
 */
export function isAuthenticated() {
  return !!accessToken;
}

/**
 * Clear all auth state (logout)
 */
export function clearAuth() {
  accessToken = null;
  currentUser = null;
}

/**
 * Set both token and user (convenience method)
 * @param {string} token - JWT access token
 * @param {Object} user - User object
 */
export function setAuth(token, user) {
  accessToken = token;
  currentUser = user;
}
