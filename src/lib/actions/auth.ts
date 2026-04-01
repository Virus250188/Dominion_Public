"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

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
