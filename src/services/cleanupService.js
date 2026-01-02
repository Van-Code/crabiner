/**
 * Cleanup Service
 * Handles automatic cleanup of expired posts and tokens
 */

import cron from "node-cron";
import { query } from "../config/database.js";
import logger from "../utils/logger.js";
import { config } from "../config/env.js";

/**
 * Delete expired posts and their associated data
 */
async function cleanupExpiredPosts() {
  try {
    // Mark expired posts as expired (status)
    const result = await query(
      `UPDATE posts
       SET status = 'expired'
       WHERE status = 'active'
         AND expires_at < NOW()
       RETURNING id`
    );

    if (result.rows.length > 0) {
      logger.info(`Marked ${result.rows.length} posts as expired`);
    }
  } catch (error) {
    logger.error("Error in cleanupExpiredPosts:", error);
  }
}

/**
 * Delete old expired refresh tokens
 */
async function cleanupRefreshTokens() {
  try {
    // Delete refresh tokens that expired more than 7 days ago
    const result = await query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < NOW() - INTERVAL '7 days'
       RETURNING id`
    );

    if (result.rows.length > 0) {
      logger.info(`Deleted ${result.rows.length} old refresh tokens`);
    }
  } catch (error) {
    logger.error("Error in cleanupRefreshTokens:", error);
  }
}

/**
 * Start the cleanup cron job
 */
export function startCleanupJob() {
  const schedule = config.cleanupCron || "0 * * * *"; // Default: every hour

  cron.schedule(schedule, async () => {
    logger.info("Running cleanup job");
    await cleanupExpiredPosts();
    await cleanupRefreshTokens();
    logger.info("Cleanup job completed");
  });

  logger.info(`Cleanup job scheduled: ${schedule}`);
}
