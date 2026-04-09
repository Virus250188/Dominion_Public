import { randomBytes } from "crypto";

export function generateApiKey(): string {
  return `nk_${randomBytes(16).toString("hex")}`;
}
