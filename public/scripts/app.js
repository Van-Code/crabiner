// State
let currentPage = 1;
let currentLocation = "";
let currentCityKey = "";
let currentCategory = "";
let currentSearchQuery = "";
let currentView = "list"; // 'list' or 'map'
let map = null;
let markers = [];
let allPosts = []; // Store posts for map view

// DOM Elements
const postsContainer = document.getElementById("posts");
const cityFilter = document.getElementById("cityFilter");
const categoryFilter = document.getElementById("categoryFilter");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const searchQuery = document.getElementById("searchQuery");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const listViewBtn = document.getElementById("listViewBtn");
const mapViewBtn = document.getElementById("mapViewBtn");
const mapView = document.getElementById("mapView");
const paginationEl = document.querySelector(".pagination");

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const cityParam = urlParams.get("cityKey");
  const viewParam = urlParams.get("view");

  if (cityParam) {
    currentCityKey = cityParam;
  }

  if (viewParam === "map") {
    currentView = "map";
    switchView("map");
  }

  // Populate city filter
  populateCityFilter();

  loadPosts();

  // View toggle buttons
  listViewBtn.addEventListener("click", () => {
    switchView("list");
    updateURL();
    loadPosts();
  });

  mapViewBtn.addEventListener("click", () => {
    switchView("map");
    updateURL();
    loadPostsForMap();
  });

  // Search button click
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      currentSearchQuery = searchQuery.value.trim();
      currentCityKey = cityFilter.value;
      currentCategory = categoryFilter.value;
      currentPage = 1;
      updateURL();

      if (currentView === "map") {
        loadPostsForMap();
      } else {
        loadPosts();
      }
    });
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchQuery.value = "";
      cityFilter.value = "";
      categoryFilter.value = "";
      currentSearchQuery = "";
      currentCityKey = "";
      currentCategory = "";
      currentPage = 1;
      updateURL();

      if (currentView === "map") {
        loadPostsForMap();
      } else {
        loadPosts();
      }
    });
  }

  // Enter key on search
  if (searchQuery) {
    searchQuery.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBtn.click();
      }
    });
  }

  // Pagination
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateURL();
        loadPosts();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      currentPage++;
      updateURL();
      loadPosts();
    });
  }
});

// Populate city filter dropdown
function populateCityFilter() {
  const citiesByRegion = getCitiesByRegion();

  Object.keys(citiesByRegion).forEach((region) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = region;

    citiesByRegion[region].forEach((city) => {
      const option = document.createElement("option");
      option.value = city.key;
      option.textContent = city.displayLabel;
      if (city.key === currentCityKey) {
        option.selected = true;
      }
      optgroup.appendChild(option);
    });

    cityFilter.appendChild(optgroup);
  });
}

// Switch between list and map view
function switchView(view) {
  currentView = view;

  if (view === "list") {
    listViewBtn.classList.add("active");
    mapViewBtn.classList.remove("active");
    postsContainer.style.display = "grid";
    paginationEl.style.display = "flex";
    mapView.style.display = "none";
  } else {
    mapViewBtn.classList.add("active");
    listViewBtn.classList.remove("active");
    postsContainer.style.display = "none";
    paginationEl.style.display = "none";
    mapView.style.display = "block";

    // Initialize map if not already initialized
    if (!map) {
      initMap();
    }
  }
}

// Initialize Leaflet map
function initMap() {
  // Default center (SF)
  map = L.map("mapView").setView([37.7749, -122.4194], 10);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Fix map rendering issues
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

// Load posts for map view (load all matching posts, not paginated)
async function loadPostsForMap() {
  try {
    let endpoint = "/api/posts";
    const baseParams = new URLSearchParams();

    if (currentSearchQuery) {
      endpoint = "/api/posts/search";
      baseParams.append("q", currentSearchQuery);
    }

    if (currentCityKey) {
      baseParams.append("cityKey", currentCityKey);
    }

    if (currentCategory) {
      baseParams.append("category", currentCategory);
    }

    let page = 1;
    let hasMore = true;
    const collected = [];

    while (hasMore) {
      const params = new URLSearchParams(baseParams);
      params.set("page", String(page));

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) {
        throw new Error("Failed to load posts for map view");
      }

      const data = await response.json();

      if (Array.isArray(data.posts)) {
        collected.push(...data.posts);
      }

      hasMore = Boolean(data.hasMore);
      page++;
    }

    allPosts = collected;
    displayPostsOnMap(allPosts);
  } catch (error) {
    console.error("Load posts error:", error);
    alert("Failed to load posts for map view");
  }
}

// Display posts as pins on map
function displayPostsOnMap(posts) {
  if (!map) {
    initMap();
  }

  // Clear existing markers
  markers.forEach((marker) => marker.remove());
  markers = [];

  if (posts.length === 0) {
    alert("No posts found for the selected filters");
    return;
  }

  // Add markers for each post
  const bounds = [];

  posts.forEach((post) => {
    const coords = getPostCoordinates(post);
    bounds.push([coords.lat, coords.lng]);

    const marker = L.marker([coords.lat, coords.lng]).addTo(map);

    // Create popup content
    const popupContent = createPopupContent(post);
    marker.bindPopup(popupContent);

    markers.push(marker);
  });

  // Fit map to show all markers
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Create popup content for a post
function createPopupContent(post) {
  const description =
    post.description.substring(0, 100) +
    (post.description.length > 100 ? "..." : "");

  return `
    <div class="post-popup">
      <h4>${escapeHtml(post.title)}</h4>
      <p><strong>Category:</strong> ${escapeHtml(post.category || "Other")}</p>
      <p>${escapeHtml(description)}</p>
      <a href="/view.html?id=${post.id}">View full post →</a>
    </div>
  `;
}

// Display posts in grid (list view)
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
  return `
    <div class="post-card" data-post-id="${post.id}">
      <h3 class="post-title">${escapeHtml(post.title)}</h3>
      <div class="post-location">
        <span class="location">📍 ${escapeHtml(post.location)}</span>
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

// Update URL with current filters
function updateURL() {
  const params = new URLSearchParams();

  if (currentView !== "list") {
    params.set("view", currentView);
  }

  if (currentCityKey) {
    params.set("cityKey", currentCityKey);
  }

  if (currentCategory) {
    params.set("category", currentCategory);
  }

  if (currentSearchQuery) {
    params.set("q", currentSearchQuery);
  }

  if (currentPage > 1 && currentView === "list") {
    params.set("page", currentPage);
  }

  const newUrl = params.toString()
    ? `?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
}

// Load city counts for sidebar
async function loadCityCounts() {
  try {
    // Fetch counts from API
    const response = await fetch("/api/posts/city-counts");
    const data = await response.json();

    // Create a map of city_key to count
    const countsMap = {};
    data.counts.forEach((c) => {
      countsMap[c.city_key] = parseInt(c.count);
    });

    // Merge with city data
    const citiesWithCounts = Object.values(CITIES).map((city) => ({
      cityKey: city.key,
      label: city.displayLabel,
      count: countsMap[city.key] || 0,
    }));

    // Display in sidebar
    const popularList = document.getElementById("popularLocationsList");
    const nonZeroCounts = citiesWithCounts.filter((c) => c.count > 0);

    if (nonZeroCounts.length === 0) {
      popularList.innerHTML =
        '<p style="font-size: 0.875rem; color: var(--text-light);">No posts yet</p>';
      return;
    }

    popularList.innerHTML = nonZeroCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(
        (c) =>
          `<button class="location-tag" data-city-key="${c.cityKey}">
        📍 ${c.label} (${c.count})
      </button>`
      )
      .join("");

    // Click handler
    document.querySelectorAll(".location-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        cityFilter.value = btn.dataset.cityKey;
        currentCityKey = btn.dataset.cityKey;
        currentPage = 1;
        updateURL();

        if (currentView === "map") {
          loadPostsForMap();
        } else {
          loadPosts();
        }
      });
    });
  } catch (error) {
    console.error("Failed to load city counts:", error);
    document.getElementById("popularLocationsList").innerHTML =
      '<p style="font-size: 0.875rem; color: var(--text-light);">Error loading cities</p>';
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

  // Remove previous search results count if it exists
  const existingCount = document.querySelector(".search-results-count");
  if (existingCount) {
    existingCount.remove();
  }

  try {
    let endpoint = "/api/posts";
    const params = new URLSearchParams({ page: currentPage });

    if (currentSearchQuery) {
      endpoint = "/api/posts/search";
      params.append("q", currentSearchQuery);
    }

    if (currentCityKey) {
      params.append("cityKey", currentCityKey);
    }

    if (currentCategory) {
      params.append("category", currentCategory);
    }

    const finalUrl = `${endpoint}?${params}`;

    const response = await fetch(finalUrl);

    if (!response.ok) {
      throw new Error("Failed to load posts");
    }

    const data = await response.json();

    displayPosts(data.posts);
    updatePagination(data.hasMore);

    // Show search results count
    if (currentSearchQuery || currentCityKey || currentCategory) {
      const filters = [];
      if (currentSearchQuery) filters.push(`"${currentSearchQuery}"`);
      if (currentCityKey) {
        const city = getCityByKey(currentCityKey);
        filters.push(`city: ${city ? city.label : currentCityKey}`);
      }
      if (currentCategory) filters.push(`category: ${currentCategory}`);

      const resultsText =
        data.posts.length === 0
          ? "No results found"
          : `Found ${data.posts.length} result${
              data.posts.length === 1 ? "" : "s"
            }`;

      const countElement = document.createElement("p");
      countElement.className = "search-results-count";
      countElement.textContent = `${resultsText} for ${filters.join(", ")}`;

      postsContainer.parentElement.insertBefore(countElement, postsContainer);
    }
  } catch (error) {
    console.error("Load posts error:", error);
    postsContainer.innerHTML = `
      <div class="error-message">
        <p>Failed to load posts. Please try again.</p>
      </div>
    `;
  }
}

loadCityCounts();
loadPopularSearches();
