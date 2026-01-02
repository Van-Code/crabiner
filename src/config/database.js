import pkg from "pg";
const { Pool } = pkg;
import logger from "../utils/logger.js";

let pool;

export function initDatabase() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("error", (err) => {
    logger.error("Unexpected database error:", err);
  });

  logger.info("Database connection pool initialized");
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return pool;
}

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error("Database query error:", { text, error: error.message });
    throw error;
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info("Database connection pool closed");
    pool = null;
  }
}
