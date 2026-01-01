import cron from "node-cron";
import { query } from "../config/database.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import { cleanupExpiredCodes } from "./verificationService.js";
import { cleanupExpiredTokens } from "../utils/tokens.js";

export function startCleanupJob() {
  logger.info("Starting cleanup job", { schedule: config.cleanup.cron });

  cron.schedule(config.cleanup.cron, async () => {
    try {
      await cleanupExpiredPosts();
    } catch (error) {
      logger.error("Cleanup job failed:", error);
    }
  });
}

async function cleanupExpiredPosts() {
  const now = new Date();

  // Clean up posts
  const result = await query(
    `DELETE FROM posts
     WHERE expires_at < $1 OR is_deleted = TRUE
     RETURNING id`,
    [now]
  );

  if (result.rowCount > 0) {
    logger.info("Cleaned up expired posts", { count: result.rowCount });
  }

  // Clean up verification codes
  await cleanupExpiredCodes();

  // Clean up expired refresh tokens
  await cleanupExpiredTokens();
}
// Manual cleanup (can be run via npm run cleanup)
if (import.meta.url === `file://${process.argv[1]}`) {
  await cleanupExpiredPosts();
  process.exit(0);
}
