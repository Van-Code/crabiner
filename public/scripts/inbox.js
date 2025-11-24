const urlParams = new URLSearchParams(window.location.search);
const sessionToken = urlParams.get("session");

if (!sessionToken) {
  document.getElementById("messages").innerHTML = `
    <div class="error-message">
      <p>Invalid inbox link. Please use the link from your confirmation email.</p>
      <a href="/" class="btn-secondary">Return home</a>
    </div>
  `;
} else {
  loadInbox();
}

async function loadInbox() {
  try {
    const response = await fetch(`/api/inbox/${sessionToken}`);

    if (!response.ok) {
      throw new Error("Invalid or expired session");
    }

    const data = await response.json();

    displayPostInfo(data.post);
    displayMessages(data.messages);
    updateUnreadBadge(data.unreadCount);
  } catch (error) {
    document.getElementById("messages").innerHTML = `
      <div class="error-message">
        <p>${error.message}</p>
        <a href="/" class="btn-secondary">Return home</a>
      </div>
    `;
  }
}

function displayPostInfo(post) {
  const expiresDate = new Date(post.expires_at).toLocaleDateString();

  document.getElementById("postInfo").innerHTML = `
    <div class="post-card">
      <div class="post-meta">
        <span class="location">📍 ${escapeHtml(post.location)}</span>
      </div>
      <p class="post-description">${escapeHtml(post.description)}</p>
      <div class="post-footer">
        <small>Expires: ${expiresDate}</small>
      </div>
    </div>
  `;
}

function displayMessages(messages) {
  if (messages.length === 0) {
    document.getElementById("messages").innerHTML = `
      <div class="empty-state">
        <p>No messages yet. When someone replies to your post, you'll see them here!</p>
      </div>
    `;
    return;
  }
  // Build threaded message tree
  const messageTree = buildMessageTree(messages);

  document.getElementById("messages").innerHTML = messageTree
    .map((msg) => renderMessageThread(msg, messages, 0))
    .join("");

  // Auto-mark unread messages as read after viewing
  messages
    .filter((m) => !m.is_read && !m.is_from_poster)
    .forEach((msg) => {
      setTimeout(() => markAsRead(msg.id), 2000);
    });

  document.querySelectorAll(".reply-to-msg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showReplyForm(btn.dataset.replyId);
    });
  });
}

function buildMessageTree(messages) {
  // Get top-level messages (no parent)
  return messages.filter((m) => !m.parent_reply_id);
}

function renderMessageThread(message, allMessages, depth) {
  const indent = depth * 30; // 30px per level
  const isFromPoster = message.is_from_poster;

  let html = `
    <div class="message-card ${message.is_read ? "read" : "unread"} ${
    isFromPoster ? "poster-reply" : ""
  }" 
         data-id="${message.id}"
         style="margin-left: ${indent}px;">
      <div class="message-header">
        <span class="message-date">${new Date(
          message.replied_at
        ).toLocaleString()}</span>
        ${
          !message.is_read && !isFromPoster
            ? '<span class="new-badge">NEW</span>'
            : ""
        }
        ${isFromPoster ? '<span class="poster-badge">You replied</span>' : ""}
      </div>
      <p class="message-text">${escapeHtml(message.message)}</p>
      <div class="message-footer">
        ${
          !isFromPoster
            ? `<strong>Contact:</strong> ${escapeHtml(message.replier_email)}`
            : ""
        }
        <div class="message-actions">
          ${
            !isFromPoster
              ? `
            <button class="btn-small reply-to-msg-btn" data-reply-id="${
              message.id
            }">↩️ Reply</button>
            ${
              !message.is_read
                ? `<button onclick="markAsRead('${message.id}')" class="btn-small">Mark as read</button>`
                : ""
            }
            <button onclick="deleteMessage('${
              message.id
            }')" class="btn-small btn-danger-small">Delete</button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;

  // Add nested replies
  const childReplies = allMessages.filter(
    (m) => m.parent_reply_id === message.id
  );
  childReplies.forEach((child) => {
    html += renderMessageThread(child, allMessages, depth + 1);
  });

  return html;
}

let replyingToMessageId = null;

function showReplyForm(replyId) {
  replyingToMessageId = replyId;
  const form = document.getElementById("replyToMessageForm");
  form.style.display = "block";
  form.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("cancelPosterReply")?.addEventListener("click", () => {
  document.getElementById("replyToMessageForm").style.display = "none";
  replyingToMessageId = null;
});

document
  .getElementById("posterReplyMessage")
  ?.addEventListener("input", (e) => {
    document.getElementById("posterReplyCount").textContent =
      e.target.value.length;
  });

document
  .getElementById("posterReplyForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const message = document.getElementById("posterReplyMessage").value;

      const response = await fetch(
        `/api/inbox/${sessionToken}/messages/${replyingToMessageId}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reply");
      }

      document.getElementById("replyToMessageForm").style.display = "none";
      document.getElementById("posterReplyMessage").value = "";
      replyingToMessageId = null;

      loadInbox(); // Refresh
    } catch (error) {
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reply";
    }
  });

function updateUnreadBadge(count) {
  const badge = document.getElementById("unreadBadge");
  if (count > 0) {
    badge.textContent = `${count} new`;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

async function markAsRead(messageId) {
  try {
    await fetch(`/api/inbox/${sessionToken}/messages/${messageId}/read`, {
      method: "PATCH",
    });
    loadInbox(); // Refresh
  } catch (error) {
    console.error("Failed to mark as read:", error);
  }
}

async function deleteMessage(messageId) {
  if (!confirm("Delete this message? This cannot be undone.")) {
    return;
  }

  try {
    await fetch(`/api/inbox/${sessionToken}/messages/${messageId}`, {
      method: "DELETE",
    });
    loadInbox(); // Refresh
  } catch (error) {
    alert("Failed to delete message");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
