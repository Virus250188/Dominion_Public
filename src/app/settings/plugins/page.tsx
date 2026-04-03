export const dynamic = "force-dynamic";

import { PluginUpload } from "@/components/settings/PluginUpload";

export default function PluginUploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Plugin Upload</h1>
      <PluginUpload />
    </div>
  );
}
