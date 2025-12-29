// Mobile browse page functionality
(function() {
  const filterToggle = document.getElementById('filterToggle');
  const filtersSection = document.getElementById('filtersSection');
  const footerToggle = document.getElementById('footerToggle');
  const footerContent = document.getElementById('footerContent');

  // Toggle filters on mobile
  if (filterToggle && filtersSection) {
    filterToggle.addEventListener('click', function() {
      filterToggle.classList.toggle('open');
      filtersSection.classList.toggle('open');
    });
  }

  // Toggle footer menu on mobile
  if (footerToggle && footerContent) {
    footerToggle.addEventListener('click', function() {
      footerToggle.classList.toggle('open');
      footerContent.classList.toggle('open');
    });
  }

  // Populate mobile city list (called from loadCityCounts in app.js)
  window.populateMobileCityList = function(citiesWithCounts) {
    const mobileList = document.getElementById('mobileLocationsList');
    if (!mobileList) return;

    const nonZeroCounts = citiesWithCounts.filter((c) => c.count > 0);

    if (nonZeroCounts.length === 0) {
      mobileList.innerHTML =
        '<p style="font-size: 0.875rem; color: var(--text-light);">No posts yet</p>';
      return;
    }

    mobileList.innerHTML = nonZeroCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(
        (c) =>
          `<button class="location-tag" data-city-key="${c.cityKey}">
        📍 ${c.label} (${c.count})
      </button>`
      )
      .join("");

    // Click handler for mobile location tags
    mobileList.querySelectorAll('.location-tag').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cityFilter = document.getElementById('cityFilter');
        if (cityFilter) {
          cityFilter.value = btn.dataset.cityKey;

          // Trigger the search/filter update
          // This needs to integrate with the existing app.js logic
          if (window.handleCityFilterChange) {
            window.handleCityFilterChange(btn.dataset.cityKey);
          }

          // Close the footer menu after selection
          footerToggle.classList.remove('open');
          footerContent.classList.remove('open');
        }
      });
    });
  };
})();
