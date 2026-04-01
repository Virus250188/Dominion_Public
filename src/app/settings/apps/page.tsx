import prisma from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { AppConnectionManager, type AppConnectionItem } from "@/components/settings/AppConnectionManager";

export default async function AppsSettingsPage() {
  // Load all AppConnections with their tile count
  const connections = await prisma.appConnection.findMany({
    where: { userId: 1 },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { tiles: true },
      },
    },
  });

  const items: AppConnectionItem[] = connections.map((c) => ({
    id: c.id,
    pluginType: c.pluginType,
    name: c.name,
    icon: c.icon,
    customIconSvg: c.customIconSvg,
    color: c.color,
    url: c.url,
    // Security note: config is decrypted server-side for editing/testing.
    // This page is auth-protected (server component) and single-user self-hosted.
    config: c.config ? decrypt(c.config) : null,
    description: c.description,
    tileCount: c._count.tiles,
  }));

  return <AppConnectionManager initialConnections={items} />;
}
