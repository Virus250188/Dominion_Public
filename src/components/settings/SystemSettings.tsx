"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportData, importData } from "@/lib/actions/settings";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

export function SystemSettings() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = () => {
    startTransition(async () => {
      try {
        const data = await exportData(1);
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dominion-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: "success", text: "Backup erfolgreich exportiert!" });
      } catch (err) {
        setMessage({ type: "error", text: "Export fehlgeschlagen." });
      }
    });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        startTransition(async () => {
          await importData(1, data);
          setMessage({ type: "success", text: "Daten erfolgreich importiert!" });
        });
      } catch (err) {
        setMessage({ type: "error", text: "Import fehlgeschlagen. Ungueltige Datei." });
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Backup & Restore */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Backup & Restore</h2>
        <p className="text-sm text-muted-foreground">
          Exportiere deine gesamte Dashboard-Konfiguration oder importiere ein Backup.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleExport} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            Exportieren
          </Button>
          <Button variant="outline" onClick={handleImport} disabled={isPending}>
            <Upload className="mr-2 h-4 w-4" />
            Importieren
          </Button>
        </div>
        {message && (
          <div className={`flex items-center gap-2 text-sm ${message.type === "success" ? "text-emerald-400" : "text-destructive"}`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}
      </section>

      {/* About */}
      <section className="glass-card p-6 space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Ueber Dominion</h2>
        <p className="text-sm text-muted-foreground">
          Modernes Application Dashboard fuer deine selbst-gehosteten Services.
        </p>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Stack: Next.js, TypeScript, Tailwind CSS, SQLite</div>
          <div>Version: 0.9.5</div>
        </div>
      </section>
    </div>
  );
}
