import express from "express";
import passport from "passport";
import { OAuth2Client } from "google-auth-library";
import { body } from "express-validator";
import { validateRequest } from "../utils/validation.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../utils/tokens.js";
import { query } from "../config/database.js";

const router = express.Router();

// Initialize Google OAuth2 client for mobile token verification
const googleClient = new OAuth2Client(config.google.clientId);

// Cookie configuration for refresh tokens
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: "/",
};

/**
 * WEB: Google OAuth - Initiate login
 * GET /auth/google
 */
router.get(
  "/google",
  (req, res, next) => {
    // Store returnTo in query state for redirect after auth
    const state = req.query.returnTo
      ? Buffer.from(JSON.stringify({ returnTo: req.query.returnTo })).toString(
          "base64"
        )
      : undefined;

    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false, // IMPORTANT: No sessions
      state,
    })(req, res, next);
  }
);

/**
 * WEB: Google OAuth - Callback handler
 * GET /auth/google/callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false, // IMPORTANT: No sessions
    failureRedirect: "/?auth=failed",
  }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect("/?auth=failed");
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token in database
      await storeRefreshToken(user.id, refreshToken, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

      // Set refresh token as httpOnly cookie
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

      // Parse returnTo from state
      let returnTo = "/";
      if (req.query.state) {
        try {
          const state = JSON.parse(
            Buffer.from(req.query.state, "base64").toString("utf-8")
          );
          returnTo = state.returnTo || "/";
        } catch (err) {
          logger.warn("Failed to parse OAuth state", { error: err.message });
        }
      }

      // Store access token in URL fragment for client-side pickup
      // This is a common pattern for SPAs - token is in fragment, not query
      const separator = returnTo.includes("#") ? "&" : "#";
      res.redirect(`${returnTo}${separator}auth=success&token=${accessToken}`);
    } catch (error) {
      logger.error("OAuth callback error:", error);
      res.redirect("/?auth=failed");
    }
  }
);

/**
 * MOBILE: Google ID Token Exchange
 * POST /auth/google/mobile
 * Body: { idToken: string }
 * Returns: { accessToken, refreshToken, user }
 */
router.post(
  "/google/mobile",
  body("idToken").isString().notEmpty(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { idToken } = req.body;

      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        return res.status(401).json({ error: "Invalid Google ID token" });
      }

      // Extract user info from token
      const googleSub = payload.sub;
      const email = payload.email;
      const emailVerified = payload.email_verified || false;
      const name = payload.name;
      const avatarUrl = payload.picture;

      if (!email) {
        return res
          .status(400)
          .json({ error: "Email not provided by Google" });
      }

      // Find or create user
      let user;
      const existing = await query(
        "SELECT * FROM users WHERE google_sub = $1",
        [googleSub]
      );

      if (existing.rows.length > 0) {
        // Update existing user
        const updated = await query(
          `UPDATE users
           SET last_login = NOW(),
               email = $2,
               email_verified = $3,
               name = $4,
               avatar_url = $5
           WHERE id = $1
           RETURNING *`,
          [existing.rows[0].id, email, emailVerified, name, avatarUrl]
        );
        user = updated.rows[0];
        logger.info("Mobile user logged in", { userId: user.id });
      } else {
        // Create new user
        const newUser = await query(
          `INSERT INTO users (google_sub, email, email_verified, name, avatar_url, last_login)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [googleSub, email, emailVerified, name, avatarUrl]
        );
        user = newUser.rows[0];
        logger.info("New mobile user created", { userId: user.id });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token
      await storeRefreshToken(user.id, refreshToken, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

      // Return tokens in JSON (no cookies for mobile)
      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
        },
      });
    } catch (error) {
      if (error.message?.includes("Token")) {
        return res.status(401).json({ error: "Invalid Google ID token" });
      }
      next(error);
    }
  }
);

/**
 * Refresh access token
 * POST /auth/refresh
 * Accepts refresh token from cookie OR body
 * Returns: { accessToken, refreshToken? }
 */
router.post("/refresh", async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }

    // Rotate refresh token
    const result = await rotateRefreshToken(refreshToken, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    // Generate new access token
    const accessToken = generateAccessToken(result.user);

    // If token came from cookie, update cookie
    const fromCookie = !!req.cookies?.[REFRESH_COOKIE_NAME];
    if (fromCookie) {
      res.cookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        REFRESH_COOKIE_OPTIONS
      );
    }

    // Return new tokens
    res.json({
      accessToken,
      // Only return refresh token in body if not using cookies
      ...(fromCookie ? {} : { refreshToken: result.refreshToken }),
    });
  } catch (error) {
    if (error.message?.includes("refresh token")) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * Logout - Revoke refresh token
 * POST /auth/logout
 */
router.post("/logout", async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body.refreshToken;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Clear cookie if present
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * Check authentication status
 * GET /auth/status
 * NOTE: This endpoint is for checking if user has valid tokens
 * It does NOT validate the access token - use requireAuth middleware for that
 */
router.get("/status", async (req, res) => {
  // Check if refresh token exists
  const refreshToken =
    req.cookies?.[REFRESH_COOKIE_NAME] || req.query.refreshToken;

  if (!refreshToken) {
    return res.json({ authenticated: false, user: null });
  }

  try {
    // Import here to avoid circular dependency
    const { verifyRefreshToken } = await import("../utils/tokens.js");
    const verification = await verifyRefreshToken(refreshToken);

    if (!verification) {
      return res.json({ authenticated: false, user: null });
    }

    res.json({
      authenticated: true,
      user: {
        id: verification.user.id,
        email: verification.user.email,
        name: verification.user.name,
        avatarUrl: verification.user.avatarUrl,
      },
    });
  } catch (error) {
    res.json({ authenticated: false, user: null });
  }
});

export default router;
