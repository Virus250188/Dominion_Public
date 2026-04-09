export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { NotificationSourceManager } from "@/components/settings/NotificationSourceManager";

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);

  const sources = await prisma.notificationSource.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { notifications: true } },
    },
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
    createdAt: s.createdAt.toISOString(),
    totalNotifications: s._count.notifications,
  }));

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Benachrichtigungen</h1>
      <NotificationSourceManager initialSources={items} />
    </>
  );
}
