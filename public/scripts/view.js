// Get post ID from URL
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

if (!postId) {
  window.location.href = "/";
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

  document.getElementById("replySection").style.display = "block";

  initReportButton();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Character counter for reply
const message = document.getElementById("message");
const replyCharCount = document.getElementById("replyCharCount");

message.addEventListener("input", () => {
  replyCharCount.textContent = message.value.length;
});

// Step 1: Request verification code
const replyForm = document.getElementById("replyForm");
const verificationForm = document.getElementById("verificationForm");
const replySuccess = document.getElementById("replySuccess");
const replyError = document.getElementById("replyError");

let pendingReply = null;

replyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = replyForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending code...";

  replyError.style.display = "none";

  try {
    pendingReply = {
      postId: postId,
      message: document.getElementById("message").value,
      email: document.getElementById("replyEmail").value,
    };

    const response = await fetch("/api/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingReply),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send verification code");
    }

    // Show verification form
    replyForm.style.display = "none";
    verificationForm.style.display = "block";

    replyError.style.display = "none";
    replyError.className = "success-message";
    replyError.textContent = "Verification code sent! Check your email.";
    replyError.style.display = "block";
  } catch (error) {
    replyError.className = "error-message";
    replyError.textContent = error.message;
    replyError.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Verification Code";
  }
});

// Step 2: Verify code and send reply
verificationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = verificationForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Verifying...";

  replyError.style.display = "none";

  try {
    const code = document.getElementById("verificationCode").value;
    const response = await fetch("/api/verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: pendingReply.postId,
        email: pendingReply.email,
        code: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Invalid verification code");
    }

    verificationForm.style.display = "none";
    replySuccess.style.display = "block";
  } catch (error) {
    replyError.className = "error-message";
    replyError.textContent = error.message;
    replyError.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Verify & Send Reply";
  }
});

// Resend code button
document.getElementById("resendCode").addEventListener("click", async () => {
  const btn = document.getElementById("resendCode");
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const response = await fetch("/api/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingReply),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to resend code");
    }

    replyError.className = "success-message";
    replyError.textContent = "New code sent! Check your email.";
    replyError.style.display = "block";
  } catch (error) {
    replyError.className = "error-message";
    replyError.textContent = error.message;
    replyError.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Resend Code";
  }
});

// Report modal handling
const reportModal = document.getElementById("reportModal");
const reportBtn = document.getElementById("reportBtn");
const closeModalBtn = document.querySelector(".close");
const cancelReport = document.getElementById("cancelReport");
const reportForm = document.getElementById("reportForm");
const reportSuccess = document.getElementById("reportSuccess");

function initReportButton() {
  const reportBtn = document.getElementById("reportBtn");

  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      reportModal.style.display = "block";
    });
  }
}
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
