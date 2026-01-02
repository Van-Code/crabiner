import { apiJson, apiFetch } from "./apiClient.js";
import { isAuthenticated } from "./authState.js";

// Get session token from URL if viewing a specific post's inbox
const urlParams = new URLSearchParams(window.location.search);
const sessionToken = urlParams.get("session");

if (sessionToken) {
  // Load individual post inbox (existing behavior for session tokens)
  loadPostInbox(sessionToken);
} else {
  // Load authenticated user's inbox list
  loadInboxList();
}

// Load authenticated user's inbox list (all posts with replies)
async function loadInboxList() {
  const messages = document.getElementById("messages");

  try {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      showAuthRequired();
      return;
    }

    // Load inbox posts using API client
    const data = await apiJson("/api/inbox");
    displayInboxList(data);
  } catch (error) {
    console.error("Inbox load error:", error);

    // Check if auth failed
    if (!isAuthenticated()) {
      showAuthRequired();
      return;
    }

    messages.innerHTML = `
      <div class="error-message">
        <p>Failed to load inbox. Please try again later.</p>
        <a href="/browse.html" class="btn-secondary">Browse Moments</a>
      </div>
    `;
  }
}

function showAuthRequired() {
  const messages = document.getElementById("messages");
  messages.innerHTML = `
    <div class="auth-required" style="text-align: center; padding: 3rem 1rem;">
      <h2>🔐 Sign in required</h2>
      <p>You must be signed in to view your inbox and manage replies to your posts.</p>
      <a href="/auth/google?returnTo=/inbox.html" class="btn-google">
        <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google
      </a>
      <p style="margin-top: 1rem;">
        <a href="/browse.html" class="btn-secondary">Browse Moments Instead</a>
      </p>
    </div>
  `;

  // Hide other sections
  document.getElementById("postInfo").style.display = "none";
  document.querySelector(".inbox-header").style.display = "none";
}

function displayInboxList(data) {
  const messages = document.getElementById("messages");
  const postInfo = document.getElementById("postInfo");
  const inboxHeader = document.querySelector(".inbox-header");

  // Hide individual post info
  postInfo.style.display = "none";

  if (!data.posts || data.posts.length === 0) {
    inboxHeader.querySelector("h2").textContent = "Inbox";
    inboxHeader.querySelector("#unreadBadge").style.display = "none";

    messages.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem 1rem;">
        <h3>📭 Your inbox is empty</h3>
        <p>When you receive replies to your posts, they'll appear here.</p>
        <a href="/browse.html" class="btn-primary" style="margin-top: 1rem;">Browse Moments</a>
      </div>
    `;
    return;
  }

  const totalUnread = data.totalUnread || 0;

  // Update header
  inboxHeader.querySelector("h2").textContent = "Inbox";
  const unreadBadge = inboxHeader.querySelector("#unreadBadge");
  if (totalUnread > 0) {
    unreadBadge.textContent = `${totalUnread} unread`;
    unreadBadge.style.display = "inline-block";
  } else {
    unreadBadge.style.display = "none";
  }

  // Display posts list
  messages.innerHTML = `
    <div class="inbox-list-container">
      <p class="inbox-stats" style="color: var(--text-light); margin-bottom: 1rem;">
        ${data.posts.length} post${
    data.posts.length === 1 ? "" : "s"
  } with replies
      </p>
      ${data.posts.map((post) => createInboxListItem(post)).join("")}
    </div>
  `;

  // Add click handlers
  document.querySelectorAll(".inbox-list-item").forEach((item) => {
    item.addEventListener("click", () => {
      const sessionToken = item.dataset.sessionToken;
      window.location.href = `/inbox.html?session=${sessionToken}`;
    });
  });
}

function createInboxListItem(post) {
  const replyCount = parseInt(post.reply_count) || 0;
  const unreadCount = parseInt(post.unread_count) || 0;

  return `
    <div class="inbox-list-item" data-session-token="${escapeHtml(
      post.session_token
    )}" style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1.1rem;">${escapeHtml(post.title)}</h3>
        ${
          unreadCount > 0
            ? `<span style="background: var(--primary-color); color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600;">${unreadCount} new</span>`
            : ""
        }
      </div>
      <div style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 0.75rem;">
        📍 ${escapeHtml(post.location)} • ${replyCount} ${
    replyCount === 1 ? "reply" : "replies"
  }
      </div>
      <div style="font-size: 0.95rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${escapeHtml(post.description).substring(0, 120)}${
    post.description.length > 120 ? "..." : ""
  }
      </div>
    </div>
  `;
}

// Load individual post inbox (existing session-based behavior)
async function loadPostInbox(sessionToken) {
  try {
    const response = await fetch(`/api/inbox/${sessionToken}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Invalid or expired session");
      }
      throw new Error("Failed to load inbox");
    }

    const data = await response.json();
    displayPostInbox(data);
  } catch (error) {
    console.error("Inbox error:", error);
    document.getElementById("messages").innerHTML = `
      <div class="error-message">
        <p>${error.message}</p>
        <a href="/browse.html" class="btn-secondary">Return to browse</a>
      </div>
    `;
  }
}

function displayPostInbox(data) {
  // Display post info
  const postInfo = document.getElementById("postInfo");
  postInfo.style.display = "block";
  postInfo.innerHTML = `
    <h1 class="post-title">${escapeHtml(data.post.description)}</h1>
    <div class="post-meta">
      <span>📍 ${escapeHtml(data.post.location)}</span>
    </div>
  `;

  // Update header
  const unreadCount = data.unreadCount || 0;
  const unreadBadge = document.getElementById("unreadBadge");
  if (unreadCount > 0) {
    unreadBadge.textContent = `${unreadCount} unread`;
    unreadBadge.style.display = "inline-block";
  }

  // Display messages
  const messagesContainer = document.getElementById("messages");
  if (data.messages.length === 0) {
    messagesContainer.innerHTML = `<p class="no-messages">No messages yet</p>`;
    return;
  }

  messagesContainer.innerHTML = data.messages
    .map((msg) => createMessageCard(msg))
    .join("");

  // Add reply buttons
  document.querySelectorAll(".reply-to-message-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showReplyForm(btn.dataset.replyId);
    });
  });
}

function createMessageCard(message) {
  return `
    <div class="message-card ${message.is_read ? "" : "unread"}">
      <div class="message-header">
        <strong>${escapeHtml(message.replier_email)}</strong>
        <small>${new Date(message.replied_at).toLocaleString()}</small>
      </div>
      <div class="message-body">
        ${escapeHtml(message.message)}
      </div>
      ${
        !message.is_from_poster
          ? `<button class="btn-secondary reply-to-message-btn" data-reply-id="${message.id}">Reply</button>`
          : ""
      }
    </div>
  `;
}

function showReplyForm(replyId) {
  const form = document.getElementById("replyToMessageForm");
  form.style.display = "block";
  form.dataset.replyId = replyId;

  // Scroll to form
  form.scrollIntoView({ behavior: "smooth" });
}

// Handle poster reply form submission
const posterReplyForm = document.getElementById("posterReplyForm");
if (posterReplyForm) {
  posterReplyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = document.getElementById("replyToMessageForm");
    const replyId = form.dataset.replyId;
    const message = document.getElementById("posterReplyMessage").value;

    try {
      await apiFetch(
        `/api/inbox/${sessionToken}/messages/${replyId}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );

      // Reload inbox
      location.reload();
    } catch (error) {
      alert(error.message || "Failed to send reply");
    }
  });
}

// Cancel poster reply
const cancelBtn = document.getElementById("cancelPosterReply");
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    document.getElementById("replyToMessageForm").style.display = "none";
    document.getElementById("posterReplyMessage").value = "";
  });
}

// Character counter
const posterReplyMessage = document.getElementById("posterReplyMessage");
if (posterReplyMessage) {
  posterReplyMessage.addEventListener("input", () => {
    document.getElementById("posterReplyCount").textContent =
      posterReplyMessage.value.length;
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
