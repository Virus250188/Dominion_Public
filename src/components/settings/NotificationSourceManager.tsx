"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  Plus,
  ArrowLeft,
  Copy,
  RefreshCw,
  Trash2,
  Loader2,
  Check,
  Rss,
  AppWindow,
} from "lucide-react";
import {
  createNotificationSource,
  updateNotificationSource,
  deleteNotificationSource,
  regenerateApiKey,
} from "@/lib/actions/notifications";
import { PRESET_COLORS } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────────

export interface NotificationSourceItem {
  id: number;
  sourceId: string;
  name: string;
  type: string;
  icon: string | null;
  color: string;
  enabled: boolean;
  apiKey: string;
  rssUrl: string | null;
  rssInterval: number | null;
  rateLimit: number;
  createdAt: string;
  totalNotifications: number;
}

type FilterTab = "all" | "active" | "paused";

interface Props {
  initialSources: NotificationSourceItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

function maskApiKey(key: string): string {
  if (key.length <= 10) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────────────────────

export function NotificationSourceManager({ initialSources }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── List state ──
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Add dialog ──
  const [addOpen, setAddOpen] = useState(false);
  const [addSourceId, setAddSourceId] = useState("");
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState("app");
  const [addIcon, setAddIcon] = useState("");
  const [addColor, setAddColor] = useState("#6366f1");
  const [addRssUrl, setAddRssUrl] = useState("");
  const [addRssInterval, setAddRssInterval] = useState("15");
  const [addSaving, setAddSaving] = useState(false);

  // ── Detail state ──
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editRateLimit, setEditRateLimit] = useState<string>("");
  const [rateLimitSaving, setRateLimitSaving] = useState(false);

  // ── Delete confirmation ──
  const [deleteConfirm, setDeleteConfirm] = useState<NotificationSourceItem | null>(null);

  // ── Derived ──
  const sources = initialSources;
  const selected = selectedId !== null ? sources.find((s) => s.id === selectedId) ?? null : null;

  const filteredSources = sources.filter((s) => {
    if (filter === "active") return s.enabled;
    if (filter === "paused") return !s.enabled;
    return true;
  });

  // ── Handlers ──

  const handleToggleEnabled = (source: NotificationSourceItem) => {
    startTransition(async () => {
      await updateNotificationSource(source.id, { enabled: !source.enabled });
      router.refresh();
    });
  };

  const handleSelectSource = (source: NotificationSourceItem) => {
    setSelectedId(source.id);
    setKeyRevealed(false);
    setKeyCopied(false);
    setEditRateLimit(String(source.rateLimit));
  };

  const handleBack = () => {
    setSelectedId(null);
    setKeyRevealed(false);
    setKeyCopied(false);
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleRegenerateKey = (id: number) => {
    setRegenerating(true);
    startTransition(async () => {
      await regenerateApiKey(id);
      setRegenerating(false);
      setKeyRevealed(false);
      router.refresh();
    });
  };

  const handleSaveRateLimit = (id: number) => {
    const value = parseInt(editRateLimit, 10);
    if (isNaN(value) || value < 1) return;
    setRateLimitSaving(true);
    startTransition(async () => {
      await updateNotificationSource(id, { rateLimit: value });
      setRateLimitSaving(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    startTransition(async () => {
      await deleteNotificationSource(id);
      setDeleteConfirm(null);
      setSelectedId(null);
      router.refresh();
    });
  };

  const openAddDialog = () => {
    setAddSourceId("");
    setAddName("");
    setAddType("app");
    setAddIcon("");
    setAddColor("#6366f1");
    setAddRssUrl("");
    setAddRssInterval("15");
    setAddSaving(false);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!addSourceId.trim() || !addName.trim()) return;
    setAddSaving(true);
    try {
      await createNotificationSource({
        sourceId: addSourceId.trim(),
        name: addName.trim(),
        type: addType,
        icon: addIcon.trim() || undefined,
        color: addColor,
        rssUrl: addType === "rss" ? addRssUrl.trim() || undefined : undefined,
        rssInterval: addType === "rss" ? parseInt(addRssInterval, 10) : undefined,
      });
      setAddOpen(false);
      router.refresh();
    } finally {
      setAddSaving(false);
    }
  };

  // ─── Detail View ──────────────────────────────────────────────────────

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zur Liste
        </button>

        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: selected.color }}
            >
              {selected.icon ? selected.icon.charAt(0).toUpperCase() : selected.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">{selected.sourceId}</p>
            </div>
            <Badge variant={selected.type === "rss" ? "secondary" : "outline"}>
              {selected.type === "rss" ? "RSS" : "App"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Registriert</span>
              <p className="font-medium">{formatDate(selected.createdAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Benachrichtigungen</span>
              <p className="font-medium">{selected.totalNotifications}</p>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="glass-card p-6 space-y-3">
          <Label className="text-sm font-medium">API-Schluessel</Label>
          <div className="flex items-center gap-2">
            <code className="glass-surface flex-1 rounded-lg px-3 py-2 text-sm font-mono truncate">
              {keyRevealed ? selected.apiKey : maskApiKey(selected.apiKey)}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKeyRevealed(!keyRevealed)}
            >
              {keyRevealed ? "Verbergen" : "Anzeigen"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyKey(selected.apiKey)}
            >
              {keyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerateKey(selected.id)}
            disabled={regenerating}
            className="mt-2"
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Neu generieren
          </Button>
          <p className="text-xs text-muted-foreground">
            Der alte Schluessel wird sofort ungueltig.
          </p>
        </div>

        {/* Rate Limit */}
        <div className="glass-card p-6 space-y-3">
          <Label className="text-sm font-medium">Rate Limit</Label>
          <p className="text-xs text-muted-foreground">
            Maximale Benachrichtigungen pro Minute
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={editRateLimit}
              onChange={(e) => setEditRateLimit(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">pro Minute</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveRateLimit(selected.id)}
              disabled={rateLimitSaving || editRateLimit === String(selected.rateLimit)}
            >
              {rateLimitSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Speichern"
              )}
            </Button>
          </div>
        </div>

        {/* RSS Info */}
        {selected.type === "rss" && (
          <div className="glass-card p-6 space-y-3">
            <Label className="text-sm font-medium">RSS Konfiguration</Label>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Feed-URL</span>
                <p className="font-mono text-xs break-all">{selected.rssUrl || "Nicht konfiguriert"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Abfrageintervall</span>
                <p>{selected.rssInterval ? `${selected.rssInterval} Minuten` : "Standard"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="glass-card p-6 border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Quelle loeschen</p>
              <p className="text-xs text-muted-foreground">
                Alle Benachrichtigungen dieser Quelle werden ebenfalls geloescht.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirm(selected)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Loeschen
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={deleteConfirm !== null}
          title="Quelle loeschen"
          message={
            deleteConfirm
              ? `"${deleteConfirm.name}" und alle zugehoerigen Benachrichtigungen wirklich loeschen?`
              : ""
          }
          confirmLabel="Loeschen"
          cancelLabel="Abbrechen"
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {sources.length} Quelle{sources.length !== 1 ? "n" : ""}
          </span>
        </div>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Neue Quelle
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-[3px] w-fit">
        {([
          ["all", "Alle"],
          ["active", "Aktiv"],
          ["paused", "Pausiert"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              filter === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Source cards */}
      <div className="space-y-2">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className="glass-card flex items-center gap-4 p-4 cursor-pointer hover:border-primary/30 transition-all"
            onClick={() => handleSelectSource(source)}
          >
            {/* Icon */}
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: source.color }}
            >
              {source.icon ? source.icon.charAt(0).toUpperCase() : source.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {source.name}
                </span>
                <Badge variant={source.type === "rss" ? "secondary" : "outline"} className="shrink-0">
                  {source.type === "rss" ? "RSS" : "App"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{source.sourceId}</span>
                <span>{formatDate(source.createdAt)}</span>
                <span>{source.totalNotifications} Benachrichtigung{source.totalNotifications !== 1 ? "en" : ""}</span>
              </div>
            </div>

            {/* Toggle */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <Switch
                checked={source.enabled}
                onCheckedChange={() => handleToggleEnabled(source)}
                size="sm"
              />
            </div>
          </div>
        ))}

        {filteredSources.length === 0 && sources.length > 0 && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Keine Quellen fuer diesen Filter gefunden.
            </p>
          </div>
        )}

        {sources.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">Noch keine Benachrichtigungsquellen vorhanden.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Erstelle eine neue Quelle, um Benachrichtigungen zu empfangen.
            </p>
          </div>
        )}
      </div>

      {/* ─── Add Source Dialog ─────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-surface sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Neue Benachrichtigungsquelle</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-3">
            <div className="grid gap-4 py-4">
              {/* Source ID */}
              <div className="space-y-1.5">
                <Label htmlFor="add-source-id">Quell-ID</Label>
                <Input
                  id="add-source-id"
                  value={addSourceId}
                  onChange={(e) => setAddSourceId(e.target.value)}
                  placeholder="z.B. truenas, n8n, homeassistant"
                />
                <p className="text-xs text-muted-foreground">
                  Eindeutige Kennung fuer diese Quelle
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="z.B. TrueNAS Alerts"
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Typ</Label>
                <Select value={addType} onValueChange={(v) => v && setAddType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app">
                      <div className="flex items-center gap-2">
                        <AppWindow className="h-4 w-4" />
                        App
                      </div>
                    </SelectItem>
                    <SelectItem value="rss">
                      <div className="flex items-center gap-2">
                        <Rss className="h-4 w-4" />
                        RSS
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Icon */}
              <div className="space-y-1.5">
                <Label htmlFor="add-icon">Icon (optional)</Label>
                <Input
                  id="add-icon"
                  value={addIcon}
                  onChange={(e) => setAddIcon(e.target.value)}
                  placeholder="z.B. server, bell, rss"
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
                        addColor === c
                          ? "border-white scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setAddColor(c)}
                    />
                  ))}
                  <Input
                    type="color"
                    value={addColor}
                    onChange={(e) => setAddColor(e.target.value)}
                    className="h-7 w-12 cursor-pointer p-0 border-0"
                  />
                </div>
              </div>

              {/* RSS fields */}
              {addType === "rss" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-rss-url">Feed-URL</Label>
                    <Input
                      id="add-rss-url"
                      type="url"
                      value={addRssUrl}
                      onChange={(e) => setAddRssUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Abfrageintervall</Label>
                    <Select value={addRssInterval} onValueChange={(v) => v && setAddRssInterval(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Alle 5 Minuten</SelectItem>
                        <SelectItem value="15">Alle 15 Minuten</SelectItem>
                        <SelectItem value="30">Alle 30 Minuten</SelectItem>
                        <SelectItem value="60">Alle 60 Minuten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addSourceId.trim() || !addName.trim() || addSaving}
            >
              {addSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Erstelle...
                </>
              ) : (
                "Erstellen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Quelle loeschen"
        message={
          deleteConfirm
            ? `"${deleteConfirm.name}" und alle zugehoerigen Benachrichtigungen wirklich loeschen?`
            : ""
        }
        confirmLabel="Loeschen"
        cancelLabel="Abbrechen"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
