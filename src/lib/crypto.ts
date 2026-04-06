import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";

let _warnedFallback = false;

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret && !_warnedFallback) {
    _warnedFallback = true;
    console.warn(
      "[crypto] WARNING: AUTH_SECRET not set! Using insecure fallback. " +
      "All encrypted data (API keys, tokens) is protected by a PUBLIC default key. " +
      "Set AUTH_SECRET in your .env file."
    );
  }
  const effectiveSecret = secret || "dominion-dev-secret-change-in-production";
  return scryptSync(effectiveSecret, "dominion-salt", 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a prefixed string: "enc:<iv>:<authTag>:<ciphertext>"
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string produced by encrypt().
 * Backward compatible: strings without the "enc:" prefix are returned as-is.
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith("enc:")) return text;
  const parts = text.split(":");
  if (parts.length !== 4) return text;
  const [, ivHex, authTagHex, encrypted] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
