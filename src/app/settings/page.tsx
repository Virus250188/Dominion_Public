import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSettings } from "@/lib/queries/settings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = parseInt(session.user.id, 10);
  const settings = await getUserSettings(userId);
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Erscheinungsbild</h1>
      <AppearanceSettings
        currentTheme={(settings?.theme as string) || "glass-dark"}
        gridColumns={settings?.gridColumns || 6}
        showSearch={settings?.showSearch ?? true}
        showClock={settings?.showClock ?? true}
        showGreeting={settings?.showGreeting ?? true}
        backgroundType={settings?.backgroundType || "gradient"}
      />
    </div>
  );
}
