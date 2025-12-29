# Crabiner - List/Map View and City Selector Deployment Guide

This guide covers the deployment of the new List/Map view toggle and city-based location selector features.

## Features Added

1. **List/Map Toggle on Browse Page**

   - Toggle between List and Map view with buttons
   - View preference persisted in URL query string (`?view=list` or `?view=map`)
   - Default view is List

2. **Interactive Map View**

   - Uses Leaflet.js with OpenStreetMap tiles
   - Displays posts as pins with deterministic jittering based on post ID
   - Hoverable tooltips showing post title, description snippet, and link
   - Auto-fits map bounds to show all pins

3. **City Selector (Craigslist-style)**

   - Replaced free-text location input with structured city selector
   - Predefined cities grouped by region:
     - SF Bay Area: San Francisco, Oakland, Berkeley, San Jose
     - East Bay: Oakland, Berkeley, Alameda, Walnut Creek
     - New York: Manhattan, Brooklyn, Queens, Jersey City
     - Portland: Portland, Beaverton, Gresham, Vancouver WA
   - Backend validation of city keys
   - Both create and browse flows updated

4. **Fixed Browse Counts by Location**
   - New `/api/posts/city-counts` endpoint
   - Returns accurate counts of non-deleted, non-expired posts by city
   - Counts display in sidebar "Browse by city" section
   - Filters properly exclude `is_deleted = true` and `expires_at <= NOW()`

## Database Changes

### Migration

Run the migration to add the `city_key` column:

```bash
psql $DATABASE_URL -f db/migrations/001_add_city_key.sql
```

This migration:

- Adds `city_key` VARCHAR(50) column to posts table
- Creates index on `city_key` for efficient filtering
- Backfills existing posts with city keys based on location text
- Defaults remaining posts to 'sf'

## Seeding Data

To populate the database with test posts using the new city structure:

```bash
node seed_posts.js
```

This will:

- Create 50 test posts distributed across all cities
- Each post assigned a random city from the predefined list
- Display summary of posts by city

## Running Tests

All tests can be run with:

```bash
node tests/posts.test.js
```

### Test Coverage

1. **testCityCountsNonZero**: Verifies count queries return non-zero when posts exist
2. **testExpiredPostsExcluded**: Ensures expired posts are excluded from counts
3. **testDeletedPostsExcluded**: Ensures deleted posts are excluded from counts
4. **testBrowseFilterByCityKey**: Verifies city filtering returns only matching posts
5. **testDeterministicJitter**: Confirms map pin jitter is consistent for same post ID

Expected output:

```
=== Running Crabiner Posts Tests ===

✓ Connected to database

[TEST 1] City counts returns non-zero for existing posts
✓ PASSED: City counts returns non-zero for SF: 5

[TEST 2] Expired posts are excluded from counts
✓ PASSED: Expired posts are excluded from counts

[TEST 3] Deleted posts are excluded from counts
✓ PASSED: Deleted posts are excluded from counts

[TEST 4] Browse filter by city_key returns only matching posts
✓ PASSED: Browse filter returns only matching city posts

[TEST 5] Deterministic jitter generates consistent coordinates
✓ PASSED: Jitter function is deterministic and within range

✓ Cleaned up test data

=== All Tests PASSED ✓ ===
```

## New Dependencies

No new npm packages required. Using CDN for Leaflet:

- Leaflet 1.9.4 (CSS and JS loaded from unpkg.com CDN)

## API Changes

### New Endpoint

**GET /api/posts/city-counts**

- Returns count of active posts grouped by city_key
- Response format:
  ```json
  {
    "counts": [
      { "city_key": "sf", "count": "15" },
      { "city_key": "oakland", "count": "8" }
    ]
  }
  ```

### Modified Endpoints

**POST /api/posts**

- Now accepts `cityKey` field (optional)
- Example:
  ```json
  {
    "cityKey": "sf",
    "location": "San Francisco, CA",
    "title": "Coffee Shop Connection",
    "description": "...",
    "expiresInDays": 14
  }
  ```

**GET /api/posts**
**GET /api/posts/search**

- Now accept `cityKey` query parameter for filtering
- Examples:
  - `/api/posts?cityKey=sf`
  - `/api/posts/search?q=coffee&cityKey=oakland`

## Files Changed

### Database

- `db/migrations/001_add_city_key.sql` - Migration for city_key column
- `seed_posts.js` - Updated to use city mappings

### Backend

- `src/constants/cities.js` - New city constants and utilities
- `src/services/postService.js` - Updated to handle city_key filtering
- `src/routes/posts.js` - Added city-counts endpoint, validation

### Frontend

- `public/browse.html` - Added map view container, city filter, view toggle
- `public/post.html` - Replaced location input with city selector
- `public/scripts/cities.js` - Client-side city constants and utilities
- `public/scripts/app.js` - Map view logic, city filtering, counts
- `public/scripts/post.js` - City selector population

### Tests

- `tests/posts.test.js` - New test suite for city filtering and counts

## Testing the Features

### 1. Test Create Post with City Selector

- Navigate to `/post.html`
- Verify city selector shows cities grouped by region
- Create a post selecting "San Francisco, CA"
- Verify post is created successfully

### 2. Test Browse List View

- Navigate to `/browse.html`
- Verify "Browse by city" sidebar shows counts for cities with posts
- Click a city in sidebar - verify filter applies
- Verify count numbers are non-zero and accurate

### 3. Test Browse Map View

- Click "Map" button on browse page
- Verify map loads with OpenStreetMap tiles
- Verify pins appear for posts
- Click a pin - verify tooltip shows post details
- Click "View full post" link - verify navigation works

### 4. Test City Filtering

- Select a city from the city dropdown filter
- Click Search
- Verify only posts from that city appear
- Test in both List and Map views

### 5. Test View Toggle Persistence

- Switch to Map view
- Note URL changes to `?view=map`
- Refresh page
- Verify Map view persists

## Rollback Plan

If issues arise, rollback can be performed:

1. **Database rollback**:

   ```sql
   DROP INDEX IF EXISTS idx_posts_city_key;
   ALTER TABLE posts DROP COLUMN IF EXISTS city_key;
   ```

2. **Code rollback**: Revert to previous git commit before this feature

3. **No breaking changes**: Old posts without city_key will still display using the `location` field

## Monitoring

After deployment, monitor:

1. API response times for `/api/posts/city-counts` endpoint
2. Map load times and tile load failures
3. Error logs for invalid city_key values
4. User engagement with Map vs List view

## Notes

- Old posts created before this feature will have city_key populated by the migration
- The location field is kept for backward compatibility
- Map pins use deterministic jitter (±1km) to prevent exact overlap
- Jitter is based on hash of post ID so same post always appears in same spot
- No authentication changes - map view respects same privacy controls as list view
