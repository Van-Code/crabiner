// Load recent posts for preview
async function loadRecentPosts() {
  try {
    const response = await fetch("/api/posts?page=1");
    const data = await response.json();

    const grid = document.getElementById("recentPostsGrid");

    if (data.posts.length === 0) {
      grid.innerHTML = '<p class="empty-state">No posts yet. Be the first!</p>';
      return;
    }

    // Show first 3 posts
    grid.innerHTML = data.posts
      .slice(0, 3)
      .map((post) => {
        const postedDate = new Date(post.posted_at).toLocaleDateString();
        return `
          <div class="preview-card" onclick="window.location.href='/view.html?id=${
            post.id
          }'">
            <div class="preview-meta">
              <span class="location">📍 ${escapeHtml(post.location)}</span>
              ${
                post.category
                  ? `<span class="category-tag">${escapeHtml(
                      post.category
                    )}</span>`
                  : ""
              }
            </div>
            <p class="preview-description">${escapeHtml(
              post.title.substring(0, 150)
            )}${post.title.length > 150 ? "..." : ""}</p>
            <div class="preview-footer">
              <small>${postedDate}</small>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    document.getElementById("recentPostsGrid").innerHTML =
      '<p class="error">Failed to load posts</p>';
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load popular locations
async function loadPopularLocations() {
  try {
    const response = await fetch("/api/posts/locations");
    if (!response.ok) {
      throw new Error("Failed to load locations");
    }
    const data = await response.json();

    const locationsList = document.getElementById("popularLocationsList");

    if (data.locations.length === 0) {
      locationsList.innerHTML = '<p class="empty-state">No locations yet</p>';
      return;
    }

    // Show top 10 locations as clickable tags
    locationsList.innerHTML = data.locations
      .slice(0, 10)
      .map(
        (loc) =>
          `<button class="location-tag" onclick="window.location.href='/browse.html?location=${encodeURIComponent(loc.name)}'">
            📍 ${escapeHtml(loc.name)} (${loc.post_count})
          </button>`
      )
      .join("");
  } catch (error) {
    document.getElementById("popularLocationsList").innerHTML =
      '<p class="error">Failed to load locations</p>';
  }
}

// Load on page load
loadRecentPosts();
loadPopularLocations();
