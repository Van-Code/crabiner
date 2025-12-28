// seed_posts.js
// Run with: node seed_posts.js
// Required env: DATABASE_URL
// Optional env: RELAY_EMAIL_DOMAIN (default: "relay.crabiner.test")

import pkg from "pg";
const { Client } = pkg;
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const TEST_USERS = [
  "thiswell@gmail.com",
  "van.acxiom@gmail.com",
  "wolfandreedconsulting@gmail.com",
];

const RELAY_EMAIL_DOMAIN =
  process.env.RELAY_EMAIL_DOMAIN || "relay.crabiner.test";

// City keys mapping
const cityMappings = [
  { key: "sf", label: "San Francisco, CA" },
  { key: "oakland", label: "Oakland, CA" },
  { key: "berkeley", label: "Berkeley, CA" },
  { key: "sanjose", label: "San Jose, CA" },
  { key: "alameda", label: "Alameda, CA" },
  { key: "walnutcreek", label: "Walnut Creek, CA" },
  { key: "manhattan", label: "Manhattan, NY" },
  { key: "brooklyn", label: "Brooklyn, NY" },
  { key: "queens", label: "Queens, NY" },
  { key: "jerseycity", label: "Jersey City, NJ" },
  { key: "portland", label: "Portland, OR" },
  { key: "beaverton", label: "Beaverton, OR" },
  { key: "gresham", label: "Gresham, OR" },
  { key: "vancouverwa", label: "Vancouver, WA" },
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

const titles = [
  "Blue Hair and Queer History",
  "Wrong Stop on Purpose",
  "Lost in the Crowd",
  "Same Book, Same Moment",
  "Golden Retriever Hello",
  "Poetry Reading Laugh",
  "Long Line Conversation",
  "Sketchbook at the Park",
  "Too Many Apologies",
  "Tattoo Sleeve Barista",
  "Yoga Class Energy",
  "Poetry Section Recommendation",
  "Purple Hair at Pride",
  "Holding the Door",
  "Accidental Unmatch",
  "Trivia Team Magic",
  "Window Seat Light",
  "Flowers at the Market",
  "Complimented My Shirt",
  "Stayed for the Credits",
  "Embarcadero Run",
  "Mary Oliver Moment",
  "Sticker Covered Laptop",
  "Eye Contact at the Drag Show",
  "Climbing Route Help",
  "Library Eye Contact",
  "Huskies in the Rain",
  "Late Night Diner Tip",
  "Bus Stop Bonding",
  "Guitar in the Park",
  "Last Vegan Ice Cream",
  "Same Painting",
  "DJ at the Bar",
  "S'mores and Astrology",
  "Vinyl Section Connection",
  "After Your Presentation",
  "Karaoke Perfection",
  "Cat Cafe Cutie",
  "Biking Side by Side",
  "Food Truck Line Laughs",
  "Painting at the Lookout",
  "Tomato Garden Advice",
  "Vintage Store Style",
  "Open Mic Poem",
  "Dog Park Regular",
  "Meditation Calm",
  "Journaling at the Cafe",
  "Jewelry Booth Encounter",
  "Morning Runner on Church",
  "Tarot at Cafe Con Leche",
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

// Replace this with your real encryption if needed
function encryptEmailForDev(email) {
  // For dev seeding only. If your app decrypts, this must match its encryption scheme.
  return email;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generatePosts() {
  try {
    await client.connect();
    console.log("Connected to database");

    const now = new Date();
    const posts = [];

    for (let i = 0; i < 50; i++) {
      const ownerEmail = TEST_USERS[i % TEST_USERS.length];

      const daysAgo = Math.floor(Math.random() * 3);
      const postedAt = new Date(now);
      postedAt.setDate(postedAt.getDate() - daysAgo);
      postedAt.setMinutes(0, 0, 0); // Round to hour

      // Expires 7-30 days from TODAY (not from posted date)
      const expiresAt = new Date(); // Use current date
      expiresAt.setDate(
        expiresAt.getDate() + (7 + Math.floor(Math.random() * 24))
      );

      const managementToken = nanoid(32);
      const tokenHash = await bcrypt.hash(managementToken, 10);

      // Must be UNIQUE
      const relayEmail = `post_${nanoid(12)}@${RELAY_EMAIL_DOMAIN}`;
      const sessionToken = nanoid(32);

      // Pick a random city
      const cityMapping = randomFrom(cityMappings);

      posts.push({
        cityKey: cityMapping.key,
        location: cityMapping.label,
        category: randomFrom(categories),
        title: randomFrom(titles),
        description: randomFrom(descriptions),
        postedAt,
        expiresAt,
        tokenHash,
        sessionToken,
        relayEmail,
        contactEmailEncrypted: encryptEmailForDev(ownerEmail),
      });
    }

    console.log(`\nInserting ${posts.length} posts...`);

    for (const post of posts) {
      await client.query(
        `
        INSERT INTO posts
          (location, category, title, description, posted_at, expires_at,
           management_token_hash, session_token, relay_email, contact_email_encrypted, is_deleted)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
          post.location,
          post.category,
          post.title,
          post.description,
          post.postedAt,
          post.expiresAt,
          post.tokenHash,
          post.sessionToken,
          post.relayEmail,
          post.contactEmailEncrypted,
          false,
        ]
      );
    }

    console.log("✓ Successfully seeded 50 posts!");

    const byEmail = await client.query(`
      SELECT contact_email_encrypted AS owner, COUNT(*) AS count
      FROM posts
      WHERE is_deleted = FALSE
      GROUP BY contact_email_encrypted
      ORDER BY count DESC
    `);

    console.log("\nPosts by (encrypted) owner:");
    byEmail.rows.forEach((r) => console.log(`  ${r.owner}: ${r.count}`));

    console.log("\nPosts by (encrypted) owner:");
    byEmail.rows.forEach((r) => console.log(`  ${r.owner}: ${r.count}`));

    await client.end();
    console.log("\n✓ Done!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

generatePosts();
