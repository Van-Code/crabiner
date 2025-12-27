// Test file for posts functionality
// Run with: node tests/posts.test.js

import pkg from "pg";
const { Client } = pkg;
import assert from "assert";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

let testPostIds = [];

async function setup() {
  await client.connect();
  console.log("✓ Connected to database");
}

async function cleanup() {
  // Delete test posts
  for (const id of testPostIds) {
    await client.query("DELETE FROM posts WHERE id = $1", [id]);
  }
  await client.end();
  console.log("✓ Cleaned up test data");
}

// Test 1: Verify city counts query returns non-zero when posts exist
async function testCityCountsNonZero() {
  console.log("\n[TEST 1] City counts returns non-zero for existing posts");

  // Create a test post with city_key = 'sf'
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const tokenHash = await bcrypt.hash(nanoid(32), 10);
  const sessionToken = nanoid(32);

  const result = await client.query(
    `INSERT INTO posts
     (location, category, title, description, posted_at, expires_at,
      management_token_hash, session_token, is_deleted, city_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
     RETURNING id`,
    [
      "San Francisco, CA",
      "coffee-shop",
      "Test Post",
      "This is a test post for city counts",
      now,
      expiresAt,
      tokenHash,
      sessionToken,
      "sf",
    ]
  );

  testPostIds.push(result.rows[0].id);

  // Query city counts
  const countsResult = await client.query(
    `SELECT city_key, COUNT(*) as count
     FROM posts
     WHERE is_deleted = FALSE
       AND expires_at > NOW()
       AND city_key = 'sf'
     GROUP BY city_key`
  );

  assert(countsResult.rows.length > 0, "Should return at least one city");
  assert(countsResult.rows[0].city_key === "sf", "Should return SF city");
  assert(parseInt(countsResult.rows[0].count) > 0, "Count should be greater than 0");

  console.log("✓ PASSED: City counts returns non-zero for SF:", countsResult.rows[0].count);
}

// Test 2: Verify expired posts are excluded from counts
async function testExpiredPostsExcluded() {
  console.log("\n[TEST 2] Expired posts are excluded from counts");

  // Create an expired post
  const now = new Date();
  const expiredDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
  const tokenHash = await bcrypt.hash(nanoid(32), 10);
  const sessionToken = nanoid(32);

  const result = await client.query(
    `INSERT INTO posts
     (location, category, title, description, posted_at, expires_at,
      management_token_hash, session_token, is_deleted, city_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
     RETURNING id`,
    [
      "Oakland, CA",
      "bar",
      "Expired Test Post",
      "This is an expired test post",
      expiredDate,
      expiredDate,
      tokenHash,
      sessionToken,
      "oakland",
    ]
  );

  testPostIds.push(result.rows[0].id);

  // Query counts for oakland (should not include expired)
  const countsResult = await client.query(
    `SELECT city_key, COUNT(*) as count
     FROM posts
     WHERE is_deleted = FALSE
       AND expires_at > NOW()
       AND city_key = 'oakland'
     GROUP BY city_key`
  );

  // The count should not include the expired post
  // If there are no other oakland posts, the result should be empty
  if (countsResult.rows.length > 0) {
    const oaklandCount = parseInt(countsResult.rows[0].count);
    // Verify that the expired post is not in the count by checking it directly
    const allOaklandPosts = await client.query(
      `SELECT id FROM posts WHERE city_key = 'oakland' AND is_deleted = FALSE`
    );
    const activeOaklandPosts = await client.query(
      `SELECT id FROM posts WHERE city_key = 'oakland' AND is_deleted = FALSE AND expires_at > NOW()`
    );

    assert(
      activeOaklandPosts.rows.length < allOaklandPosts.rows.length ||
        (activeOaklandPosts.rows.length === 0 && allOaklandPosts.rows.length > 0),
      "Expired posts should not be counted in active posts"
    );
  }

  console.log("✓ PASSED: Expired posts are excluded from counts");
}

// Test 3: Verify deleted posts are excluded from counts
async function testDeletedPostsExcluded() {
  console.log("\n[TEST 3] Deleted posts are excluded from counts");

  // Create a post and mark it as deleted
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tokenHash = await bcrypt.hash(nanoid(32), 10);
  const sessionToken = nanoid(32);

  const result = await client.query(
    `INSERT INTO posts
     (location, category, title, description, posted_at, expires_at,
      management_token_hash, session_token, is_deleted, city_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
     RETURNING id`,
    [
      "Berkeley, CA",
      "event",
      "Deleted Test Post",
      "This is a deleted test post",
      now,
      expiresAt,
      tokenHash,
      sessionToken,
      "berkeley",
    ]
  );

  testPostIds.push(result.rows[0].id);

  // Query counts for berkeley (should not include deleted)
  const countsResult = await client.query(
    `SELECT city_key, COUNT(*) as count
     FROM posts
     WHERE is_deleted = FALSE
       AND expires_at > NOW()
       AND city_key = 'berkeley'
     GROUP BY city_key`
  );

  // Verify the deleted post is not counted
  const allBerkeleyPosts = await client.query(
    `SELECT id FROM posts WHERE city_key = 'berkeley'`
  );
  const activeBerkeleyPosts = await client.query(
    `SELECT id FROM posts WHERE city_key = 'berkeley' AND is_deleted = FALSE AND expires_at > NOW()`
  );

  assert(
    activeBerkeleyPosts.rows.length < allBerkeleyPosts.rows.length ||
      (activeBerkeleyPosts.rows.length === 0 && allBerkeleyPosts.rows.length > 0),
    "Deleted posts should not be counted"
  );

  console.log("✓ PASSED: Deleted posts are excluded from counts");
}

// Test 4: Verify browse filter by city_key returns only matching posts
async function testBrowseFilterByCityKey() {
  console.log("\n[TEST 4] Browse filter by city_key returns only matching posts");

  // Create posts for different cities
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tokenHash1 = await bcrypt.hash(nanoid(32), 10);
  const tokenHash2 = await bcrypt.hash(nanoid(32), 10);
  const sessionToken1 = nanoid(32);
  const sessionToken2 = nanoid(32);

  const sfPost = await client.query(
    `INSERT INTO posts
     (location, category, title, description, posted_at, expires_at,
      management_token_hash, session_token, is_deleted, city_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
     RETURNING id`,
    [
      "San Francisco, CA",
      "coffee-shop",
      "SF Test Post",
      "San Francisco test post",
      now,
      expiresAt,
      tokenHash1,
      sessionToken1,
      "sf",
    ]
  );

  const oaklandPost = await client.query(
    `INSERT INTO posts
     (location, category, title, description, posted_at, expires_at,
      management_token_hash, session_token, is_deleted, city_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
     RETURNING id`,
    [
      "Oakland, CA",
      "bar",
      "Oakland Test Post",
      "Oakland test post",
      now,
      expiresAt,
      tokenHash2,
      sessionToken2,
      "oakland",
    ]
  );

  testPostIds.push(sfPost.rows[0].id, oaklandPost.rows[0].id);

  // Query posts filtered by city_key = 'sf'
  const sfPosts = await client.query(
    `SELECT id, city_key, title
     FROM posts
     WHERE is_deleted = FALSE
       AND expires_at > NOW()
       AND city_key = 'sf'`
  );

  // Verify all returned posts are for SF
  sfPosts.rows.forEach(post => {
    assert(post.city_key === "sf", `Post ${post.id} should be for SF but is ${post.city_key}`);
  });

  // Verify the Oakland post is not in the results
  const oaklandInResults = sfPosts.rows.find(p => p.id === oaklandPost.rows[0].id);
  assert(!oaklandInResults, "Oakland post should not be in SF results");

  console.log("✓ PASSED: Browse filter returns only matching city posts");
}

// Test 5: Test deterministic jitter function
async function testDeterministicJitter() {
  console.log("\n[TEST 5] Deterministic jitter generates consistent coordinates");

  // Import the jitter function (we'll simulate it here)
  function generatePinJitter(postId) {
    let hash = 0;
    for (let i = 0; i < postId.length; i++) {
      const char = postId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const seed1 = Math.abs(hash);
    const seed2 = Math.abs(hash >> 16);

    const latOffset = ((seed1 % 2000) / 100000) - 0.01;
    const lngOffset = ((seed2 % 2000) / 100000) - 0.01;

    return { latOffset, lngOffset };
  }

  const testPostId = "test-post-id-12345";
  const jitter1 = generatePinJitter(testPostId);
  const jitter2 = generatePinJitter(testPostId);

  assert(jitter1.latOffset === jitter2.latOffset, "Lat offset should be deterministic");
  assert(jitter1.lngOffset === jitter2.lngOffset, "Lng offset should be deterministic");

  // Verify jitter is within expected range
  assert(Math.abs(jitter1.latOffset) <= 0.01, "Lat offset should be within +/- 0.01");
  assert(Math.abs(jitter1.lngOffset) <= 0.01, "Lng offset should be within +/- 0.01");

  console.log("✓ PASSED: Jitter function is deterministic and within range");
}

// Run all tests
async function runTests() {
  console.log("=== Running Crabiner Posts Tests ===\n");

  try {
    await setup();

    await testCityCountsNonZero();
    await testExpiredPostsExcluded();
    await testDeletedPostsExcluded();
    await testBrowseFilterByCityKey();
    await testDeterministicJitter();

    await cleanup();

    console.log("\n=== All Tests PASSED ✓ ===\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ TEST FAILED:", error.message);
    console.error(error.stack);

    await cleanup().catch(console.error);
    process.exit(1);
  }
}

runTests();
