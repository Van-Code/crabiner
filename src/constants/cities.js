// City and region constants for Crabiner
// Used for location selection and filtering

export const CITIES = {
  // SF Bay Area
  sf: {
    key: 'sf',
    label: 'San Francisco',
    region: 'SF Bay Area',
    state: 'CA',
    displayLabel: 'San Francisco, CA',
    lat: 37.7749,
    lng: -122.4194,
  },
  oakland: {
    key: 'oakland',
    label: 'Oakland',
    region: 'East Bay',
    state: 'CA',
    displayLabel: 'Oakland, CA',
    lat: 37.8044,
    lng: -122.2712,
  },
  berkeley: {
    key: 'berkeley',
    label: 'Berkeley',
    region: 'East Bay',
    state: 'CA',
    displayLabel: 'Berkeley, CA',
    lat: 37.8715,
    lng: -122.2730,
  },
  sanjose: {
    key: 'sanjose',
    label: 'San Jose',
    region: 'SF Bay Area',
    state: 'CA',
    displayLabel: 'San Jose, CA',
    lat: 37.3382,
    lng: -121.8863,
  },
  alameda: {
    key: 'alameda',
    label: 'Alameda',
    region: 'East Bay',
    state: 'CA',
    displayLabel: 'Alameda, CA',
    lat: 37.7652,
    lng: -122.2416,
  },
  walnutcreek: {
    key: 'walnutcreek',
    label: 'Walnut Creek',
    region: 'East Bay',
    state: 'CA',
    displayLabel: 'Walnut Creek, CA',
    lat: 37.9101,
    lng: -122.0652,
  },

  // New York
  manhattan: {
    key: 'manhattan',
    label: 'Manhattan',
    region: 'New York',
    state: 'NY',
    displayLabel: 'Manhattan, NY',
    lat: 40.7831,
    lng: -73.9712,
  },
  brooklyn: {
    key: 'brooklyn',
    label: 'Brooklyn',
    region: 'New York',
    state: 'NY',
    displayLabel: 'Brooklyn, NY',
    lat: 40.6782,
    lng: -73.9442,
  },
  queens: {
    key: 'queens',
    label: 'Queens',
    region: 'New York',
    state: 'NY',
    displayLabel: 'Queens, NY',
    lat: 40.7282,
    lng: -73.7949,
  },
  jerseycity: {
    key: 'jerseycity',
    label: 'Jersey City',
    region: 'New York',
    state: 'NJ',
    displayLabel: 'Jersey City, NJ',
    lat: 40.7178,
    lng: -74.0431,
  },

  // Portland
  portland: {
    key: 'portland',
    label: 'Portland',
    region: 'Portland',
    state: 'OR',
    displayLabel: 'Portland, OR',
    lat: 45.5152,
    lng: -122.6784,
  },
  beaverton: {
    key: 'beaverton',
    label: 'Beaverton',
    region: 'Portland',
    state: 'OR',
    displayLabel: 'Beaverton, OR',
    lat: 45.4871,
    lng: -122.8037,
  },
  gresham: {
    key: 'gresham',
    label: 'Gresham',
    region: 'Portland',
    state: 'OR',
    displayLabel: 'Gresham, OR',
    lat: 45.4984,
    lng: -122.4318,
  },
  vancouverwa: {
    key: 'vancouverwa',
    label: 'Vancouver WA',
    region: 'Portland',
    state: 'WA',
    displayLabel: 'Vancouver, WA',
    lat: 45.6387,
    lng: -122.6615,
  },
};

// Get all unique regions
export const REGIONS = [...new Set(Object.values(CITIES).map(city => city.region))];

// Get cities grouped by region
export function getCitiesByRegion() {
  const grouped = {};

  Object.values(CITIES).forEach(city => {
    if (!grouped[city.region]) {
      grouped[city.region] = [];
    }
    grouped[city.region].push(city);
  });

  return grouped;
}

// Get city by key
export function getCityByKey(key) {
  return CITIES[key] || null;
}

// Get all city keys
export function getAllCityKeys() {
  return Object.keys(CITIES);
}

// Validate city key
export function isValidCityKey(key) {
  return key in CITIES;
}

// Generate deterministic jitter for map pins
// Uses a simple hash of the post ID to generate consistent x/y offsets
export function generatePinJitter(postId) {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    const char = postId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use hash to generate offsets in range [-0.01, 0.01] degrees
  // This is roughly 1km max offset in any direction
  const seed1 = Math.abs(hash);
  const seed2 = Math.abs(hash >> 16);

  const latOffset = ((seed1 % 2000) / 100000) - 0.01;
  const lngOffset = ((seed2 % 2000) / 100000) - 0.01;

  return { latOffset, lngOffset };
}

// Get jittered coordinates for a post
export function getPostCoordinates(post) {
  const city = getCityByKey(post.city_key);
  if (!city) {
    // Default to SF if city not found
    return { lat: 37.7749, lng: -122.4194 };
  }

  const jitter = generatePinJitter(post.id);
  return {
    lat: city.lat + jitter.latOffset,
    lng: city.lng + jitter.lngOffset,
  };
}
