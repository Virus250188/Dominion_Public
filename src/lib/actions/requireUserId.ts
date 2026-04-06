"use server";

import { auth } from "@/lib/auth";

/**
 * Get the authenticated userId from the session.
 * Throws if not authenticated.
 *
 * Shared across all server action files -- single source of truth.
 */
export async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: no active session");
  }
  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    throw new Error("Unauthorized: invalid user ID in session");
  }
  return userId;
}
