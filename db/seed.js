// seed.js - Comprehensive seed data for Crabiner
// Run with: node db/seed.js
// Required env: DATABASE_URL

import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Test users with Google-like IDs
const USERS = [
  {
    google_sub: "106701234567890123456",
    email: "alice@example.com",
    email_verified: true,
    name: "Alice Johnson",
    avatar_url: "https://i.pravatar.cc/150?img=1",
  },
  {
    google_sub: "106701234567890123457",
    email: "bob@example.com",
    email_verified: true,
    name: "Bob Smith",
    avatar_url: "https://i.pravatar.cc/150?img=2",
  },
  {
    google_sub: "106701234567890123458",
    email: "charlie@example.com",
    email_verified: true,
    name: "Charlie Davis",
    avatar_url: "https://i.pravatar.cc/150?img=3",
  },
  {
    google_sub: "106701234567890123459",
    email: "dana@example.com",
    email_verified: true,
    name: "Dana Wilson",
    avatar_url: "https://i.pravatar.cc/150?img=4",
  },
  {
    google_sub: "106701234567890123460",
    email: "eve@example.com",
    email_verified: false,
    name: "Eve Martinez",
    avatar_url: "https://i.pravatar.cc/150?img=5",
  },
];

const POST_TEMPLATES = [
  {
    title: "Coffee Shop Connection",
    body: "You were reading a book about space exploration at the coffee shop on Main St. We made eye contact a few times. I was too nervous to say hello, but I'd love to grab coffee and chat about the cosmos.",
  },
  {
    title: "Dog Park Regular",
    body: "Our dogs always play together at the park, but we never got past small talk. Your golden retriever is adorable, and so are you. Want to get coffee sometime?",
  },
  {
    title: "Bookstore Poetry Section",
    body: "We both reached for the same poetry collection last Tuesday. You have great taste in books. I'd love to discuss our favorite poems over tea.",
  },
  {
    title: "Farmers Market Smile",
    body: "You were buying fresh flowers at the farmers market. We exchanged smiles but I didn't get a chance to introduce myself. Same time next Saturday?",
  },
  {
    title: "Yoga Class Energy",
    body: "You're always on the mat next to mine in the Tuesday morning class. Your focus is inspiring. Would love to grab a smoothie after class sometime.",
  },
  {
    title: "Library Study Session",
    body: "We keep ending up at the same library table. You always have your headphones on and look so focused. Coffee break together?",
  },
  {
    title: "Concert Crowd",
    body: "We were both dancing near the front at the indie show last night. Your energy was magnetic! I lost you in the crowd but can't stop thinking about you.",
  },
  {
    title: "Train Platform",
    body: "We take the same train every morning. You always read on your phone. I'd love to know what you're reading. Maybe we could chat on the commute?",
  },
  {
    title: "Art Gallery Opening",
    body: "We stood in front of the same abstract painting for a while at the gallery opening. I wanted to ask what you thought of it. Dinner and art discussion?",
  },
  {
    title: "Climbing Gym Helper",
    body: "You helped me with that challenging route last week. Would love to climb together and maybe grab dinner after?",
  },
];

const REPLY_TEMPLATES = [
  "Hi! I think I remember you! I'd love to connect.",
  "This might be me! When exactly was this?",
  "I was there! Send me a message and let's chat!",
  "I remember this! Would love to reconnect.",
  "Hey! This sounds like it could be me. Tell me more?",
  "I think this was me! What were you wearing?",
  "Yes! I've been hoping to run into you again!",
  "This is so sweet! I'd love to meet up.",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  try {
    await client.connect();
    console.log("Connected to database");

    console.log("\n=== Creating users ===");
    const userIds = [];
    for (const user of USERS) {
      const result = await client.query(
        `INSERT INTO users (google_sub, email, email_verified, name, avatar_url, last_login)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${randomInt(0, 30)} days')
         RETURNING id`,
        [
          user.google_sub,
          user.email,
          user.email_verified,
          user.name,
          user.avatar_url,
        ]
      );
      userIds.push(result.rows[0].id);
      console.log(`  ✓ Created user: ${user.name} (${user.email})`);
    }

    console.log("\n=== Creating posts ===");
    const postIds = [];
    const now = new Date();

    // Create 15 posts with varying ages and expiration
    for (let i = 0; i < 15; i++) {
      const userId = randomFrom(userIds);
      const template = randomFrom(POST_TEMPLATES);

      // Posts created 0-7 days ago
      const daysAgo = randomInt(0, 7);
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - daysAgo);

      // Some posts expire in the past (should be marked expired)
      // Most expire in the future
      let expiresAt = new Date(now);
      if (i < 3) {
        // 3 expired posts
        expiresAt.setDate(expiresAt.getDate() - randomInt(1, 5));
      } else {
        // Rest expire 7-30 days from now
        expiresAt.setDate(expiresAt.getDate() + randomInt(7, 30));
      }

      const status = expiresAt < now ? "expired" : "active";

      const result = await client.query(
        `INSERT INTO posts (user_id, title, body, created_at, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userId, template.title, template.body, createdAt, expiresAt, status]
      );
      postIds.push({ id: result.rows[0].id, userId, status });
      console.log(`  ✓ Created post: ${template.title} (${status})`);
    }

    console.log("\n=== Creating replies ===");
    let replyCount = 0;
    let unreadCount = 0;

    // Create replies for active posts
    const activePosts = postIds.filter((p) => p.status === "active");
    for (const post of activePosts) {
      // Each post gets 0-3 replies
      const numReplies = randomInt(0, 3);

      for (let i = 0; i < numReplies; i++) {
        // Reply from a different user than the post author
        const fromUserId = randomFrom(
          userIds.filter((id) => id !== post.userId)
        );
        const body = randomFrom(REPLY_TEMPLATES);

        // 60% of replies are unread
        const isRead = Math.random() > 0.6;
        const readAt = isRead
          ? new Date(
              Date.now() - randomInt(1, 24 * 60 * 60 * 1000)
            ).toISOString()
          : null;

        await client.query(
          `INSERT INTO replies (post_id, from_user_id, to_user_id, body, created_at, read_at)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${randomInt(0, 48)} hours', $5)`,
          [post.id, fromUserId, post.userId, body, readAt]
        );

        replyCount++;
        if (!readAt) unreadCount++;
      }
    }
    console.log(`  ✓ Created ${replyCount} replies (${unreadCount} unread)`);

    console.log("\n=== Creating notifications ===");
    let notificationCount = 0;

    // Create a notification for each reply
    const replies = await client.query(
      `SELECT id, to_user_id, from_user_id, body, created_at
       FROM replies
       ORDER BY created_at DESC`
    );

    for (const reply of replies.rows) {
      // Get sender's name
      const sender = await client.query(
        `SELECT name FROM users WHERE id = $1`,
        [reply.from_user_id]
      );

      const title = "New Reply";
      const body = `${sender.rows[0].name} replied to your post`;

      // 70% of notifications are unread
      const isRead = Math.random() > 0.7;
      const readAt = isRead
        ? new Date(
            new Date(reply.created_at).getTime() +
              randomInt(1, 24 * 60 * 60 * 1000)
          ).toISOString()
        : null;

      await client.query(
        `INSERT INTO notifications (user_id, type, entity_id, title, body, created_at, read, read_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          reply.to_user_id,
          "new_reply",
          reply.id,
          title,
          body,
          reply.created_at,
          isRead,
          readAt,
        ]
      );

      notificationCount++;
    }
    console.log(`  ✓ Created ${notificationCount} notifications`);

    console.log("\n=== Seed Summary ===");
    console.log(`Users: ${USERS.length}`);
    console.log(`Posts: ${postIds.length} (${activePosts.length} active)`);
    console.log(`Replies: ${replyCount} (${unreadCount} unread)`);
    console.log(`Notifications: ${notificationCount}`);

    // Show inbox counts per user
    console.log("\n=== Inbox Unread Counts ===");
    const inboxCounts = await client.query(
      `SELECT u.name, u.email, COUNT(r.id) as unread_count
       FROM users u
       LEFT JOIN replies r ON r.to_user_id = u.id AND r.read_at IS NULL
       GROUP BY u.id, u.name, u.email
       ORDER BY unread_count DESC`
    );

    for (const row of inboxCounts.rows) {
      console.log(`  ${row.name}: ${row.unread_count} unread replies`);
    }

    await client.end();
    console.log("\n✓ Seed completed successfully!\n");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
