import prisma from "@/lib/db";

export async function getUserSettings(userId: number = 1) {
  return prisma.userSettings.findUnique({
    where: { userId },
  });
}
