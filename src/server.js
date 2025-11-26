import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";

// Config
import "./config/env.js";
import { initDatabase, getPool } from "./config/database.js";
import { initEmail } from "./config/email.js";
import { initPassport } from "./config/passport.js";

// Middleware
import { globalRateLimiter } from "./middleware/rateLimiter.js";
import { sanitizeInputs } from "./middleware/sanitizer.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import postsRouter from "./routes/posts.js";
import repliesRouter from "./routes/replies.js";
import managementRouter from "./routes/management.js";
import inboxRouter from "./routes/inbox.js";
import verificationRouter from "./routes/verification.js";
import posterVerificationRouter from "./routes/posterVerification.js";
import moderationRouter from "./routes/moderation.js";
import authRouter from "./routes/auth.js";

// Services
import { startCleanupJob } from "./services/cleanupService.js";

// Logger
import logger from "./utils/logger.js";
import { config } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "no-referrer" },
  })
);

app.use(
  cors({
    origin: config.security.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type"],
  })
);

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// NOTE: Session and passport are initialized AFTER database connection
// See start() function below

// Global rate limiting
app.use(globalRateLimiter);

// Input sanitization
app.use(sanitizeInputs);

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Auth routes
app.use("/auth", authRouter);

// API Routes
app.use("/api/posts", postsRouter);
app.use("/api/replies", repliesRouter);
app.use("/api/manage", managementRouter);
app.use("/api/inbox", inboxRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/poster-verification", posterVerificationRouter);
app.use("/api/moderation", moderationRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// User info endpoint
app.get("/api/user", (req, res) => {
  if (req.user) {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      profilePicture: req.user.profile_picture,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use(errorHandler);

// Initialize
async function start() {
  try {
    // 1. Initialize database FIRST
    await initDatabase();
    console.log("✓ Database initialized");

    // 2. Initialize session store (requires database pool)
    const PgSession = connectPgSimple(session);

    app.use(
      session({
        store: new PgSession({
          pool: getPool(),
          tableName: "session",
        }),
        secret: config.session.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: config.nodeEnv === "production",
          sameSite: "lax",
        },
      })
    );

    console.log("✓ Session store initialized");

    // 3. Initialize passport (requires session)
    app.use(passport.initialize());
    app.use(passport.session());

    // Make user available to all routes
    app.use((req, res, next) => {
      res.locals.user = req.user;
      next();
    });

    initPassport();
    console.log("✓ Passport initialized");

    // 4. Initialize email
    try {
      initEmail();
      console.log("✓ Email initialized");
    } catch (error) {
      console.error("✗ Email initialization failed:", error.message);
    }

    // 5. Start cleanup job
    startCleanupJob();

    // 6. Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info("Crabiner API ready");
      console.log("\n🦔💕 Crabiner is running!");
      console.log(`Visit: http://localhost:${PORT}\n`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});
