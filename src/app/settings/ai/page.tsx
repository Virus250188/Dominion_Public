import { getUserSettings } from "@/lib/queries/settings";
import { decrypt } from "@/lib/crypto";
import { AISettings } from "@/components/settings/AISettings";

export const dynamic = "force-dynamic";

export default async function AISettingsPage() {
  const settings = await getUserSettings(1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">KI Assistent</h1>
      <AISettings
        currentProvider={settings?.aiProvider || ""}
        currentApiKey={settings?.aiApiKey ? decrypt(settings.aiApiKey) : ""}
        currentModel={settings?.aiModel || ""}
        currentEndpoint={settings?.aiEndpoint || ""}
      />
    </div>
  );
}
