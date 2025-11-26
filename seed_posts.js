// seed_posts.js
// Run with: node seed_posts.js

import pkg from "pg";
const { Client } = pkg;
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const locations = [
  "The Castro, SF",
  "Mission District, SF",
  "Dolores Park, SF",
  "Oakland Lake Merritt",
  "Berkeley Telegraph Ave",
  "North Beach Cafe",
  "Hayes Valley",
  "Haight-Ashbury",
  "Cole Valley Coffee",
  "Inner Sunset",
  "Richmond District",
  "Golden Gate Park",
  "Bernal Heights",
  "Noe Valley",
  "Potrero Hill",
  "SOMA",
  "Financial District BART",
  "Powell Street Station",
  "Ferry Building",
  "Alamo Square",
];

const categories = [
  "coffee-shop",
  "transit",
  "bar",
  "bookstore",
  "gym",
  "event",
  "other",
];

const descriptions = [
  "You were reading a book about queer history. You had short blue hair and round glasses. I was too nervous to say hello but I wish I had.",
  "We made eye contact three times on the train. You were wearing a flannel shirt and had rainbow pins on your backpack. I got off at the wrong stop hoping to see you again.",
  "You were dancing near the front at the concert last night. Your energy was magnetic. I caught your smile a few times but lost you in the crowd.",
  'We both reached for the same book at the same time. You laughed and said "great taste." I should have asked for your number.',
  "You were walking your golden retriever and stopped to let me pet them. We talked for a few minutes about our dogs. I forgot to introduce myself.",
  "Sat next to each other at the poetry reading. You had the most beautiful laugh. I was too shy to talk to you after.",
  "We were in line together and bonded over how long the wait was. You had kind eyes and we talked about our favorite movies.",
  "You were sketching in your notebook at the park. I wanted to ask what you were drawing but didn't want to interrupt.",
  "We bumped into each other in the doorway and both apologized way too many times. Your smile made my day.",
  "You were the barista with the tattoo sleeve. We talked about music while you made my coffee. I come back every day hoping to see you.",
  "Yoga class last Tuesday. You were on the mat next to mine. Loved your energy and confidence.",
  "We were both browsing the poetry section. You recommended a book and it changed my life. Would love to talk more about books.",
  "Pride parade last weekend. We danced together for a while and then I lost you. Purple hair, wearing a mesh top.",
  "You held the door for me even though you were juggling coffee and a laptop. Such a small gesture but it meant so much.",
  "We matched on an app but I accidentally unmatched. You were studying engineering and loved hiking. Please find me!",
  "Game night at the bar. We were on the same trivia team. Your knowledge of 90s music was impressive.",
  "You were reading at the window seat. The afternoon light hit you perfectly. I was too captivated to look away.",
  "Farmers market on Sunday. We reached for the same bunch of flowers and laughed. You were wearing overalls.",
  "You complimented my shirt and we ended up talking about our favorite bands for 20 minutes. Kicked myself for not asking for your number.",
  "Movie theater last Friday. We were the only two people who stayed for the post-credits scene. We should watch movies together.",
  "You were running with your dog along the Embarcadero. We said hi as you passed. Your dog was adorable and so were you.",
  "Bookstore poetry section. You recommended Mary Oliver and we talked about favorite poems. I think about that conversation a lot.",
  "Coffee shop regular with the laptop covered in stickers. We always seem to be there at the same time. Want to actually talk?",
  "We were both at the drag show and kept catching each other's eye. You were wearing a leather jacket.",
  "Rock climbing gym. You helped me with a route I was struggling with. Would love to climb together sometime.",
  "Library study session. We kept making eye contact over our books. You have the most focused expression when you read.",
  "You were walking your husky in the rain. We laughed about how much our dogs love bad weather.",
  "Late night diner. We were at adjacent booths and you recommended your favorite menu item. It was delicious.",
  "Waiting for the bus together. We talked about how unreliable the schedule is. Made the wait bearable.",
  "You were playing guitar in the park. I stopped to listen and we talked about music. Your voice is beautiful.",
  "Grocery store, frozen food aisle. We both reached for the last pint of vegan ice cream. You let me have it with a smile.",
  "Art gallery opening. We stood in front of the same painting for a while. I wanted to ask what you thought of it.",
  "You were the DJ at the bar. Loved your music choices. Wanted to request a song but got too nervous.",
  "Beach bonfire last weekend. We talked about astrology and made s'mores. I can't stop thinking about you.",
  "Thrift store, vinyl section. You were flipping through records and we bonded over our music taste.",
  "You gave an amazing presentation at the conference. I wanted to introduce myself but you were surrounded by people.",
  "Karaoke night. You sang my favorite song perfectly. I was too shy to go up after you.",
  "We were both at the cat cafe. You were gentle with all the cats and it was adorable.",
  "Bike ride along the Embarcadero. We biked at the same pace for a while and exchanged smiles.",
  "Food truck line. We talked about our favorite foods and laughed about how long the wait was.",
  "You were painting at the lookout point. I wanted to see your work but didn't want to disturb you.",
  "Community garden. We were both tending our plots. You gave me advice about growing tomatoes.",
  "Vintage clothing store. You have amazing style. We talked about fashion and I left wanting to know more about you.",
  "Open mic night. Your poem was powerful and moving. I wanted to tell you in person.",
  "Dog park regular. Our dogs are best friends. We should be friends too.",
  "Meditation class. You have such a calming presence. Would love to grab tea and talk.",
  "You were journaling at the cafe. Looked so peaceful and focused. Didn't want to interrupt but wanted to say hi.",
  "Street fair last month. We both stopped at the same jewelry booth. You have great taste.",
  "Early morning runner on Church. We've passed each other on the same route for weeks. Wave next time?",
  "You were reading tarot cards at Cafe Con Leche. Got a reading from you and it was spot on. Want to know more about you.",
];

async function generatePosts() {
  try {
    await client.connect();
    console.log("Connected to database");

    const posts = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      // Random date within last 14 days
      const daysAgo = Math.floor(Math.random() * 3);
      const postedAt = new Date(now);
      postedAt.setDate(postedAt.getDate() - daysAgo);
      postedAt.setMinutes(0, 0, 0); // Round to hour

      // Expires 7-30 days from posted date
      const expireDays = 7 + Math.floor(Math.random() * 24);
      // Expires 7-30 days from TODAY (not from posted date)
      const expiresAt = new Date(); // Use current date
      expiresAt.setDate(
        expiresAt.getDate() + (7 + Math.floor(Math.random() * 24))
      );

      const location = locations[Math.floor(Math.random() * locations.length)];
      const category =
        categories[Math.floor(Math.random() * categories.length)];
      const description =
        descriptions[Math.floor(Math.random() * descriptions.length)];

      const managementToken = nanoid(32);
      const tokenHash = await bcrypt.hash(managementToken, 10);
      const sessionToken = nanoid(32);

      posts.push({
        location,
        category,
        description,
        postedAt,
        expiresAt,
        tokenHash,
        sessionToken,
      });
    }

    console.log(`\nInserting ${posts.length} posts...`);

    for (const post of posts) {
      await client.query(
        `INSERT INTO posts 
         (location, category, description, posted_at, expires_at, 
          management_token_hash, session_token, is_deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
        [
          post.location,
          post.category,
          post.description,
          post.postedAt,
          post.expiresAt,
          post.tokenHash,
          post.sessionToken,
        ]
      );
    }

    console.log("✓ Successfully seeded 50 posts!");

    // Show summary
    const result = await client.query(`
      SELECT category, COUNT(*) 
      FROM posts 
      WHERE is_deleted = FALSE
      GROUP BY category
      ORDER BY COUNT(*) DESC
    `);

    console.log("\nPosts by category:");
    result.rows.forEach((row) => {
      console.log(`  ${row.category}: ${row.count}`);
    });

    const total = await client.query(`
      SELECT COUNT(*) FROM posts WHERE is_deleted = FALSE
    `);
    console.log(`\nTotal active posts: ${total.rows[0].count}`);

    await client.end();
    console.log("\n✓ Done!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

generatePosts();
