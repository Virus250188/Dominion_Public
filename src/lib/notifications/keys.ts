import { createHash, randomBytes } from "crypto";

export function generateApiKey(): string {
  return `nk_${randomBytes(16).toString("hex")}`;
}

// Deterministic SHA-256 of the plaintext key, used as a unique DB lookup
// column so the POST handler can find a NotificationSource without
// decrypting every row. The plaintext keys are 128-bit random tokens, so
// SHA-256 is collision-resistant for this input space without a salt.
export function hashApiKey(plainKey: string): string {
  return createHash("sha256").update(plainKey).digest("hex");
}
