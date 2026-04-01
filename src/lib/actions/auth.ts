"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

/**
 * Get the authenticated userId from the session.
 * Throws if not authenticated.
 */
async function requireUserId(): Promise<number> {
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

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId();

  // Validate inputs
  if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
    return { success: false, error: "Alle Felder muessen ausgefuellt werden." };
  }

  if (data.newPassword.length < 6) {
    return { success: false, error: "Das neue Passwort muss mindestens 6 Zeichen lang sein." };
  }

  if (data.newPassword !== data.confirmPassword) {
    return { success: false, error: "Die Passwoerter stimmen nicht ueberein." };
  }

  // Fetch current user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "Benutzer nicht gefunden." };
  }

  // Verify current password
  const isValid = await bcrypt.compare(data.currentPassword, user.password);
  if (!isValid) {
    return { success: false, error: "Das aktuelle Passwort ist falsch." };
  }

  // Hash and update
  const hashedPassword = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { success: true };
}

export async function createInitialUser(data: {
  username: string;
  password: string;
}) {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    throw new Error("Users already exist");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      isAdmin: true,
      isPublic: true,
      settings: {
        create: {
          theme: "glass-dark",
          searchProvider: "google",
          language: "de",
          gridColumns: 6,
          tileSize: "medium",
          showSearch: true,
          showClock: true,
          showGreeting: true,
        },
      },
    },
  });

  return { success: true };
}
