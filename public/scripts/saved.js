// Load user's saved posts
async function loadSavedPosts() {
  const content = document.getElementById('savedContent');

  try {
    // Check authentication
    const authResponse = await fetch("/auth/status", {
      credentials: "include",
    });
    const authData = await authResponse.json();

    if (!authData.authenticated) {
      showAuthRequired();
      return;
    }

    // Fetch saved posts
    const response = await fetch("/api/posts/saved", {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        showAuthRequired();
        return;
      }
      throw new Error("Failed to load saved posts");
    }

    const data = await response.json();
    displaySavedPosts(data.posts);
  } catch (error) {
    console.error("Error loading saved posts:", error);
    content.innerHTML = `
      <div class="error-message">
        <p>Failed to load saved posts. Please try again later.</p>
        <a href="/browse.html" class="btn-secondary">Browse Posts</a>
      </div>
    `;
  }
}

function showAuthRequired() {
  const content = document.getElementById('savedContent');
  content.innerHTML = `
    <div class="auth-required">
      <h2>🔐 Sign in required</h2>
      <p>You must be signed in to view your saved posts.</p>
      <a href="/auth/google?returnTo=/saved.html" class="btn-google">
        <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Sign in with Google
      </a>
      <p style="margin-top: 1rem;">
        <a href="/browse.html" class="btn-secondary">Browse Posts Instead</a>
      </p>
    </div>
  `;
}

function displaySavedPosts(posts) {
  const content = document.getElementById('savedContent');

  if (!posts || posts.length === 0) {
    content.innerHTML = `
      <div class="saved-header">
        <h1>💾 Saved Posts</h1>
      </div>
      <div class="empty-state">
        <h3>📭 No saved posts yet</h3>
        <p>When you save posts, they'll appear here for easy access later.</p>
        <a href="/browse.html" class="btn-primary" style="margin-top: 1rem;">Browse Posts</a>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="saved-header">
      <h1>💾 Saved Posts</h1>
      <p style="color: var(--text-light);">${posts.length} saved post${posts.length === 1 ? "" : "s"}</p>
    </div>
    <div class="saved-list">
      ${posts.map(post => createSavedCard(post)).join('')}
    </div>
  `;

  // Add event listeners
  document.querySelectorAll('.saved-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking the unsave button
      if (e.target.classList.contains('unsave-btn') || e.target.closest('.unsave-btn')) {
        return;
      }
      const postId = card.dataset.postId;
      window.location.href = `/view.html?id=${postId}`;
    });
  });

  document.querySelectorAll('.unsave-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      await unsavePost(postId);
    });
  });
}

function createSavedCard(post) {
  const savedDate = new Date(post.saved_at).toLocaleDateString();

  return `
    <div class="saved-card" data-post-id="${post.id}">
      <div class="saved-header-row">
        <h3 class="saved-title">${escapeHtml(post.title)}</h3>
        <button class="unsave-btn" data-post-id="${post.id}" title="Remove from saved">
          ❌
        </button>
      </div>
      <div class="saved-meta">
        📍 ${escapeHtml(post.location)} • Saved ${savedDate}
      </div>
      <div class="saved-description">
        ${escapeHtml(post.description).substring(0, 200)}${post.description.length > 200 ? "..." : ""}
      </div>
    </div>
  `;
}

async function unsavePost(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}/save`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to unsave post');
    }

    // Reload the page to show updated list
    location.reload();
  } catch (error) {
    console.error('Unsave error:', error);
    alert('Failed to unsave post. Please try again.');
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load saved posts on page load
loadSavedPosts();
