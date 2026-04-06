"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { AppIcon } from "@/components/dashboard/AppIcon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { getPlugin, getAllPlugins } from "@/plugins/registry";
import type { ConfigField } from "@/plugins/types";
import {
  createAppConnection,
  updateAppConnection,
  deleteAppConnection,
} from "@/lib/actions/appConnections";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────

export interface AppConnectionItem {
  id: number;
  pluginType: string;
  name: string;
  icon: string | null;
  customIconSvg: string | null;
  color: string;
  url: string | null;
  config: string | null; // decrypted JSON
  description: string | null;
  tileCount: number;
}

interface Props {
  initialConnections: AppConnectionItem[];
}

import { PRESET_COLORS } from "@/lib/constants";

export function AppConnectionManager({ initialConnections }: Props) {
  const [connections, setConnections] = useState<AppConnectionItem[]>(initialConnections);
  const [editingConnection, setEditingConnection] = useState<AppConnectionItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AppConnectionItem | null>(null);
  const [, startTransition] = useTransition();

  // ─── API Health Status ──────────────────────────────────────
  const [healthStatus, setHealthStatus] = useState<
    Map<number, "checking" | "online" | "offline">
  >(new Map());

  const checkConnectionHealth = useCallback(async (conn: AppConnectionItem) => {
    if (!conn.url) {
      setHealthStatus((prev) => new Map(prev).set(conn.id, "offline"));
      return;
    }
    setHealthStatus((prev) => new Map(prev).set(conn.id, "checking"));
    try {
      const parsedConfig = conn.config ? JSON.parse(conn.config) : {};
      const res = await fetch("/api/enhanced/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enhancedType: conn.pluginType,
          config: { ...parsedConfig, apiUrl: conn.url },
        }),
      });
      const data = await res.json();
      setHealthStatus((prev) =>
        new Map(prev).set(conn.id, data.success ? "online" : "offline")
      );
    } catch {
      setHealthStatus((prev) => new Map(prev).set(conn.id, "offline"));
    }
  }, []);

  useEffect(() => {
    const enhanced = connections.filter(
      (c) => c.pluginType !== "standard"
    );
    if (enhanced.length === 0) return;

    let cancelled = false;
    const runChecks = async () => {
      for (let i = 0; i < enhanced.length; i++) {
        if (cancelled) return;
        if (i > 0) {
          // Small delay between checks to avoid overwhelming the server
          await new Promise((r) => setTimeout(r, 300));
        }
        if (!cancelled) {
          checkConnectionHealth(enhanced[i]);
        }
      }
    };
    runChecks();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Edit Dialog state ──────────────────────────────────────
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [pluginType, setPluginType] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const allPlugins = getAllPlugins();
  const matchedPlugin = pluginType ? getPlugin(pluginType) : undefined;

  const openEditDialog = (connection: AppConnectionItem) => {
    setEditingConnection(connection);
    setIsNew(false);
    setName(connection.name);
    setIcon(connection.icon || "");
    setColor(connection.color);
    setUrl(connection.url || "");
    setDescription(connection.description || "");
    setPluginType(connection.pluginType);
    try {
      setConfigValues(connection.config ? JSON.parse(connection.config) : {});
    } catch {
      setConfigValues({});
    }
    setTestResult(null);
    setIsTesting(false);
    setIsSaving(false);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingConnection(null);
    setIsNew(true);
    setName("");
    setIcon("");
    setColor("#3b82f6");
    setUrl("");
    setDescription("");
    setPluginType("");
    setConfigValues({});
    setTestResult(null);
    setIsTesting(false);
    setIsSaving(false);
    setDialogOpen(true);
  };

  const handlePluginSelect = (pid: string) => {
    setPluginType(pid);
    const plugin = getPlugin(pid);
    if (plugin) {
      setName(plugin.metadata.name);
      setIcon(plugin.metadata.icon);
      setColor(plugin.metadata.color);
      setDescription(plugin.metadata.description);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/enhanced/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enhancedType: pluginType,
          config: { ...configValues, apiUrl: url },
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Netzwerkfehler" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configJson = JSON.stringify({ ...configValues, apiUrl: url });

      if (isNew) {
        const created = await createAppConnection({
          pluginType,
          name,
          icon: icon || null,
          color,
          url: url || null,
          config: configJson,
          description: description || null,
        });
        setConnections((prev) => [
          ...prev,
          {
            id: created.id,
            pluginType: created.pluginType,
            name: created.name,
            icon: created.icon,
            customIconSvg: created.customIconSvg,
            color: created.color,
            url: created.url,
            config: configJson,
            description: created.description,
            tileCount: 0,
          },
        ]);
      } else if (editingConnection) {
        await updateAppConnection(editingConnection.id, {
          name,
          icon: icon || null,
          color,
          url: url || null,
          config: configJson,
          description: description || null,
        });
        setConnections((prev) =>
          prev.map((c) =>
            c.id === editingConnection.id
              ? { ...c, name, icon, color, url, config: configJson, description }
              : c
          )
        );
      }
      setDialogOpen(false);

      // Re-check health for the saved connection
      if (isNew && pluginType !== "standard") {
        // For new connections, we need to find the newly added one after state update
        // Use setTimeout to ensure state has updated
        setTimeout(() => {
          setConnections((current) => {
            const newest = current[current.length - 1];
            if (newest) checkConnectionHealth(newest);
            return current;
          });
        }, 100);
      } else if (editingConnection && editingConnection.pluginType !== "standard") {
        checkConnectionHealth({
          ...editingConnection,
          url,
          config: configJson,
        });
      }
    } catch (err) {
      console.error("Failed to save connection:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (connection: AppConnectionItem) => {
    setDeleteConfirm(connection);
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    startTransition(async () => {
      await deleteAppConnection(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    });
  };

  // Render a config field
  const renderConfigField = (field: ConfigField) => {
    const value = (configValues[field.key] as string) || "";
    const onChange = (val: string) =>
      setConfigValues((prev) => ({ ...prev, [field.key]: val }));

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.key}
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || "Waehlen..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "number":
        return (
          <Input
            id={field.key}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
          />
        );
      case "oauth": {
        const isOAuthConnected = Boolean(configValues.accessToken);
        const oauthField = field.oauth;

        if (isOAuthConnected) {
          return (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Verbunden
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfigValues((prev) => {
                    const next = { ...prev };
                    delete next.accessToken;
                    delete next.refreshToken;
                    delete next.expiresAt;
                    return next;
                  });
                }}
                className="text-xs text-destructive hover:underline"
              >
                Trennen
              </button>
            </div>
          );
        }

        // Need clientId to start OAuth
        const oauthClientId = configValues.clientId as string;
        if (!oauthClientId) {
          return (
            <p className="text-xs text-muted-foreground">
              Bitte zuerst Client ID und Secret ausfuellen
            </p>
          );
        }

        const handleOAuthConnect = async () => {
          if (!oauthField) return;

          // Get server-signed OAuth state (HMAC-signed to prevent CSRF/forgery)
          const returnPath = window.location.pathname + window.location.search;
          let state: string;
          try {
            const stateRes = await fetch("/api/enhanced/oauth/state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pluginId: pluginType,
                connectionId: editingConnection?.id || 0,
                returnUrl: returnPath,
              }),
            });
            if (!stateRes.ok) throw new Error("Failed to create OAuth state");
            const stateData = await stateRes.json();
            state = stateData.state;
          } catch (err) {
            console.error("Failed to create signed OAuth state:", err);
            return;
          }

          const redirectUri = `${window.location.origin}/api/enhanced/oauth/callback`;

          const params = new URLSearchParams({
            client_id: oauthClientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: oauthField.scopes.join(" "),
            state,
          });

          window.open(`${oauthField.authUrl}?${params.toString()}`, "_blank");
        };

        return (
          <Button
            type="button"
            variant="outline"
            onClick={handleOAuthConnect}
            className="w-full"
          >
            {field.label}
          </Button>
        );
      }
      default:
        return (
          <Input
            id={field.key}
            type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Apps verwalten</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {connections.length} Verbindung{connections.length !== 1 ? "en" : ""}
          </span>
          <Button size="sm" onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Neue Verbindung
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {connections.map((connection) => {
          const plugin = getPlugin(connection.pluginType);
          return (
            <div
              key={connection.id}
              className="glass-card flex items-center gap-4 p-4 cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => openEditDialog(connection)}
            >
              <AppIcon
                appName={connection.icon || connection.name}
                color={connection.color}
                size={40}
                customIcon={connection.customIconSvg}
                className="rounded-lg shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {connection.pluginType !== "standard" && (() => {
                    const status = healthStatus.get(connection.id);
                    return (
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          status === "online"
                            ? "bg-emerald-500"
                            : status === "offline"
                              ? "bg-red-500"
                              : status === "checking"
                                ? "bg-gray-400 animate-pulse"
                                : "bg-gray-400"
                        }`}
                        title={
                          status === "online"
                            ? "API erreichbar"
                            : status === "offline"
                              ? "API nicht erreichbar"
                              : "Pruefe..."
                        }
                      />
                    );
                  })()}
                  {connection.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {connection.url || "Keine URL"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plugin && (
                  <Badge variant="secondary" className="text-xs">
                    Enhanced
                  </Badge>
                )}
                {connection.tileCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {connection.tileCount} Tile{connection.tileCount !== 1 ? "s" : ""}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(connection);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(connection);
                  }}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {connections.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">Noch keine App-Verbindungen vorhanden.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Erstelle eine neue Verbindung oder fuege eine Enhanced App auf dem Dashboard hinzu.
            </p>
            <Link
              href="/"
              className="text-primary text-sm mt-3 inline-block hover:underline"
            >
              Zurueck zum Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* ─── Edit / New Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-surface sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {isNew ? "Neue Verbindung" : "Verbindung bearbeiten"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="grid gap-4 py-4">
              {/* Plugin selector (new only) */}
              {isNew && (
                <div className="space-y-1.5">
                  <Label>Plugin Typ</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {allPlugins.map((p) => (
                      <button
                        key={p.metadata.id}
                        onClick={() => handlePluginSelect(p.metadata.id)}
                        className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-colors border-2 ${
                          pluginType === p.metadata.id
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-accent"
                        }`}
                      >
                        <AppIcon
                          appName={p.metadata.icon}
                          color={p.metadata.color}
                          size={28}
                          className="rounded-md"
                        />
                        <span className="text-foreground truncate w-full text-center">
                          {p.metadata.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Icon + Name row */}
              <div className="flex gap-3 items-end">
                <div className="shrink-0">
                  <AppIcon
                    appName={icon || name || "?"}
                    color={color}
                    size={56}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="conn-name">Name</Label>
                  <Input
                    id="conn-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="App Name"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="conn-desc">Beschreibung</Label>
                <Input
                  id="conn-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <Label htmlFor="conn-url">{matchedPlugin ? "Server-URL (API)" : "URL"}</Label>
                <p className="text-xs text-muted-foreground">
                  {matchedPlugin
                    ? "Adresse des Servers fuer die API-Verbindung"
                    : "Webadresse der App"}
                </p>
                <Input
                  id="conn-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Color */}
              <div className="space-y-1.5">
                <Label>Farbe</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      aria-label={`Farbe ${c}`}
                      className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        color === c
                          ? "border-white scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-7 w-12 cursor-pointer p-0 border-0"
                  />
                </div>
              </div>

              {/* Plugin config fields (API Key, Password, etc.) */}
              {matchedPlugin && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Verbindungsdaten</Label>
                  {matchedPlugin.configFields
                    .filter((f) => {
                      // Show connection-related fields: apiUrl is handled by URL field above
                      const CONNECTION_KEYS = new Set([
                        "apiKey",
                        "accessToken",
                        "username",
                        "password",
                      ]);
                      return CONNECTION_KEYS.has(f.key) || f.required;
                    })
                    .filter((f) => f.key !== "apiUrl") // apiUrl handled by URL field
                    .map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={field.key}>
                          {field.label}
                          {field.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        {renderConfigField(field)}
                        {field.description && (
                          <p className="text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        )}
                      </div>
                    ))}

                  {/* Test Connection Button */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTesting || !url}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Teste...
                        </>
                      ) : (
                        <>
                          <Wifi className="mr-2 h-4 w-4" />
                          Verbindung testen
                        </>
                      )}
                    </Button>
                    {testResult && (
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          testResult.success
                            ? "text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span>
                          {testResult.success
                            ? testResult.message
                            : testResult.error}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || !pluginType || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : isNew ? (
                "Erstellen"
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Loeschen bestaetigen"
        message={
          deleteConfirm
            ? `"${deleteConfirm.name}" und alle zugehoerigen Tiles wirklich loeschen?`
            : ""
        }
        confirmLabel="Loeschen"
        cancelLabel="Abbrechen"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
      />
    </div>
  );
}
