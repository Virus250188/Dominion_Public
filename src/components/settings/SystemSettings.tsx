"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportData, importData } from "@/lib/actions/settings";
import { changePassword } from "@/lib/actions/auth";
import { Download, Upload, AlertCircle, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export function SystemSettings() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [pwPending, startPwTransition] = useTransition();
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Import confirmation state
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{ tiles: Array<Record<string, unknown>>; settings: Record<string, unknown> | null } | null>(null);

  // Restart state
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    if (!restartConfirm) {
      setRestartConfirm(true);
      return;
    }
    setIsRestarting(true);
    try {
      await fetch("/api/system/restart", { method: "POST" });
    } catch {
      // Expected — server is shutting down
    }
    // Poll until server is back, then reload
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          clearInterval(poll);
          window.location.reload();
        }
      } catch {
        // Server still down, keep polling
      }
    }, 2000);
  };

  const handleChangePassword = () => {
    setPwMessage(null);

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: "error", text: "Alle Felder muessen ausgefuellt werden." });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Das neue Passwort muss mindestens 6 Zeichen lang sein." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Die Passwoerter stimmen nicht ueberein." });
      return;
    }

    startPwTransition(async () => {
      try {
        const result = await changePassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        if (result.success) {
          setPwMessage({ type: "success", text: "Passwort erfolgreich geaendert!" });
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          setPwMessage({ type: "error", text: result.error || "Passwort aendern fehlgeschlagen." });
        }
      } catch {
        setPwMessage({ type: "error", text: "Passwort aendern fehlgeschlagen." });
      }
    });
  };

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
        toast.success("Backup exportiert");
      } catch {
        setMessage({ type: "error", text: "Export fehlgeschlagen." });
        toast.error("Export fehlgeschlagen");
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
        setPendingImportData(data);
        setImportConfirmOpen(true);
      } catch {
        setMessage({ type: "error", text: "Import fehlgeschlagen. Ungueltige Datei." });
        toast.error("Ungueltige Backup-Datei");
      }
    };
    input.click();
  };

  const executeImport = () => {
    if (!pendingImportData) return;
    setImportConfirmOpen(false);
    startTransition(async () => {
      try {
        await importData(1, pendingImportData);
        setMessage({ type: "success", text: "Daten erfolgreich importiert!" });
        toast.success("Daten erfolgreich importiert");
      } catch {
        setMessage({ type: "error", text: "Import fehlgeschlagen." });
        toast.error("Import fehlgeschlagen");
      } finally {
        setPendingImportData(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Passwort aendern */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Passwort aendern</h2>
        <p className="text-sm text-muted-foreground">
          Aendere dein Anmeldepasswort. Das neue Passwort muss mindestens 6 Zeichen lang sein.
        </p>
        <div className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Aktuelles Passwort</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Aktuelles Passwort"
              disabled={pwPending}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Neues Passwort</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Neues Passwort"
              disabled={pwPending}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Passwort bestaetigen</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort bestaetigen"
              disabled={pwPending}
            />
          </div>
        </div>
        <Button onClick={handleChangePassword} disabled={pwPending}>
          <Lock className="mr-2 h-4 w-4" />
          Passwort aendern
        </Button>
        {pwMessage && (
          <div className={`flex items-center gap-2 text-sm ${pwMessage.type === "success" ? "text-emerald-400" : "text-destructive"}`}>
            {pwMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {pwMessage.text}
          </div>
        )}
      </section>

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
          <div>Version: {process.env.NEXT_PUBLIC_APP_VERSION || "dev"}</div>
        </div>
      </section>

      {/* Server Neustart */}
      <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Server Neustart</h2>
        <p className="text-sm text-muted-foreground">
          Startet den Dashboard-Server neu. Notwendig nach Plugin-Installation.
        </p>
        {isRestarting ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RotateCcw className="h-4 w-4 animate-spin" />
            Server wird neu gestartet...
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={handleRestart}
              disabled={isRestarting}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {restartConfirm ? "Bist du sicher?" : "Server neustarten"}
            </Button>
            {restartConfirm && (
              <Button
                variant="ghost"
                onClick={() => setRestartConfirm(false)}
              >
                Abbrechen
              </Button>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={importConfirmOpen}
        title="Import bestaetigen"
        message="Achtung: Der Import ueberschreibt alle bestehenden Daten (Tiles, Gruppen, Verbindungen). Fortfahren?"
        confirmLabel="Importieren"
        cancelLabel="Abbrechen"
        onConfirm={executeImport}
        onCancel={() => {
          setImportConfirmOpen(false);
          setPendingImportData(null);
        }}
      />
    </div>
  );
}
