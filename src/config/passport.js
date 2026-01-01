import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { query } from "./database.js";
import { config } from "./env.js";
import logger from "../utils/logger.js";

/**
 * Initialize Passport for stateless Google OAuth
 * NO sessions - passport is only used for OAuth redirect flow
 */
export function initPassport() {
  // Google OAuth Strategy - stateless
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract data from Google profile
          const googleSub = profile.id;
          const email = profile.emails?.[0]?.value;
          const emailVerified = profile.emails?.[0]?.verified || false;
          const name = profile.displayName;
          const avatarUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("No email provided by Google"));
          }

          // Check if user exists
          const existing = await query(
            "SELECT * FROM users WHERE google_sub = $1",
            [googleSub]
          );

          let user;

          if (existing.rows.length > 0) {
            // Update last login and profile info
            const updated = await query(
              `UPDATE users
               SET last_login = NOW(),
                   email = $2,
                   email_verified = $3,
                   name = $4,
                   avatar_url = $5
               WHERE id = $1
               RETURNING *`,
              [
                existing.rows[0].id,
                email,
                emailVerified,
                name,
                avatarUrl,
              ]
            );

            user = updated.rows[0];
            logger.info("User logged in", { userId: user.id });
          } else {
            // Create new user
            const newUser = await query(
              `INSERT INTO users (google_sub, email, email_verified, name, avatar_url, last_login)
               VALUES ($1, $2, $3, $4, $5, NOW())
               RETURNING *`,
              [googleSub, email, emailVerified, name, avatarUrl]
            );

            user = newUser.rows[0];
            logger.info("New user created", { userId: user.id });
          }

          // Return user to callback handler
          done(null, user);
        } catch (error) {
          logger.error("OAuth error:", error);
          done(error);
        }
      }
    )
  );

  logger.info("Passport initialized (stateless mode)");
}
