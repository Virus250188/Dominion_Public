import { SystemSettings } from "@/components/settings/SystemSettings";

export default function SystemSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">System</h1>
      <SystemSettings />
    </div>
  );
}
