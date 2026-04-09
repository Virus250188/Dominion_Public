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
  Key,
  Link,
  AlertCircle,
} from "lucide-react";
import {
  createNotificationSource,
  updateNotificationSource,
  deleteNotificationSource,
  regenerateApiKey,
} from "@/lib/actions/notifications";
import { PRESET_COLORS } from "@/lib/constants";
import { IconPicker } from "@/components/dashboard/IconPicker";

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
  appConnectionId?: number | null;
  createdAt: string;
  totalNotifications: number;
}

type FilterTab = "all" | "active" | "paused";

interface AppConnectionInfo {
  id: number;
  name: string;
  pluginType: string;
  icon: string | null;
  color: string | null;
  url: string | null;
}

interface NotificationSourceManagerProps {
  initialSources: NotificationSourceItem[];
  appConnections?: AppConnectionInfo[];
  registeredAppConnectionIds?: number[];
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

export function NotificationSourceManager({
  initialSources,
  appConnections = [],
  registeredAppConnectionIds = [],
}: NotificationSourceManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── List state ──
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ── Wizard state ──
  type WizardStep = "closed" | "select-type" | "rss-form" | "app-select" | "api-key-form" | "api-key-result" | "app-connect";
  const [wizardStep, setWizardStep] = useState<WizardStep>("closed");

  // Form fields
  const [addName, setAddName] = useState("");
  const [addIcon, setAddIcon] = useState("");
  const [addIconUrl, setAddIconUrl] = useState("");
  const [addColor, setAddColor] = useState("#6366f1");
  const [addRssUrl, setAddRssUrl] = useState("");
  const [addRssInterval, setAddRssInterval] = useState("15");
  const [addRssCategory, setAddRssCategory] = useState("info");
  const [addError, setAddError] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // API Key result screen
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [createdName, setCreatedName] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // ── Detail state ──
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editRateLimit, setEditRateLimit] = useState<string>("");
  const [rateLimitSaving, setRateLimitSaving] = useState(false);

  // ── Delete confirmation ──
  const [deleteConfirm, setDeleteConfirm] = useState<NotificationSourceItem | null>(null);

  // ── Derived ──
  const [sources, setSources] = useState(initialSources);
  const selected = selectedId !== null ? sources.find((s) => s.id === selectedId) ?? null : null;

  const filteredSources = sources.filter((s) => {
    if (filter === "active") return s.enabled;
    if (filter === "paused") return !s.enabled;
    return true;
  });

  const nameIsDuplicate =
    addName.trim() !== "" &&
    sources.some((s) => s.name.toLowerCase() === addName.trim().toLowerCase());

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

  function resetWizard() {
    setWizardStep("closed");
    setAddName("");
    setAddIcon("");
    setAddIconUrl("");
    setAddColor("#6366f1");
    setAddRssUrl("");
    setAddRssInterval("15");
    setAddRssCategory("info");
    setAddError("");
    setCreatedApiKey("");
    setCreatedName("");
    setCopiedKey(false);
    setCopiedCurl(false);
  }

  function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function copyToClipboard(text: string, type: "key" | "curl") {
    await navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  }

  const effectiveIcon = addIconUrl || addIcon;

  async function handleAddApiKey() {
    if (!addName.trim()) { setAddError("Name ist erforderlich"); return; }
    setAddError("");
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await createNotificationSource({
        sourceId: slugify(addName),
        name: addName.trim(),
        type: "app",
        icon: effectiveIcon || undefined,
        color: addColor,
      });
      if (result.error) {
        setAddError(result.error);
        return;
      }
      setCreatedApiKey(result.apiKey);
      setCreatedName(result.name);
      setSources((prev) => [{ ...result, createdAt: new Date().toISOString(), totalNotifications: 0 }, ...prev]);
      setWizardStep("api-key-result");
    });
  }

  async function handleAddRss() {
    if (!addRssUrl.trim()) { setAddError("Feed URL ist erforderlich"); return; }
    if (!addName.trim()) { setAddError("Anzeigename ist erforderlich"); return; }
    setAddError("");
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await createNotificationSource({
        sourceId: slugify(addName),
        name: addName.trim(),
        type: "rss",
        icon: effectiveIcon || undefined,
        color: addColor,
        rssUrl: addRssUrl.trim(),
        rssInterval: parseInt(addRssInterval, 10),
        defaultCategory: addRssCategory,
      });
      if (result.error) {
        setAddError(result.error);
        return;
      }
      setSources((prev) => [{ ...result, createdAt: new Date().toISOString(), totalNotifications: 0 }, ...prev]);
      resetWizard();
      router.refresh();
    });
  }

  async function handleConnectApp(conn: AppConnectionInfo) {
    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await createNotificationSource({
        sourceId: slugify(conn.name),
        name: conn.name,
        type: "app",
        icon: conn.icon || undefined,
        color: conn.color || "#6366f1",
        appConnectionId: conn.id,
      });
      if (result.error) {
        setAddError(result.error);
        return;
      }
      setSources((prev) => [{ ...result, createdAt: new Date().toISOString(), totalNotifications: 0 }, ...prev]);
      resetWizard();
      router.refresh();
    });
  }

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
            Maximale Benachrichtigungen pro Stunde
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={editRateLimit}
              onChange={(e) => setEditRateLimit(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">pro Stunde</span>
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
        <Button onClick={() => setWizardStep("select-type")} size="sm">
          <Plus className="mr-2 h-4 w-4" />
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

      {/* ─── Wizard Dialog ─────────────────────────────────────────── */}
      <Dialog open={wizardStep !== "closed"} onOpenChange={(open) => { if (!open) resetWizard(); }}>
        <DialogContent className="glass-surface sm:max-w-[480px]">

          {/* ── Step: Select Type ── */}
          {wizardStep === "select-type" && (
            <>
              <DialogHeader>
                <DialogTitle>Neue Benachrichtigungsquelle</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <button
                  onClick={() => { setAddColor("#f97316"); setWizardStep("rss-form"); }}
                  className="glass-card flex flex-col items-center gap-3 rounded-xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer"
                >
                  <Rss className="h-10 w-10 text-primary" />
                  <div className="text-center">
                    <div className="font-medium text-foreground">RSS Feed</div>
                    <div className="text-xs text-muted-foreground mt-1">Nachrichten von Blogs, News oder Service-Feeds automatisch empfangen</div>
                  </div>
                </button>
                <button
                  onClick={() => setWizardStep("app-select")}
                  className="glass-card flex flex-col items-center gap-3 rounded-xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer"
                >
                  <AppWindow className="h-10 w-10 text-primary" />
                  <div className="text-center">
                    <div className="font-medium text-foreground">App</div>
                    <div className="text-xs text-muted-foreground mt-1">API-Key generieren oder Enhanced App verbinden</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Step: App Select ── */}
          {wizardStep === "app-select" && (
            <>
              <DialogHeader>
                <DialogTitle>App-Quelle einrichten</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <button
                  onClick={() => setWizardStep("api-key-form")}
                  className="glass-card flex flex-col items-center gap-3 rounded-xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer"
                >
                  <Key className="h-10 w-10 text-primary" />
                  <div className="text-center">
                    <div className="font-medium text-foreground">API Key generieren</div>
                    <div className="text-xs text-muted-foreground mt-1">Fuer externe Services wie N8N, Uptime Kuma oder eigene Skripte</div>
                  </div>
                </button>
                <button
                  onClick={() => setWizardStep("app-connect")}
                  className="glass-card flex flex-col items-center gap-3 rounded-xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer"
                >
                  <Link className="h-10 w-10 text-primary" />
                  <div className="text-center">
                    <div className="font-medium text-foreground">App verbinden</div>
                    <div className="text-xs text-muted-foreground mt-1">Installierte Enhanced App fuer Benachrichtigungen aktivieren</div>
                  </div>
                </button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWizardStep("select-type")}>
                  Zurueck
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step: RSS Form ── */}
          {wizardStep === "rss-form" && (
            <>
              <DialogHeader>
                <DialogTitle>RSS Feed hinzufuegen</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-3">
                <div className="grid gap-4 py-4">
                  {addError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {addError}
                    </div>
                  )}

                  {/* Feed URL */}
                  <div className="space-y-1.5">
                    <Label htmlFor="add-rss-url">Feed URL</Label>
                    <Input
                      id="add-rss-url"
                      type="url"
                      value={addRssUrl}
                      onChange={(e) => setAddRssUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="add-name">Anzeigename</Label>
                    <Input
                      id="add-name"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="z.B. TrueNAS Blog"
                    />
                    {addName.trim() && sources.some((s) => s.name.toLowerCase() === addName.trim().toLowerCase()) && (
                      <p className="text-[11px] text-destructive mt-1">Dieser Name ist bereits vergeben</p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label>Kategorie</Label>
                    <Select value={addRssCategory} onValueChange={(v) => v && setAddRssCategory(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Interval */}
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

                  {/* Icon */}
                  <div className="space-y-1.5">
                    <Label>Icon (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIconPickerOpen(true)}
                        className="shrink-0"
                      >
                        {addIcon ? (
                          <img src={addIcon} alt="icon" className="h-4 w-4 mr-1" />
                        ) : (
                          "Icon waehlen"
                        )}
                      </Button>
                      <Input
                        value={addIconUrl}
                        onChange={(e) => { setAddIconUrl(e.target.value); setAddIcon(""); }}
                        placeholder="oder Icon-URL eingeben"
                        className="flex-1"
                      />
                    </div>
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
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddError(""); setWizardStep("select-type"); }}>
                  Zurueck
                </Button>
                <Button onClick={handleAddRss} disabled={isPending || nameIsDuplicate}>
                  Feed hinzufuegen
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step: API Key Form ── */}
          {wizardStep === "api-key-form" && (
            <>
              <DialogHeader>
                <DialogTitle>API Key generieren</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-3">
                <div className="grid gap-4 py-4">
                  {addError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {addError}
                    </div>
                  )}

                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="add-api-name">Anzeigename</Label>
                    <Input
                      id="add-api-name"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="z.B. N8N Workflows"
                    />
                    {addName.trim() && sources.some((s) => s.name.toLowerCase() === addName.trim().toLowerCase()) && (
                      <p className="text-[11px] text-destructive mt-1">Dieser Name ist bereits vergeben</p>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="space-y-1.5">
                    <Label>Icon (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIconPickerOpen(true)}
                        className="shrink-0"
                      >
                        {addIcon ? (
                          <img src={addIcon} alt="icon" className="h-4 w-4 mr-1" />
                        ) : (
                          "Icon waehlen"
                        )}
                      </Button>
                      <Input
                        value={addIconUrl}
                        onChange={(e) => { setAddIconUrl(e.target.value); setAddIcon(""); }}
                        placeholder="oder Icon-URL eingeben"
                        className="flex-1"
                      />
                    </div>
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
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddError(""); setWizardStep("app-select"); }}>
                  Zurueck
                </Button>
                <Button onClick={handleAddApiKey} disabled={isPending || nameIsDuplicate}>
                  Erstellen
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Step: API Key Result ── */}
          {wizardStep === "api-key-result" && (() => {
            const curlExample = `curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/notifications \\
  -H "Content-Type: application/json" \\
  -H "X-Notification-Key: ${createdApiKey}" \\
  -d '{"title":"Test","message":"Hello!","category":"info"}'`;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Quelle erstellt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{createdName}</strong> wurde erstellt.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>API Key</Label>
                    <code className="glass-surface block w-full rounded-lg px-3 py-2 text-sm font-mono break-all">
                      {createdApiKey}
                    </code>
                    <p className="flex items-center gap-1 text-xs text-amber-500">
                      <AlertCircle className="h-3 w-3" />
                      Diesen Schluessel jetzt kopieren — er wird nicht erneut angezeigt.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Beispiel (curl)</Label>
                    <pre className="glass-surface rounded-lg px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all">
                      {curlExample}
                    </pre>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyToClipboard(createdApiKey, "key")}
                    >
                      {copiedKey ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      Key kopieren
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyToClipboard(curlExample, "curl")}
                    >
                      {copiedCurl ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      curl kopieren
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => { resetWizard(); router.refresh(); }}>
                    Fertig
                  </Button>
                </DialogFooter>
              </>
            );
          })()}

          {/* ── Step: App Connect ── */}
          {wizardStep === "app-connect" && (
            <>
              <DialogHeader>
                <DialogTitle>App verbinden</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-3">
                <div className="py-4">
                  {addError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive mb-4">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {addError}
                    </div>
                  )}

                  {appConnections.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Link className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Noch keine installierten Apps unterstuetzen Benachrichtigungen.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enhanced Apps koennen diese Funktion in ihrem Plugin aktivieren.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {appConnections.map((conn) => {
                        const isRegistered = registeredAppConnectionIds.includes(conn.id);
                        return (
                          <button
                            key={conn.id}
                            disabled={isRegistered}
                            onClick={() => handleConnectApp(conn)}
                            className={`glass-card flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition-all ${
                              isRegistered
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:border-primary/40 cursor-pointer"
                            }`}
                          >
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                              style={{ backgroundColor: conn.color || "#6366f1" }}
                            >
                              {conn.icon ? (
                                <img src={conn.icon} alt="" className="h-5 w-5" />
                              ) : (
                                conn.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {conn.name}
                                </span>
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {conn.pluginType}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {conn.url}
                              </p>
                            </div>
                            {isRegistered && (
                              <span className="text-xs text-muted-foreground shrink-0">Bereits registriert</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddError(""); setWizardStep("app-select"); }}>
                  Zurueck
                </Button>
              </DialogFooter>
            </>
          )}

        </DialogContent>
      </Dialog>

      {/* ─── Icon Picker ─────────────────────────────────────────────── */}
      <IconPicker
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        onSelect={(icon) => {
          setAddIcon(`https://cdn.simpleicons.org/${icon.slug}`);
          setAddIconUrl("");
        }}
      />

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
