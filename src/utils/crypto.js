import crypto from "crypto";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import { config } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const SALT_ROUNDS = 10;

// Generate secure random token
export function generateToken(length = 32) {
  return nanoid(length);
}

// Generate relay email address
export function generateRelayEmail() {
  const randomId = nanoid(10);
  return `mc-${randomId}@${config.email.relayDomain}`;
}

// Encrypt text (for storing email addresses)
export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(config.security.encryptionKey, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Decrypt text
export function decrypt(encrypted, iv, authTag) {
  const key = crypto.scryptSync(config.security.encryptionKey, "salt", 32);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Hash token for storage
export async function hashToken(token) {
  return bcrypt.hash(token, SALT_ROUNDS);
}

// Verify token against hash
export async function verifyToken(token, hash) {
  return bcrypt.compare(token, hash);
}
