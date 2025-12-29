import { query } from "../config/database.js";
import crypto from "crypto";
import logger from "../utils/logger.js";

// Hash IP address for privacy (can't reverse)
function hashIP(ip) {
  if (!ip) return null;
  return crypto
    .createHash("sha256")
    .update(ip + "salt_key")
    .digest("hex");
}

// Check content against safe words
export async function checkContentSafety(text, postId = null) {
  const flags = [];

  // Get active safe words
  const result = await query(
    `SELECT word, severity, action 
     FROM safe_words 
     WHERE is_active = TRUE`
  );

  const safeWords = result.rows;
  const lowerText = text.toLowerCase();

  for (const sw of safeWords) {
    if (lowerText.includes(sw.word.toLowerCase())) {
      flags.push({
        word: sw.word,
        category: sw.category,
        severity: sw.severity,
        action: sw.action,
      });

      // Log the flag if we have a post ID
      if (postId) {
        await query(
          `INSERT INTO content_flags 
           (post_id, flag_type, matched_pattern, severity, auto_action)
           VALUES ($1, $2, $3, $4, $5)`,
          [postId, sw.category, sw.word, sw.severity, sw.action]
        );
      }
    }
  }

  // Determine overall action
  const hasHighSeverity = flags.some((f) => f.severity === "high");
  const requiresReview = flags.some((f) => f.action === "review");

  return {
    isSafe: flags.length === 0,
    flags,
    requiresReview: hasHighSeverity || requiresReview,
    shouldBlock: hasHighSeverity && flags.some((f) => f.action === "block"),
  };
}

// Report a post
export async function reportPost(postId, reason, details, ipAddress) {
  const validReasons = [
    "spam",
    "harassment",
    "inappropriate",
    "scam",
    "fake",
    "offensive",
    "other",
  ];

  if (!validReasons.includes(reason)) {
    throw new Error("Invalid report reason");
  }

  const ipHash = hashIP(ipAddress);

  // Check if same IP already reported this post
  const existing = await query(
    `SELECT id FROM reports 
     WHERE post_id = $1 AND reporter_ip_hash = $2`,
    [postId, ipHash]
  );

  if (existing.rows.length > 0) {
    throw new Error("You have already reported this post");
  }

  const result = await query(
    `INSERT INTO reports 
     (post_id, reason, details, reporter_ip_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [postId, reason, details, ipHash]
  );

  logger.info("Post reported", { postId, reason });

  // Auto-hide post if it gets 3+ reports
  const reportCount = await query(
    `SELECT COUNT(*) FROM reports WHERE post_id = $1 AND status = 'pending'`,
    [postId]
  );

  if (parseInt(reportCount.rows[0].count) >= 3) {
    await autoHidePost(postId, "Multiple reports received");
  }

  return {
    success: true,
    reportId: result.rows[0].id,
  };
}

// Auto-hide a post that needs review
async function autoHidePost(postId, reason) {
  await query(`UPDATE posts SET is_deleted = TRUE WHERE id = $1`, [postId]);

  await query(
    `INSERT INTO blocked_posts (post_id, reason, blocked_by)
     VALUES ($1, $2, 'system')`,
    [postId, reason]
  );

  logger.warn("Post auto-hidden", { postId, reason });
}

// Get reports for moderation
export async function getPendingReports() {
  const result = await query(
    `SELECT 
      r.id,
      r.post_id,
      r.reason,
      r.details,
      r.created_at,
      p.location,
      p.description,
      COUNT(*) OVER (PARTITION BY r.post_id) as report_count
     FROM reports r
     JOIN posts p ON r.post_id = p.id
     WHERE r.status = 'pending'
     ORDER BY r.created_at DESC`
  );

  return result.rows;
}

// Get flagged content for review
export async function getFlaggedContent() {
  const result = await query(
    `SELECT DISTINCT ON (cf.post_id)
      cf.post_id,
      cf.flag_type,
      cf.matched_pattern,
      cf.severity,
      cf.created_at,
      p.location,
      p.description,
      COUNT(*) OVER (PARTITION BY cf.post_id) as flag_count
     FROM content_flags cf
     JOIN posts p ON cf.post_id = p.id
     WHERE p.is_deleted = FALSE
       AND cf.severity IN ('high', 'medium')
     ORDER BY cf.post_id, cf.severity DESC, cf.created_at DESC`
  );

  return result.rows;
}

// Review a report
export async function reviewReport(reportId, action, reviewerName) {
  const validActions = ["delete", "warn", "no_action", "dismiss"];

  if (!validActions.includes(action)) {
    throw new Error("Invalid action");
  }

  await query(
    `UPDATE reports 
     SET status = 'reviewed', 
         action_taken = $1,
         reviewed_by = $2,
         reviewed_at = NOW()
     WHERE id = $3`,
    [action, reviewerName, reportId]
  );

  // If action is delete, remove the post
  if (action === "delete") {
    const report = await query(`SELECT post_id FROM reports WHERE id = $1`, [
      reportId,
    ]);

    if (report.rows.length > 0) {
      await query(`UPDATE posts SET is_deleted = TRUE WHERE id = $1`, [
        report.rows[0].post_id,
      ]);

      await query(
        `INSERT INTO blocked_posts (post_id, reason, blocked_by)
         VALUES ($1, 'Moderator review - policy violation', $2)`,
        [report.rows[0].post_id, reviewerName]
      );
    }
  }

  logger.info("Report reviewed", { reportId, action, reviewerName });

  return { success: true };
}

// Get post report count
export async function getPostReportCount(postId) {
  const result = await query(
    `SELECT COUNT(*) FROM reports 
     WHERE post_id = $1 AND status = 'pending'`,
    [postId]
  );

  return parseInt(result.rows[0].count);
}
