import prisma from "@/lib/db";

export async function getSearchProviders() {
  return prisma.searchProvider.findMany({
    orderBy: { name: "asc" },
  });
}
