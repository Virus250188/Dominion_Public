import prisma from "@/lib/db";
import { getPluginCatalog } from "@/plugins/registry";

export interface FoundationAppData {
  id: number;
  name: string;
  icon: string;
  color: string;
  website: string | null;
  description: string | null;
  category: string | null;
  enhanced: boolean;
}

export async function getTiles(userId: number = 1) {
  return prisma.tile.findMany({
    where: { userId, subDashboardId: null },
    orderBy: [{ pinned: "desc" }, { order: "asc" }],
  });
}

export async function getFoundationApps(): Promise<FoundationAppData[]> {
  const [dbApps, pluginCatalog] = await Promise.all([
    prisma.foundationApp.findMany({ orderBy: { name: "asc" } }),
    Promise.resolve(getPluginCatalog()),
  ]);

  // Merge: plugin entries update DB entries with matching name
  const merged = new Map<string, FoundationAppData>();

  // DB apps first
  for (const app of dbApps) {
    merged.set(app.name.toLowerCase(), {
      id: app.id,
      name: app.name,
      icon: app.icon,
      color: app.color,
      website: app.website,
      description: app.description,
      category: app.category,
      enhanced: app.enhanced,
    });
  }

  // Plugin entries override/enrich
  for (const plugin of pluginCatalog) {
    const key = plugin.name.toLowerCase();
    const existing = merged.get(key);
    merged.set(key, {
      id: existing?.id ?? 0,
      name: plugin.name,
      icon: plugin.icon,
      color: plugin.color,
      website: plugin.website,
      description: plugin.description,
      category: plugin.category,
      enhanced: true,
    });
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
