import prisma from "@/lib/db";

export async function getUserSettings(userId: number) {
  return prisma.userSettings.findUnique({
    where: { userId },
  });
}
