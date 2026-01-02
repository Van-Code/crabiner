import { apiFetch } from "./apiClient.js";
import { getUser, isAuthenticated } from "./authState.js";

// Get post ID from URL
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

if (!postId) {
  window.location.href = "/";
}

// Check auth status on load
async function checkAuthForReply() {
  try {
    if (isAuthenticated()) {
      const currentUser = getUser();
      showReplyForm();
    } else {
      showAuthPrompt();
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    showAuthPrompt();
  }
}

function showAuthPrompt() {
  document.getElementById("replySection").innerHTML = `
    <h2>Reply to this connection</h2>
    <div class="auth-prompt">
      <p>🔐 <strong>Sign in required to reply</strong></p>
      <p>You must sign in with Google to send replies. This helps prevent spam and ensures authentic connections.</p>
      <a href="/auth/google?returnTo=/view.html?id=${postId}" class="btn-google">
        <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google to reply
      </a>
      <p class="auth-note">Posting moments is still anonymous, but replies require an account.</p>
    </div>
  `;
  document.getElementById("replySection").style.display = "block";
}

function showReplyForm() {
  document.getElementById("replySection").innerHTML = `
    <h2>Reply to this connection</h2>

    <div class="auth-info">
      <p>✓ Signed in as <strong>${escapeHtml(currentUser.name)}</strong></p>
    </div>

    <form id="replyForm">
      <div class="form-group">
        <label for="message">Your message *</label>
        <textarea
          id="message"
          name="message"
          rows="5"
          placeholder="Write your reply..."
          required
          minlength="10"
          maxlength="1000"
        ></textarea>
        <small><span id="replyCharCount">0</span>/1000 characters</small>
      </div>

      <div class="form-group">
        <label for="replyEmail">Your contact email *</label>
        <input
          type="email"
          id="replyEmail"
          name="replyEmail"
          placeholder="your@email.com"
          value="${escapeHtml(currentUser.email)}"
          required
        />
        <small>The poster will receive this email to contact you directly</small>
      </div>

      <button type="submit" class="btn-primary">Send Reply</button>
    </form>

    <div id="replySuccess" class="success-message" style="display: none">
      <h3>✨ Reply sent!</h3>
      <p>The poster will receive your message and contact info. Good luck!</p>
    </div>

    <div id="replyError" class="error-message" style="display: none"></div>
  `;
  document.getElementById("replySection").style.display = "block";

  // Add character counter
  const message = document.getElementById("message");
  const replyCharCount = document.getElementById("replyCharCount");
  message.addEventListener("input", () => {
    replyCharCount.textContent = message.value.length;
  });

  // Handle form submission
  const replyForm = document.getElementById("replyForm");
  replyForm.addEventListener("submit", handleReplySubmit);
}

async function handleReplySubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  const replyError = document.getElementById("replyError");
  const replySuccess = document.getElementById("replySuccess");
  replyError.style.display = "none";

  try {
    const message = document.getElementById("message").value;
    const contactEmail = document.getElementById("replyEmail").value;

    const response = await apiFetch(`/api/replies/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        contactEmail,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error("You must be signed in to reply. Please refresh and sign in.");
      }
      throw new Error(data.error || "Failed to send reply");
    }

    // Show success
    document.getElementById("replyForm").style.display = "none";
    replySuccess.style.display = "block";
  } catch (error) {
    replyError.className = "error-message";
    replyError.textContent = error.message;
    replyError.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Reply";
  }
}

// Load post on page load
loadPost();

// Load post
async function loadPost() {
  try {
    const response = await fetch(`/api/posts/${postId}`);
    if (!response.ok) {
      throw new Error("Post not found or expired");
    }

    const post = await response.json();

    displayPost(post);

    // Check auth for reply section
    checkAuthForReply();
  } catch (error) {
    document.getElementById("postDetail").innerHTML = `
     <div class="error-message">
       <p>${error.message}</p>
       <a href="/browse.html" class="btn-secondary">Return to all posts</a>
     </div>
   `;
  }
}

function displayPost(post) {
  const postedDate = new Date(post.posted_at).toLocaleDateString();
  const expiresDate = new Date(post.expires_at).toLocaleDateString();

  document.getElementById("postDetail").innerHTML = `
    <div class="post-card">
      <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <span class="location">📍 ${escapeHtml(post.location)}</span>
      </div>
      <p class="post-description">${escapeHtml(post.description)}</p>
      <div class="post-footer">
        <small>Posted: ${postedDate}</small>
        <small>Expires: ${expiresDate}</small>
      </div>
      <button id="reportBtn" class="btn-report">🚩 Report Post</button>
    </div>
  `;

  initReportButton();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Report modal handling
const reportModal = document.getElementById("reportModal");

function initReportButton() {
  const reportBtn = document.getElementById("reportBtn");

  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      reportModal.style.display = "block";
    });
  }
}

const closeModalBtn = document.querySelector(".close");
const cancelReport = document.getElementById("cancelReport");
const reportForm = document.getElementById("reportForm");
const reportSuccess = document.getElementById("reportSuccess");

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    reportModal.style.display = "none";
    reportForm.style.display = "block";
    reportSuccess.style.display = "none";
    reportForm.reset();
  });
}

if (cancelReport) {
  cancelReport.addEventListener("click", () => {
    reportModal.style.display = "none";
  });
}

const closeModalSuccess = document.getElementById("closeModal");
if (closeModalSuccess) {
  closeModalSuccess.addEventListener("click", () => {
    reportModal.style.display = "none";
    reportForm.style.display = "block";
    reportSuccess.style.display = "none";
  });
}

// Character counter for details
const reportDetails = document.getElementById("reportDetails");
if (reportDetails) {
  reportDetails.addEventListener("input", (e) => {
    document.getElementById("detailsCount").textContent = e.target.value.length;
  });
}

// Submit report
if (reportForm) {
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = reportForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const response = await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId,
          reason: document.getElementById("reportReason").value,
          details: document.getElementById("reportDetails").value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      reportForm.style.display = "none";
      reportSuccess.style.display = "block";
    } catch (error) {
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
    }
  });
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === reportModal) {
    reportModal.style.display = "none";
  }
});
