import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Validate required environment variables
const required = [
  "DATABASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "RELAY_DOMAIN",
  "ENCRYPTION_KEY",
];

for (const envVar of required) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate encryption key length
if (process.env.ENCRYPTION_KEY.length < 32) {
  throw new Error("ENCRYPTION_KEY must be at least 32 characters long");
}

export const config = {
  port: process.env.PORT || 5500,
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    url: process.env.DATABASE_URL,
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    relayDomain: process.env.RELAY_DOMAIN,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  },
  rateLimit: {
    maxPostsPerDay: parseInt(process.env.MAX_POSTS_PER_DAY, 10) || 5,
    maxRepliesPerDay: parseInt(process.env.MAX_REPLIES_PER_DAY, 10) || 20,
  },
  cleanup: {
    cron: process.env.CLEANUP_CRON || "0 * * * *",
  },
};

// Validate Google OAuth vars
if (process.env.NODE_ENV === "production") {
  const googleRequired = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "SESSION_SECRET",
  ];
  for (const envVar of googleRequired) {
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} not set. Google OAuth will not work.`);
    }
  }
}
