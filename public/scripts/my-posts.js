// Load user's posts
async function loadMyPosts() {
  const content = document.getElementById('myPostsContent');

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

    // Fetch user's posts
    const response = await fetch("/api/posts/my-posts", {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        showAuthRequired();
        return;
      }
      throw new Error("Failed to load posts");
    }

    const data = await response.json();
    displayMyPosts(data.posts);
  } catch (error) {
    console.error("Error loading posts:", error);
    content.innerHTML = `
      <div class="error-message">
        <p>Failed to load your posts. Please try again later.</p>
        <a href="/browse.html" class="btn-secondary">Browse Posts</a>
      </div>
    `;
  }
}

function showAuthRequired() {
  const content = document.getElementById('myPostsContent');
  content.innerHTML = `
    <div class="auth-required">
      <h2>🔐 Sign in required</h2>
      <p>You must be signed in to view your posts.</p>
      <a href="/auth/google?returnTo=/my-posts.html" class="btn-google">
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

function displayMyPosts(posts) {
  const content = document.getElementById('myPostsContent');

  if (!posts || posts.length === 0) {
    content.innerHTML = `
      <div class="my-posts-header">
        <h1>My Posts</h1>
      </div>
      <div class="empty-state">
        <h3>📭 You haven't posted anything yet</h3>
        <p>Your missed connection posts will appear here.</p>
        <a href="/post.html" class="btn-primary" style="margin-top: 1rem;">Post a Connection</a>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="my-posts-header">
      <h1>My Posts</h1>
      <p style="color: var(--text-light);">${posts.length} post${posts.length === 1 ? "" : "s"}</p>
    </div>
    <div class="my-posts-list">
      ${posts.map(post => createPostCard(post)).join('')}
    </div>
  `;

  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-post-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      confirmDelete(postId);
    });
  });

  // Add event listeners for view buttons
  document.querySelectorAll('.view-post-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.postId;
      window.location.href = `/view.html?id=${postId}`;
    });
  });

  // Add event listeners for inbox buttons
  document.querySelectorAll('.inbox-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionToken = btn.dataset.sessionToken;
      window.location.href = `/inbox.html?session=${sessionToken}`;
    });
  });
}

function createPostCard(post) {
  const postedDate = new Date(post.posted_at).toLocaleDateString();
  const expiresDate = new Date(post.expires_at).toLocaleDateString();
  const replyCount = parseInt(post.reply_count) || 0;
  const unreadCount = parseInt(post.unread_count) || 0;

  return `
    <div class="my-post-card">
      <div class="my-post-header">
        <h3 class="my-post-title">${escapeHtml(post.title)}</h3>
        <div class="my-post-actions">
          <button class="btn-secondary view-post-btn" data-post-id="${post.id}">View</button>
          ${replyCount > 0 ? `<button class="btn-primary inbox-btn" data-session-token="${post.session_token}">Inbox ${unreadCount > 0 ? `(${unreadCount})` : ''}</button>` : ''}
          <button class="btn-danger delete-post-btn" data-post-id="${post.id}">Delete</button>
        </div>
      </div>
      <div class="my-post-meta">
        📍 ${escapeHtml(post.location)} • Posted ${postedDate} • Expires ${expiresDate}
      </div>
      <div class="my-post-description">
        ${escapeHtml(post.description)}
      </div>
      <div class="my-post-stats">
        <span>${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</span>
        ${unreadCount > 0 ? `<span style="color: var(--primary-color); font-weight: 600;">${unreadCount} unread</span>` : ''}
      </div>
    </div>
  `;
}

function confirmDelete(postId) {
  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    return;
  }

  deletePost(postId);
}

async function deletePost(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete post');
    }

    // Reload the page to show updated list
    location.reload();
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete post. Please try again.');
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load posts on page load
loadMyPosts();
