// State
let currentPage = 1;
let currentLocation = "";
let currentCategory = "";
let currentSearchQuery = "";

// DOM Elements
const postsContainer = document.getElementById("posts");
const locationFilter = document.getElementById("locationFilter");
const categoryFilter = document.getElementById("categoryFilter");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const searchQuery = document.getElementById("searchQuery");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");

// Load posts on page load
document.addEventListener("DOMContentLoaded", () => {
  loadPosts();

  // Enter key on location filter
  locationFilter.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      filterBtn.click();
    }
  });
  // Search button click
  searchBtn.addEventListener("click", () => {
    currentSearchQuery = searchQuery.value.trim();
    currentLocation = locationFilter.value.trim();
    currentCategory = categoryFilter.value;
    currentPage = 1;
    loadPosts();
  });

  // Clear button
  clearBtn.addEventListener("click", () => {
    searchQuery.value = "";
    locationFilter.value = "";
    categoryFilter.value = "";
    currentSearchQuery = "";
    currentLocation = "";
    currentCategory = "";
    currentPage = 1;
    loadPosts();
  });

  // Enter key on search
  searchQuery.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  // Pagination
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadPosts();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    currentPage++;
    loadPosts();
  });
});

// Load posts from API
async function loadPosts() {
  postsContainer.innerHTML = '<p class="loading">Loading posts...</p>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
    });

    if (currentLocation) {
      params.append("location", currentLocation);
    }
    const response = await fetch(`/api/posts?${params}`);

    if (!response.ok) {
      throw new Error("Failed to load posts");
    }

    const data = await response.json();

    displayPosts(data.posts);
    updatePagination(data.hasMore);
  } catch (error) {
    postsContainer.innerHTML = `
      <div class="error-message">
        <p>Failed to load posts. Please try again.</p>
      </div>
    `;
  }
}

// Display posts in grid
function displayPosts(posts) {
  if (posts.length === 0) {
    postsContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
        <p style="color: var(--text-light);">No posts found. Be the first to post a missed connection!</p>
        <a href="/post.html" class="btn-primary" style="margin-top: 1rem;">Post a Connection</a>
      </div>
    `;
    return;
  }

  postsContainer.innerHTML = posts.map((post) => createPostCard(post)).join("");

  // Add click handlers to posts
  document.querySelectorAll(".post-card").forEach((card) => {
    card.addEventListener("click", () => {
      const postId = card.dataset.postId;
      window.location.href = `/view.html?id=${postId}`;
    });
  });
}

// Create HTML for a post card
function createPostCard(post) {
  const postedDate = new Date(post.posted_at).toLocaleDateString();
  const expiresDate = new Date(post.expires_at).toLocaleDateString();

  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-meta">
        <span class="location">📍 ${escapeHtml(post.location)}</span>
        ${
          post.category
            ? `<span class="category">${escapeHtml(post.category)}</span>`
            : ""
        }
      </div>
      <p class="post-description">${escapeHtml(post.description)}</p>
      <div class="post-footer">
        <small>Posted: ${postedDate}</small>
        <small>Expires: ${expiresDate}</small>
      </div>
    </div>
  `;
}

// Update pagination controls
function updatePagination(hasMore) {
  pageInfo.textContent = `Page ${currentPage}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = !hasMore;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load location suggestions
async function loadLocationSuggestions() {
  try {
    const response = await fetch("/api/posts/locations");
    if (!response.ok) {
      throw new Error("Failed to load locations");
    }
    const data = await response.json();

    const datalist = document.getElementById("locationSuggestions");
    datalist.innerHTML = data.locations
      .map(
        (loc) =>
          `<option value="${loc.name}">${loc.name}${
            loc.city ? `, ${loc.city}` : ""
          } (${loc.post_count})</option>`
      )
      .join("");

    // Show popular locations as clickable tags
    const popularList = document.getElementById("popularLocationsList");
    popularList.innerHTML = data.locations
      .slice(0, 10)
      .map(
        (loc) =>
          `<button class="location-tag" data-location="${loc.name}">
        📍 ${loc.name} (${loc.post_count})
      </button>`
      )
      .join("");

    // Click handler
    document.querySelectorAll(".location-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        locationFilter.value = btn.dataset.location;
        searchBtn.click();
      });
    });
  } catch (error) {
    console.error("Failed to load locations:", error);
  }
}
async function loadPopularSearches() {
  try {
    const response = await fetch("/api/posts/popular-searches");
    const data = await response.json();

    if (data.searches.length > 0) {
      const container = document.getElementById("popularSearchesList");
      container.innerHTML = data.searches
        .slice(0, 5)
        .map(
          (s) =>
            `<button class="popular-search-tag" data-query="${s.query}">${s.query} (${s.count})</button>`
        )
        .join("");

      document.getElementById("popularSearches").style.display = "block";

      // Click handler for popular searches
      document.querySelectorAll(".popular-search-tag").forEach((btn) => {
        btn.addEventListener("click", () => {
          searchQuery.value = btn.dataset.query;
          searchBtn.click();
        });
      });
    }
  } catch (error) {
    console.error("Failed to load popular searches:", error);
  }
}

async function loadPosts() {
  postsContainer.innerHTML = '<p class="loading">Loading posts...</p>';

  try {
    let endpoint = "/api/posts";
    const params = new URLSearchParams({ page: currentPage });

    if (currentSearchQuery) {
      endpoint = "/api/posts/search";
      params.append("q", currentSearchQuery);
    }

    if (currentLocation) {
      params.append("location", currentLocation);
    }

    if (currentCategory) {
      params.append("category", currentCategory);
    }

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      throw new Error("Failed to load posts");
    }

    const data = await response.json();

    displayPosts(data.posts);
    updatePagination(data.hasMore);

    // Show search results count
    if (currentSearchQuery) {
      const resultsText =
        data.posts.length === 0
          ? "No results found"
          : `Found ${data.posts.length} result${
              data.posts.length === 1 ? "" : "s"
            }`;
      postsContainer.insertAdjacentHTML(
        "beforebegin",
        `<p class="search-results-count">${resultsText} for "${currentSearchQuery}"</p>`
      );
    }
  } catch (error) {
    postsContainer.innerHTML = `
      <div class="error-message">
        <p>Failed to load posts. Please try again.</p>
      </div>
    `;
  }
}
loadLocationSuggestions();
loadPopularSearches();
