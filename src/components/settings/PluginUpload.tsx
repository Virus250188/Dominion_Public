"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description?: string;
}

interface UploadResult {
  success: boolean;
  plugin?: PluginManifest;
  warnings?: string[];
  errors?: string[];
  error?: string;
  needsRestart?: boolean;
}

export function PluginUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [installedPlugins, setInstalledPlugins] = useState<PluginManifest[]>([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch installed community plugins
  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch("/api/plugins/upload");
      if (res.ok) {
        const data = await res.json();
        setInstalledPlugins(data.plugins || []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingPlugins(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadResult(null);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      if (file.size <= 5 * 1024 * 1024) {
        setSelectedFile(file);
      } else {
        setUploadResult({
          success: false,
          errors: ["Datei zu gross. Maximal 5MB erlaubt."],
        });
      }
    } else {
      setUploadResult({
        success: false,
        errors: ["Nur ZIP-Dateien sind erlaubt."],
      });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadResult(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadResult({
          success: false,
          errors: ["Datei zu gross. Maximal 5MB erlaubt."],
        });
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/plugins/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResult = await res.json();

      if (res.ok && data.success) {
        setUploadResult(data);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Refresh plugin list
        fetchPlugins();
      } else {
        setUploadResult({
          success: false,
          errors: data.errors || [data.error || "Upload fehlgeschlagen."],
          warnings: data.warnings,
        });
      }
    } catch {
      setUploadResult({
        success: false,
        errors: ["Netzwerkfehler beim Upload."],
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, fetchPlugins]);

  const handleRestart = useCallback(async () => {
    setIsRestarting(true);
    try {
      await fetch("/api/system/restart", { method: "POST" });
    } catch {
      // Expected — the server is shutting down
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
  }, []);

  const handleDismissResult = useCallback(() => {
    setUploadResult(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-300">
              Community Plugins — Auf eigene Verantwortung
            </h3>
            <p className="mt-1 text-sm text-amber-200/80">
              Community Plugins werden nicht von Dominion geprueft. Installiere nur Plugins aus
              vertrauenswuerdigen Quellen. Stelle sicher, dass du kein Legacy-Produkt hochlaedst.
            </p>
          </div>
        </div>
      </section>

      {/* Upload Area */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Plugin hochladen</h2>
        <p className="text-sm text-muted-foreground">
          Lade ein Community Plugin als ZIP-Datei hoch. Das Plugin muss eine{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plugin.manifest.json</code>{" "}
          und eine{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">index.ts</code>{" "}
          enthalten.
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              ZIP-Datei hierher ziehen oder
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              ZIP auswaehlen
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Maximal 5MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Selected File */}
        {selectedFile && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Hochladen...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Hochladen
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Upload Result: Success */}
        {uploadResult?.success && uploadResult.plugin && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-300">
                  Plugin erfolgreich installiert
                </h3>
                <div className="mt-2 space-y-1 text-sm text-emerald-200/80">
                  <p><span className="text-emerald-300/60">Name:</span> {uploadResult.plugin.name}</p>
                  <p><span className="text-emerald-300/60">Version:</span> {uploadResult.plugin.version}</p>
                  <p><span className="text-emerald-300/60">Autor:</span> {uploadResult.plugin.author}</p>
                </div>
                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-300/80">
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isRestarting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Server wird neu gestartet...
              </div>
            ) : (
              <div className="flex gap-2 ml-8">
                <Button onClick={handleRestart} size="sm">
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Jetzt neustarten
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDismissResult}>
                  Spaeter
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upload Result: Error */}
        {uploadResult && !uploadResult.success && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-destructive">
                  Plugin-Validierung fehlgeschlagen
                </h3>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-destructive/80">
                    {uploadResult.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-destructive/60" />
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-300/80">
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Installed Community Plugins */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Installierte Community Plugins</h2>

        {isLoadingPlugins ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Plugins werden geladen...
          </div>
        ) : installedPlugins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keine Community Plugins installiert.
          </p>
        ) : (
          <div className="space-y-2">
            {installedPlugins.map((plugin) => (
              <div
                key={plugin.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{plugin.name}</p>
                    <p className="text-xs text-muted-foreground">
                      v{plugin.version} &middot; {plugin.author}
                      {plugin.description ? ` — ${plugin.description}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
