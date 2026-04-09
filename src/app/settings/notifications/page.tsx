import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { NotificationSourceManager } from "@/components/settings/NotificationSourceManager";
import { getAllPlugins } from "@/plugins/registry";

export default async function NotificationsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);

  const sources = await prisma.notificationSource.findMany({
    where: { userId },
    include: { _count: { select: { notifications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items = sources.map((s) => ({
    id: s.id,
    sourceId: s.sourceId,
    name: s.name,
    type: s.type,
    icon: s.icon,
    color: s.color,
    enabled: s.enabled,
    apiKey: decrypt(s.apiKey),
    rssUrl: s.rssUrl,
    rssInterval: s.rssInterval,
    rateLimit: s.rateLimit,
    appConnectionId: s.appConnectionId,
    createdAt: s.createdAt.toISOString(),
    totalNotifications: s._count.notifications,
  }));

  // Fetch app connections for the "App verbinden" wizard step
  const appConnections = await prisma.appConnection.findMany({
    where: { userId },
    select: { id: true, name: true, pluginType: true, icon: true, color: true, url: true },
    orderBy: { name: "asc" },
  });

  // Find plugins with notification support
  const allPlugins = getAllPlugins();
  const notificationPlugins = allPlugins
    .filter((p) => p.metadata.id && p.supportsNotifications)
    .map((p) => p.metadata.id);

  // Only pass connections whose plugin supports notifications
  const notificationAppConnections = appConnections
    .filter((c) => notificationPlugins.includes(c.pluginType))
    .map((c) => ({
      id: c.id,
      name: c.name,
      pluginType: c.pluginType,
      icon: c.icon,
      color: c.color,
      url: c.url,
    }));

  // IDs of app connections already registered as notification sources
  const registeredAppConnectionIds = sources
    .filter((s) => s.appConnectionId !== null)
    .map((s) => s.appConnectionId!);

  return (
    <NotificationSourceManager
      initialSources={items}
      appConnections={notificationAppConnections}
      registeredAppConnectionIds={registeredAppConnectionIds}
    />
  );
}
