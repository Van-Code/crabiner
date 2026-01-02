/**
 * Authentication UI handler
 * Bootstraps auth on page load and updates UI based on auth state
 */

import { bootstrapAuth, logout } from "./apiClient.js";
import { getUser, isAuthenticated } from "./authState.js";

/**
 * Update auth UI based on current auth state
 */
function updateAuthUI() {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;

  const user = getUser();

  if (isAuthenticated() && user) {
    // User is authenticated - show user menu
    authSection.innerHTML = `
      <a href="/inbox.html" class="nav-link">Inbox</a>
      <div class="user-menu">
        <img src="${user.avatarUrl || "/default-avatar.png"}"
             alt="${user.name}"
             class="user-avatar">
        <span class="user-name">${user.name}</span>
        <div class="dropdown">
          <button class="dropdown-toggle">▼</button>
          <div class="dropdown-menu">
            <a href="/my-posts.html">My Posts</a>
            <a href="/saved.html">Saved Posts</a>
            <button id="logoutBtn" style="background: none; border: none; padding: 0.5rem 1rem; width: 100%; text-align: left; cursor: pointer;">Sign out</button>
          </div>
        </div>
      </div>
    `;

    // Add logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logout();
      });
    }

    // Check for success message from OAuth callback
    checkForAuthCallback();
  } else {
    // User is not authenticated - show sign in button
    authSection.innerHTML = `
      <a href="/auth/google" class="btn-google">
        <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google
      </a>
    `;

    // Check for failure message
    checkForAuthCallback();
  }
}

/**
 * Check for OAuth callback parameters in URL
 */
function checkForAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const authStatus = params.get("auth");

  if (authStatus === "success") {
    showNotification("Welcome back! You are now signed in.", "success");
    cleanupURL();
  } else if (authStatus === "failed") {
    showNotification("Login failed. Please try again.", "error");
    cleanupURL();
  }

  // Also check URL fragment for token (from OAuth callback)
  const hash = window.location.hash;
  if (hash.includes("token=")) {
    // Token in fragment - will be handled by OAuth callback page
    const fragmentParams = new URLSearchParams(hash.substring(1));
    if (fragmentParams.get("auth") === "success") {
      showNotification("Welcome back! You are now signed in.", "success");
    }
    // Clean up fragment
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

/**
 * Clean up URL parameters
 */
function cleanupURL() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

/**
 * Show notification message
 */
function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Dropdown toggle handler
 */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("dropdown-toggle")) {
    const dropdown = e.target.nextElementSibling;
    dropdown.classList.toggle("show");
  } else {
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("show");
    });
  }
});

/**
 * Bootstrap auth and update UI on page load
 */
async function initAuth() {
  await bootstrapAuth();
  updateAuthUI();
}

// Initialize auth on page load
initAuth();
