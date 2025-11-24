import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { query } from "./database.js";
import { config } from "./env.js";
import logger from "../utils/logger.js";

export function initPassport() {
  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const result = await query(
        "SELECT id, google_id, email, name, profile_picture FROM users WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        return done(null, false);
      }

      done(null, result.rows[0]);
    } catch (error) {
      done(error);
    }
  });

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          const existing = await query(
            "SELECT * FROM users WHERE google_id = $1",
            [profile.id]
          );

          if (existing.rows.length > 0) {
            // Update last login
            await query("UPDATE users SET last_login = NOW() WHERE id = $1", [
              existing.rows[0].id,
            ]);

            logger.info("User logged in", { userId: existing.rows[0].id });
            return done(null, existing.rows[0]);
          }

          // Create new user
          const newUser = await query(
            `INSERT INTO users (google_id, email, name, profile_picture)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
            [
              profile.id,
              profile.emails[0].value,
              profile.displayName,
              profile.photos[0]?.value,
            ]
          );

          logger.info("New user created", { userId: newUser.rows[0].id });
          done(null, newUser.rows[0]);
        } catch (error) {
          logger.error("OAuth error:", error);
          done(error);
        }
      }
    )
  );

  logger.info("Passport initialized");
}
