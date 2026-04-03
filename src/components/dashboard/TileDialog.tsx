"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TileData } from "@/types/tile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Loader2,
  Wifi,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Info,
  AppWindow,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppIcon } from "./AppIcon";
import { createGroup } from "@/lib/actions/groups";
import { createAppConnection } from "@/lib/actions/appConnections";
import { getAllPlugins, getPlugin } from "@/plugins/registry";
import type { AppPlugin, TileSize, ConfigField, CrawlEntityGroup } from "@/plugins/types";
import { fuzzyMatchIcon } from "@/lib/icons";

// ─── Entity Picker Types ────────────────────────────────────────────────
interface SelectedEntity {
  id: string;
  label: string;
}

export interface GroupData {
  id: number;
  title: string;
  order: number;
}

interface FoundationAppData {
  id: number;
  name: string;
  icon: string;
  color: string;
  website: string | null;
  description: string | null;
  category: string | null;
  enhanced: boolean;
}

// Preset colors
const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#64748b",
];

// Size definitions with new mapping
const SIZE_DEFS: { size: TileSize; label: string; cols: number; rows: number }[] = [
  { size: "1x1", label: "Klein 1x1", cols: 1, rows: 1 },
  { size: "2x1", label: "Medium 2x1", cols: 2, rows: 1 },
  { size: "2x2", label: "Widget 2x2", cols: 2, rows: 2 },
];

// Stat limits per size
const STAT_LIMITS: Record<TileSize, number> = {
  "1x1": 3,
  "2x1": 6,
  "2x2": 6,
};

// Size description text for stat options
const SIZE_DESCRIPTIONS: Record<TileSize, string> = {
  "1x1": "Maximal 3 Anzeige Optionen",
  "2x1": "Maximal 6 Anzeige Optionen oder ein mini widget + 3 infos",
  "2x2": "1 Widget 2x2 oder 2x mini Widgets + infos",
};

// Size hints shown below the size selector buttons
const SIZE_HINTS: Record<TileSize, string> = {
  "1x1": "Info-Panel \u2013 Zeigt bis zu 3 Statistiken",
  "2x1": "Mini Widget \u2013 Kompakte Medienvorschau",
  "2x2": "Widget \u2013 Vollstaendige Medienansicht mit Karussell",
};

interface AppConnectionSummary {
  id: number;
  pluginType: string;
  name: string;
  icon: string | null;
  customIconSvg: string | null;
  color: string;
  url: string | null;
  description: string | null;
}

interface TileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tile: TileData | null;
  foundationApps: FoundationAppData[];
  appConnections?: AppConnectionSummary[];
  groups: GroupData[];
  onGroupsChange?: (groups: GroupData[]) => void;
  onSave: (data: {
    title: string;
    url: string;
    color: string;
    icon: string;
    description: string;
    type: "standard" | "enhanced";
    enhancedType: string;
    enhancedConfig: string;
    columnSpan: number;
    rowSpan: number;
    groupId: number | null;
    customIconSvg?: string | null;
    appConnectionId?: number | null;
  }) => void;
  onOpenGroupDialog?: () => void;
}

export function TileDialog({ open, onOpenChange, tile, foundationApps, appConnections = [], groups, onGroupsChange, onSave, onOpenGroupDialog }: TileDialogProps) {
  // Dialog mode: "select" for new tile mode chooser, "app" for app form, "group" for group placeholder
  const [dialogMode, setDialogMode] = useState<"select" | "app" | "group">("select");

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"standard" | "enhanced">("standard");
  const [enhancedType, setEnhancedType] = useState("");
  const [enhancedConfig, setEnhancedConfig] = useState<Record<string, unknown>>({});
  const [foundationSearch, setFoundationSearch] = useState("");
  const [showFoundation, setShowFoundation] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [selectedStats, setSelectedStats] = useState<string[]>([]);
  const [columnSpan, setColumnSpan] = useState(1);
  const [rowSpan, setRowSpan] = useState(1);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [enhancedEnabled, setEnhancedEnabled] = useState(false);

  // Connection tested gate: options only visible after successful test
  const [connectionTested, setConnectionTested] = useState(false);

  // Entity crawler state (for plugins with crawlEntities support like HA)
  const [crawledGroups, setCrawledGroups] = useState<CrawlEntityGroup[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([]);
  const [entitySearch, setEntitySearch] = useState("");
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Linked AppConnection for enhanced tiles
  const [linkedConnectionId, setLinkedConnectionId] = useState<number | null>(null);

  // Connection mode for new enhanced tiles: "select" existing or "new" connection
  const [connectionMode, setConnectionMode] = useState<"select" | "new">("select");

  // Custom icon upload state
  const [customIconSvg, setCustomIconSvg] = useState<string | null>(null);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detection state (icon/color only, NOT enhanced type)
  const [iconDetected, setIconDetected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL reachability state
  const [urlChecking, setUrlChecking] = useState(false);
  const [urlReachable, setUrlReachable] = useState<boolean | null>(null);

  // Get matched plugin
  const matchedPlugin: AppPlugin | undefined = enhancedType ? getPlugin(enhancedType) : undefined;

  // Current tile size key derived from columnSpan/rowSpan
  const currentSize: TileSize =
    columnSpan >= 2 && rowSpan >= 2 ? "2x2" :
    columnSpan >= 2 ? "2x1" :
    "1x1";

  // Whether we are editing an enhanced tile with an AppConnection
  const isEditingEnhancedWithConnection = !!(tile && tile.type === "enhanced" && tile.appConnectionId);

  // Reset form when tile changes
  useEffect(() => {
    if (tile) {
      setDialogMode("app"); // editing always goes to app mode
      setTitle(tile.title);
      setUrl(tile.url);
      setColor(tile.color);
      setIcon(tile.icon || "");
      setDescription(tile.description || "");
      setType(tile.type as "standard" | "enhanced");
      setEnhancedType(tile.enhancedType || "");
      setEnhancedEnabled(tile.type === "enhanced");
      setHasPluginMatch(tile.type === "enhanced" && !!tile.enhancedType);
      setColumnSpan(tile.columnSpan ?? 1);
      setRowSpan(tile.rowSpan ?? 1);
      setGroupId(tile.groupId ?? null);
      setCustomIconSvg(tile.customIconSvg ?? null);
      setLinkedConnectionId(tile.appConnectionId ?? null);
      setIconDetected(true); // assume detected if editing
      try {
        setEnhancedConfig(tile.enhancedConfig ? JSON.parse(tile.enhancedConfig) : {});
      } catch {
        setEnhancedConfig({});
      }
    } else {
      setDialogMode("select"); // new tile starts at mode selection
      setTitle("");
      setUrl("");
      setColor("#6366f1");
      setIcon("");
      setDescription("");
      setType("standard");
      setEnhancedType("");
      setEnhancedEnabled(false);
      setEnhancedConfig({});
      setColumnSpan(1);
      setRowSpan(1);
      setGroupId(null);
      setIconDetected(false);
      setHasPluginMatch(false);
      setCustomIconSvg(null);
      setLinkedConnectionId(null);
      setConnectionMode("select");
    }
    setIconUploadError(null);
    setShowFoundation(false);
    setFoundationSearch("");
    setTestResult(null);
    setIsTesting(false);
    setSelectedStats([]);
    setShowNewGroup(false);
    setNewGroupTitle("");
    setUrlChecking(false);
    setUrlReachable(null);
    setConnectionTested(false);
    setCrawledGroups([]);
    setIsCrawling(false);
    setEntitySearch("");
    setExpandedDomains(new Set());
    // Restore selectedEntities from saved config when editing
    if (tile && tile.enhancedConfig) {
      try {
        const cfg = JSON.parse(tile.enhancedConfig);
        if (cfg.selectedEntities) {
          // Handle both formats: native array (new) or JSON string (old DB data)
          const entities = Array.isArray(cfg.selectedEntities)
            ? cfg.selectedEntities
            : JSON.parse(cfg.selectedEntities);
          if (Array.isArray(entities)) {
            setSelectedEntities(entities);
          } else {
            setSelectedEntities([]);
          }
        } else {
          setSelectedEntities([]);
        }
      } catch {
        setSelectedEntities([]);
      }
      // If editing an existing enhanced tile, consider it already tested
      if (tile.type === "enhanced" && tile.enhancedType) {
        setConnectionTested(true);
      }
    } else {
      setSelectedEntities([]);
    }
  }, [tile, open]);

  // Initialize selectedStats when enhancedType changes or when editing a tile
  useEffect(() => {
    if (enhancedType) {
      const plugin = getPlugin(enhancedType);
      if (!plugin) return;
      const options = plugin.statOptions;
      if (options.length === 0) return;
      const defaults = options.filter(o => o.defaultEnabled).map(o => o.key);
      // Check if tile has a saved selection
      if (enhancedConfig.visibleStats) {
        try {
          // Handle both formats: native array (new) or JSON string (old DB data)
          const parsed = Array.isArray(enhancedConfig.visibleStats)
            ? enhancedConfig.visibleStats
            : JSON.parse(enhancedConfig.visibleStats as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedStats(parsed);
            return;
          }
        } catch {
          // fall through to defaults
        }
      }
      setSelectedStats(defaults);
    }
  }, [enhancedType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset connectionTested when config credentials change
  useEffect(() => {
    setConnectionTested(false);
    setCrawledGroups([]);
    setSelectedEntities([]);
  }, [enhancedConfig.apiUrl, enhancedConfig.apiKey, enhancedConfig.accessToken]);

  // Trim selectedEntities and selectedStats when size changes
  useEffect(() => {
    const limit = STAT_LIMITS[currentSize] ?? 3;
    if (selectedEntities.length > limit) {
      setSelectedEntities(prev => prev.slice(0, limit));
    }
    if (selectedStats.length > limit) {
      setSelectedStats(prev => prev.slice(0, limit));
    }
  }, [currentSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whether a plugin match exists (only then show Enhanced toggle)
  const [hasPluginMatch, setHasPluginMatch] = useState(false);

  // Auto-detection on title change: icon, color, description + plugin availability check
  const detectApp = useCallback((name: string) => {
    if (!name.trim()) {
      setIconDetected(false);
      setHasPluginMatch(false);
      // If enhanced was on but title cleared, disable it
      if (!enhancedType) {
        setEnhancedEnabled(false);
        setType("standard");
      }
      return;
    }

    const nameLower = name.toLowerCase().trim();

    // 1. Check plugins for icon/color/description match
    const plugins = getAllPlugins();
    const pluginMatch = plugins.find(
      p => p.metadata.name.toLowerCase() === nameLower
    );

    if (pluginMatch) {
      setIcon(pluginMatch.metadata.icon);
      setColor(pluginMatch.metadata.color);
      setDescription(pluginMatch.metadata.description);
      setHasPluginMatch(true);
      setIconDetected(true);
      return;
    }

    // 2. Check simple-icons (icon only, no plugin match)
    const simpleIcon = fuzzyMatchIcon(name.trim());
    if (simpleIcon) {
      setIcon(name.trim());
      setColor(`#${simpleIcon.hex}`);
      setIconDetected(true);
    } else {
      setIconDetected(false);
    }

    // No plugin match -- hide enhanced toggle (unless already configured via foundation app)
    if (!enhancedType) {
      setHasPluginMatch(false);
      setEnhancedEnabled(false);
      setType("standard");
      setColumnSpan(1);
      setRowSpan(1);
    }
  }, [enhancedType]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      detectApp(newTitle);
    }, 300);
  }, [detectApp]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleFoundationSelect = (app: FoundationAppData) => {
    setTitle(app.name);
    setColor(app.color);
    setIcon(app.icon);
    setDescription(app.description || "");
    setIconDetected(true);

    // Check if a plugin matches this app - if so, pre-fill enhanced
    const plugins = getAllPlugins();
    const pluginMatch = plugins.find(
      p => p.metadata.name.toLowerCase() === app.name.toLowerCase()
    );

    if (pluginMatch || app.enhanced) {
      const pluginId = pluginMatch?.metadata.id || app.name.toLowerCase().replace(/\s+/g, "");
      setType("enhanced");
      setEnhancedType(pluginId);
      setEnhancedEnabled(true);
      setHasPluginMatch(true);

      // Check if an AppConnection already exists for this plugin type
      const existingConnection = appConnections.find(
        (c) => c.pluginType === pluginId
      );
      if (existingConnection) {
        setLinkedConnectionId(existingConnection.id);
        setUrl(existingConnection.url || "");
        setConnectionTested(true); // assume already tested if connection exists
        setConnectionMode("select");
      } else {
        setConnectionMode("new");
      }
    } else {
      setHasPluginMatch(false);
      setEnhancedEnabled(false);
      setType("standard");
    }

    setShowFoundation(false);
  };

  const filteredApps = foundationApps.filter(
    (app) =>
      app.name.toLowerCase().includes(foundationSearch.toLowerCase()) ||
      (app.category && app.category.toLowerCase().includes(foundationSearch.toLowerCase()))
  );

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim()) return;
    const created = await createGroup({ title: newGroupTitle.trim() });
    const newGroup: GroupData = { id: created.id, title: created.title, order: created.order };
    onGroupsChange?.([...groups, newGroup]);
    setGroupId(created.id);
    setShowNewGroup(false);
    setNewGroupTitle("");
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configToSave = { ...enhancedConfig };
      const isEnhanced = enhancedEnabled && type === "enhanced" && !!enhancedType;

      if (selectedStats.length > 0 && isEnhanced) {
        configToSave.visibleStats = selectedStats;
      }
      if (selectedEntities.length > 0 && isEnhanced) {
        configToSave.selectedEntities = selectedEntities;
      }

      let finalConnectionId = isEnhanced ? linkedConnectionId : null;

      // Create new AppConnection if user chose "new connection" mode
      if (isEnhanced && connectionMode === "new" && !linkedConnectionId) {
        const CONNECTION_KEYS = ["apiKey", "accessToken", "username", "password"];
        const connectionConfig: Record<string, string> = {};
        for (const key of CONNECTION_KEYS) {
          if (configToSave[key]) {
            connectionConfig[key] = configToSave[key] as string;
            delete configToSave[key];
          }
        }
        const apiUrl = (configToSave.apiUrl as string) || "";
        delete configToSave.apiUrl;

        const newConn = await createAppConnection({
          pluginType: enhancedType,
          name: title,
          icon: icon || null,
          customIconSvg: customIconSvg || null,
          color,
          url: apiUrl || null,
          config: Object.keys(connectionConfig).length > 0 ? JSON.stringify(connectionConfig) : null,
          description: description || null,
        });
        finalConnectionId = newConn.id;
      }

      onSave({
        title,
        url,
        color,
        icon,
        description,
        type: isEnhanced ? "enhanced" : "standard",
        enhancedType: isEnhanced ? enhancedType : "",
        enhancedConfig: isEnhanced ? JSON.stringify(configToSave) : "",
        columnSpan: isEnhanced ? columnSpan : 1,
        rowSpan: isEnhanced ? rowSpan : 1,
        groupId,
        customIconSvg: customIconSvg || null,
        appConnectionId: finalConnectionId,
      });
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/enhanced/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enhancedType, config: enhancedConfig }),
      });
      const data = await res.json();
      setTestResult(data);

      // After successful test, mark as tested and try to crawl entities
      if (data.success) {
        setConnectionTested(true);
        try {
          setIsCrawling(true);
          const crawlRes = await fetch("/api/enhanced/crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enhancedType, config: enhancedConfig }),
          });
          const crawlData = await crawlRes.json();
          if (crawlData.success && crawlData.groups) {
            setCrawledGroups(crawlData.groups);
          }
        } catch {
          /* crawl not supported, that's fine */
        } finally {
          setIsCrawling(false);
        }
      }
    } catch {
      setTestResult({ success: false, error: "Netzwerkfehler" });
    } finally {
      setIsTesting(false);
    }
  };

  // Custom icon upload handler
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconUploadError(null);
    if (file.size > 32 * 1024) {
      setIconUploadError("Icon darf maximal 32KB gross sein");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomIconSvg(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  // URL reachability check
  const handleUrlBlur = async () => {
    if (!url.trim()) {
      setUrlReachable(null);
      return;
    }
    setUrlChecking(true);
    setUrlReachable(null);
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = await res.json();
      if (data.results && data.results[url]) {
        setUrlReachable(data.results[url].online);
      } else {
        setUrlReachable(false);
      }
    } catch {
      setUrlReachable(false);
    } finally {
      setUrlChecking(false);
    }
  };

  // Toggle enhanced on/off (manual toggle -- NOT auto-detected from title)
  const handleEnhancedToggle = (checked: boolean) => {
    setEnhancedEnabled(checked);
    if (checked) {
      setType("enhanced");
      // If title matches a plugin, auto-select that plugin type
      if (!enhancedType) {
        const nameLower = title.toLowerCase().trim();
        const plugins = getAllPlugins();
        const pluginMatch = plugins.find(
          p => p.metadata.name.toLowerCase() === nameLower
        );
        if (pluginMatch) {
          setEnhancedType(pluginMatch.metadata.id);
        }
      }
    } else {
      setType("standard");
      setColumnSpan(1);
      setRowSpan(1);
    }
  };

  // Handle plugin type selection from dropdown
  const handlePluginSelect = (pluginId: string | null) => {
    if (!pluginId || pluginId === "none") {
      setEnhancedType("");
      return;
    }
    setEnhancedType(pluginId);
    const plugin = getPlugin(pluginId);
    if (plugin) {
      // Reset size to 1x1 if current size is not supported by new plugin
      if (!plugin.supportedSizes.includes(currentSize)) {
        setColumnSpan(1);
        setRowSpan(1);
      }
    }
  };

  // Determine which sizes are available
  const isEnhanced = enhancedEnabled && type === "enhanced";
  const availableSizes: TileSize[] = isEnhanced && matchedPlugin
    ? matchedPlugin.supportedSizes
    : ["1x1"];

  // Stat limit based on current size
  const statLimit = STAT_LIMITS[currentSize] ?? 3;

  // All available plugins for dropdown
  const allPlugins = getAllPlugins();

  // Render config field from plugin definition
  const renderConfigField = (field: ConfigField) => {
    const value = (enhancedConfig[field.key] as string) || "";
    const onChange = (val: string) =>
      setEnhancedConfig((prev) => ({ ...prev, [field.key]: val }));

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
        const isOAuthConnected = Boolean(enhancedConfig.accessToken);
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
                  setEnhancedConfig((prev) => {
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
        const oauthClientId = enhancedConfig.clientId as string;
        if (!oauthClientId) {
          return (
            <p className="text-xs text-muted-foreground">
              Bitte zuerst Client ID und Secret ausfuellen
            </p>
          );
        }

        const handleOAuthConnect = async () => {
          if (!oauthField) return;

          // Pre-create AppConnection if not linked yet (OAuth needs a real connectionId)
          let connId = linkedConnectionId;
          if (!connId && connectionMode === "new") {
            try {
              const connectionConfig: Record<string, string> = {};
              if (enhancedConfig.clientId) connectionConfig.clientId = String(enhancedConfig.clientId);
              if (enhancedConfig.clientSecret) connectionConfig.clientSecret = String(enhancedConfig.clientSecret);

              const newConn = await createAppConnection({
                pluginType: enhancedType,
                name: title || "Spotify",
                icon: icon || null,
                customIconSvg: customIconSvg || null,
                color,
                url: null,
                config: JSON.stringify(connectionConfig),
                description: description || null,
              });
              connId = newConn.id;
              setLinkedConnectionId(connId);
              setConnectionMode("select");
            } catch (err) {
              console.error("Failed to pre-create connection:", err);
              return;
            }
          }

          const state = btoa(JSON.stringify({
            pluginId: enhancedType,
            connectionId: connId || 0,
            returnUrl: window.location.href,
          }));

          const redirectUri = `${window.location.origin}/api/enhanced/oauth/callback`;

          const params = new URLSearchParams({
            client_id: oauthClientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: oauthField.scopes.join(" "),
            state,
          });

          // Open in new tab so the dialog stays open
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

  // ── Mode Selection View (new tiles only) ──
  if (dialogMode === "select") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-surface sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Neue Tile hinzufuegen</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setDialogMode("app")}
              className="glass-card flex flex-col items-center gap-3 rounded-xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer"
            >
              <AppWindow className="h-10 w-10 text-primary" />
              <div className="text-center">
                <div className="font-medium text-foreground">App hinzufuegen</div>
                <div className="text-xs text-muted-foreground mt-1">App, Service oder Weblink</div>
              </div>
            </button>
            <button
              onClick={() => setDialogMode("group")}
              className="glass-card flex flex-col items-center gap-3 rounded-xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer"
            >
              <LayoutGrid className="h-10 w-10 text-primary" />
              <div className="text-center">
                <div className="font-medium text-foreground">Gruppen-Dashboard</div>
                <div className="text-xs text-muted-foreground mt-1">Sub-Dashboard mit Apps</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Group mode: close TileDialog and open GroupDialog ──
  if (dialogMode === "group") {
    // Immediately close this dialog and open the GroupDialog
    if (onOpenGroupDialog) {
      // Use a microtask to avoid state update during render
      queueMicrotask(() => {
        onOpenChange(false);
        onOpenGroupDialog();
      });
    }
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-surface sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Gruppen-Dashboard</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Gruppen-Dashboard wird erstellt...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── App Form View ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-surface sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{tile ? "App bearbeiten" : "App hinzufuegen"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="grid gap-4 py-4">
            {/* Foundation App Quick Select */}
            {!tile && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFoundation(!showFoundation)}
                  className="mb-2"
                >
                  {showFoundation ? "Manuell eingeben" : "App auswaehlen"}
                </Button>
                {showFoundation && (
                  <div className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="App suchen..."
                        value={foundationSearch}
                        onChange={(e) => setFoundationSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-3 gap-2">
                        {filteredApps.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => handleFoundationSelect(app)}
                            className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent transition-colors"
                          >
                            <AppIcon
                              appName={app.name}
                              color={app.color}
                              size={32}
                              className="rounded-lg"
                            />
                            <span className="text-foreground truncate w-full text-center">{app.name}</span>
                            {app.enhanced && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">Enhanced</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* ── 1. Icon + Titel (same row) ── */}
            <div className="flex gap-3 items-end">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div className="relative group/icon">
                  <AppIcon
                    appName={icon || title || "?"}
                    color={color}
                    size={56}
                    customIcon={customIconSvg}
                    className="rounded-xl"
                  />
                  {/* Detection badge */}
                  {!customIconSvg && iconDetected && title.trim() && (
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-background">
                      <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {/* Clear custom icon button */}
                  {customIconSvg && (
                    <button
                      type="button"
                      onClick={() => { setCustomIconSvg(null); setIconUploadError(null); }}
                      className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-destructive ring-2 ring-background hover:bg-destructive/80 transition-colors"
                      title="Icon entfernen"
                    >
                      <X className="h-2.5 w-2.5 text-white" />
                    </button>
                  )}
                </div>
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Icon hochladen"
                >
                  <Upload className="h-3 w-3" />
                  <span>{customIconSvg ? "Aendern" : "Upload"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp"
                  onChange={handleIconUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="title">Titel</Label>
                <div className="relative">
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="App Name"
                  />
                  {title.trim() && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {iconDetected || customIconSvg ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Info className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                {/* Icon detection / upload status line */}
                {iconDetected && !customIconSvg && title.trim() && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Icon erkannt
                  </p>
                )}
                {customIconSvg && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Eigenes Icon
                  </p>
                )}
                {iconUploadError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {iconUploadError}
                  </p>
                )}
              </div>
            </div>

            {/* ── 2. URL with reachability check ── */}
            <div className="space-y-1.5">
              <Label htmlFor="url">Link-URL</Label>
              <p className="text-xs text-muted-foreground">Wird beim Klicken auf die Kachel geoeffnet</p>
              <div className="relative">
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setUrlReachable(null); }}
                  onBlur={handleUrlBlur}
                  placeholder="https://..."
                />
                {urlChecking && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!urlChecking && urlReachable === true && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                )}
                {!urlChecking && urlReachable === false && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              {!urlChecking && urlReachable === false && (
                <p className="text-destructive text-xs">URL nicht erreichbar</p>
              )}
            </div>

            {/* ── 3. Beschreibung ── */}
            <div className="space-y-1.5">
              <Label htmlFor="desc">Beschreibung</Label>
              <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>

            {/* ── 4. Farbe ── */}
            <div className="space-y-1.5">
              <Label>Farbe</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-white scale-110" : "border-transparent"}`}
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

            {/* ── 5. Gruppe ── */}
            <div className="space-y-1.5">
              <Label>Gruppe (optional)</Label>
              <div className="flex gap-2">
                <Select value={groupId?.toString() ?? "none"} onValueChange={(v) => setGroupId(!v || v === "none" ? null : parseInt(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue>
                      {groupId ? (groups.find((g) => g.id === groupId)?.title ?? "Nicht zugeordnet") : "Nicht zugeordnet"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicht zugeordnet</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewGroup(!showNewGroup)}>
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              {showNewGroup && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                    placeholder="Gruppenname..."
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateGroup(); } }}
                  />
                  <Button type="button" size="sm" onClick={handleCreateGroup} disabled={!newGroupTitle.trim()}>
                    Erstellen
                  </Button>
                </div>
              )}
            </div>

            {/* ── 6. Enhanced Aktivieren (only visible when a plugin match exists) ── */}
            {hasPluginMatch && <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {enhancedEnabled && (
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  <div>
                    <Label className="text-sm font-medium">Enhanced</Label>
                    <p className="text-xs text-muted-foreground">
                      Erweiterte Funktionen wie Live-Daten und Widgets
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enhancedEnabled}
                  onCheckedChange={handleEnhancedToggle}
                />
              </div>
            </div>}

            {/* ── Enhanced sections (only visible when enhanced is ON) ── */}
            {enhancedEnabled && (
              <>
                {/* Plugin type selector: show dropdown if no auto-match */}
                {!matchedPlugin && (
                  <div className="space-y-1.5">
                    <Label>Plugin Typ</Label>
                    <Select value={enhancedType || "none"} onValueChange={handlePluginSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Plugin auswaehlen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Plugin auswaehlen...</SelectItem>
                        {allPlugins.map((p) => (
                          <SelectItem key={p.metadata.id} value={p.metadata.id}>
                            {p.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Show matched plugin info — no change allowed when linked to AppConnection */}
                {matchedPlugin && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AppIcon
                        appName={matchedPlugin.metadata.icon}
                        color={matchedPlugin.metadata.color}
                        size={24}
                        className="rounded-md"
                      />
                      <span className="font-medium text-foreground">{matchedPlugin.metadata.name}</span>
                      <Badge variant="secondary" className="text-[10px]">Plugin</Badge>
                    </div>
                    {!linkedConnectionId && (
                      <Select value={enhancedType} onValueChange={handlePluginSelect}>
                        <SelectTrigger className="w-auto gap-1 border-0 bg-transparent p-1 h-auto text-xs text-muted-foreground hover:text-foreground">
                          <span>Aendern</span>
                          <ChevronDown className="h-3 w-3" />
                        </SelectTrigger>
                        <SelectContent>
                          {allPlugins.map((p) => (
                            <SelectItem key={p.metadata.id} value={p.metadata.id}>
                              {p.metadata.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* ── 7. Groesse (only when Enhanced ON, plugin matched, AND connection tested or linked) ── */}
                {matchedPlugin && (connectionTested || !!linkedConnectionId) && (
                  <div className="space-y-1.5">
                    <Label>Groesse</Label>
                    <div className="flex gap-2">
                      {SIZE_DEFS.filter(s => availableSizes.includes(s.size)).map((sizeDef) => (
                        <button
                          key={sizeDef.size}
                          type="button"
                          onClick={() => { setColumnSpan(sizeDef.cols); setRowSpan(sizeDef.rows); }}
                          className={cn(
                            "flex-1 rounded-lg border-2 p-3 text-center transition-all",
                            columnSpan === sizeDef.cols && rowSpan === sizeDef.rows
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <div className="text-xs font-medium">{sizeDef.label}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{SIZE_HINTS[currentSize]}</p>
                  </div>
                )}

                {/* ── 8. Enhanced Config (only when plugin matched) ── */}
                {matchedPlugin && (() => {
                  // Split config fields: connection fields shown immediately, feature fields after test
                  const CONNECTION_KEYS = new Set(["apiUrl", "apiKey", "accessToken", "username", "password"]);
                  const connectionFields = matchedPlugin.configFields.filter(
                    (f) => CONNECTION_KEYS.has(f.key) || f.required || f.type === "oauth"
                  );
                  // Widget-only fields: only show when current size has widget layout
                  const WIDGET_ONLY_KEYS = new Set(["carouselSpeed", "carouselItems"]);
                  const currentHint = matchedPlugin.renderHints[currentSize];
                  const isWidgetLayout = currentHint?.layout === "widget";

                  const featureFields = matchedPlugin.configFields.filter(
                    (f) => !CONNECTION_KEYS.has(f.key) && !f.required && f.type !== "oauth"
                  ).filter(
                    (f) => isWidgetLayout || !WIDGET_ONLY_KEYS.has(f.key)
                  );

                  // Connections matching this plugin type
                  const matchingConnections = appConnections.filter(c => c.pluginType === enhancedType);

                  // Determine which UI branch to show
                  const isNewTileWithPlugin = matchedPlugin && !tile;
                  const isEditingWithConnection = isEditingEnhancedWithConnection || (!!tile && !!linkedConnectionId);

                  return (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Konfiguration</Label>

                      {isEditingWithConnection ? (
                        /* ── Branch 1: Editing existing tile with linked connection ── */
                        <div className="rounded-lg border border-border bg-primary/5 p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-foreground font-medium">
                              Verbunden{linkedConnectionId ? (() => {
                                const conn = appConnections.find(c => c.id === linkedConnectionId);
                                return conn ? ` mit ${conn.name}` : "";
                              })() : ""}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Verbindung verwalten unter Einstellungen &gt; Apps verwalten
                          </p>
                        </div>
                      ) : isNewTileWithPlugin ? (
                        /* ── Branch 2: NEW tile with plugin match — connection picker ── */
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm">Verbindung</Label>
                            <Select
                              value={linkedConnectionId ? String(linkedConnectionId) : "new"}
                              onValueChange={(val) => {
                                if (!val || val === "new") {
                                  setLinkedConnectionId(null);
                                  setConnectionMode("new");
                                  setConnectionTested(false);
                                } else {
                                  const connId = parseInt(val);
                                  const conn = appConnections.find(c => c.id === connId);
                                  setLinkedConnectionId(connId);
                                  setConnectionMode("select");
                                  setConnectionTested(true);
                                  if (conn?.url) setUrl(conn.url);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Verbindung waehlen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {matchingConnections.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name} — {c.url || "Keine URL"}
                                  </SelectItem>
                                ))}
                                <SelectItem value="new">+ Neue Verbindung anlegen</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* If existing connection selected, show connected info */}
                          {connectionMode === "select" && linkedConnectionId && (
                            <div className="rounded-lg border border-border bg-primary/5 p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span className="text-foreground font-medium">
                                  Verbunden{(() => {
                                    const conn = appConnections.find(c => c.id === linkedConnectionId);
                                    return conn ? ` mit ${conn.name}` : "";
                                  })()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* If "new connection" selected, show connection fields + test button */}
                          {connectionMode === "new" && (
                            <>
                              {connectionFields.map((field) => (
                                <div key={field.key} className="space-y-1.5">
                                  <Label htmlFor={field.key}>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                  </Label>
                                  {renderConfigField(field)}
                                  {field.description && (
                                    <p className="text-xs text-muted-foreground">{field.description}</p>
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
                                  disabled={isTesting || !matchedPlugin?.configFields.some((f) => f.required && enhancedConfig[f.key])}
                                >
                                  {isTesting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Teste...</>
                                  ) : (
                                    <><Wifi className="mr-2 h-4 w-4" />Verbindung testen</>
                                  )}
                                </Button>
                                {testResult && (
                                  <div className={`flex items-center gap-2 text-sm ${testResult.success ? "text-emerald-400" : "text-destructive"}`}>
                                    {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                    <span>{testResult.success ? testResult.message : testResult.error}</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        /* ── Branch 3: Legacy — editing tile without connection or fallback ── */
                        <>
                          {connectionFields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                              <Label htmlFor={field.key}>
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {renderConfigField(field)}
                              {field.description && (
                                <p className="text-xs text-muted-foreground">{field.description}</p>
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
                              disabled={isTesting || !matchedPlugin?.configFields.some((f) => f.required && enhancedConfig[f.key])}
                            >
                              {isTesting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Teste...</>
                              ) : (
                                <><Wifi className="mr-2 h-4 w-4" />Verbindung testen</>
                              )}
                            </Button>
                            {testResult && (
                              <div className={`flex items-center gap-2 text-sm ${testResult.success ? "text-emerald-400" : "text-destructive"}`}>
                                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <span>{testResult.success ? testResult.message : testResult.error}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Feature fields - only visible after successful connection test or linked */}
                      {(connectionTested || !!linkedConnectionId) && featureFields.length > 0 && (
                        <>
                          {featureFields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                              <Label htmlFor={field.key}>
                                {field.label}
                              </Label>
                              {renderConfigField(field)}
                              {field.description && (
                                <p className="text-xs text-muted-foreground">{field.description}</p>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ── 9. Enhanced Options / Stats (only when plugin matched AND connection tested or linked) ── */}
                {matchedPlugin && !connectionTested && !linkedConnectionId && (
                  <div className="rounded-lg border border-dashed border-border p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Teste zuerst die Verbindung um die verfuegbaren Optionen zu sehen.
                    </p>
                  </div>
                )}

                {matchedPlugin && (connectionTested || !!linkedConnectionId) && (
                  <>
                    {/* Entity picker for crawl-capable plugins (e.g. Home Assistant) */}
                    {isCrawling && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Entities werden geladen...</span>
                      </div>
                    )}

                    {crawledGroups.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-sm">Entities auswaehlen</Label>
                        <p className="text-xs text-muted-foreground">
                          {SIZE_DESCRIPTIONS[currentSize]} -- {selectedEntities.length} von {STAT_LIMITS[currentSize]} ausgewaehlt
                        </p>
                        <Input
                          placeholder="Entities filtern..."
                          value={entitySearch}
                          onChange={(e) => setEntitySearch(e.target.value)}
                          className="mb-2"
                        />
                        <ScrollArea className="max-h-[250px]">
                          {crawledGroups
                            .filter(group =>
                              !entitySearch ||
                              group.label.toLowerCase().includes(entitySearch.toLowerCase()) ||
                              group.entities.some(e => e.name.toLowerCase().includes(entitySearch.toLowerCase()))
                            )
                            .map(group => {
                              const filteredEntities = group.entities.filter(
                                e => !entitySearch || e.name.toLowerCase().includes(entitySearch.toLowerCase())
                              );
                              if (filteredEntities.length === 0 && entitySearch) return null;
                              const isExpanded = expandedDomains.has(group.domain);
                              return (
                                <div key={group.domain} className="mb-2">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedDomains(prev => {
                                      const next = new Set(prev);
                                      if (next.has(group.domain)) next.delete(group.domain);
                                      else next.add(group.domain);
                                      return next;
                                    })}
                                    className="w-full flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 hover:text-foreground transition-colors"
                                  >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    {group.label} ({group.entities.length})
                                  </button>
                                  {isExpanded && filteredEntities.map(entity => {
                                    const isSelected = selectedEntities.some(se => se.id === entity.id);
                                    const limit = STAT_LIMITS[currentSize] ?? 3;
                                    return (
                                      <label key={entity.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-accent/30 rounded px-1 ml-4">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked && selectedEntities.length >= limit) return;
                                            setSelectedEntities(prev =>
                                              e.target.checked
                                                ? [...prev, { id: entity.id, label: entity.name }]
                                                : prev.filter(se => se.id !== entity.id)
                                            );
                                          }}
                                          className="rounded"
                                        />
                                        <span className="text-foreground truncate">{entity.name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto shrink-0">{entity.state}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              );
                            })}
                        </ScrollArea>
                        {selectedEntities.length >= (STAT_LIMITS[currentSize] ?? 3) && (
                          <p className="text-xs text-muted-foreground">Maximum ({STAT_LIMITS[currentSize]}) erreicht.</p>
                        )}
                      </div>
                    ) : (
                      /* Fall back to regular statOption checkboxes for non-crawl plugins */
                      matchedPlugin.statOptions.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm">Anzeige Optionen</Label>
                          <p className="text-xs text-muted-foreground">
                            {SIZE_DESCRIPTIONS[currentSize]}
                          </p>
                          <div className="space-y-1.5">
                            {matchedPlugin.statOptions.map((option) => (
                              <label key={option.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedStats.includes(option.key)}
                                  onChange={(e) => {
                                    if (e.target.checked && selectedStats.length >= statLimit) return;
                                    setSelectedStats(prev =>
                                      e.target.checked
                                        ? [...prev, option.key]
                                        : prev.filter(k => k !== option.key)
                                    );
                                  }}
                                  className="rounded"
                                />
                                <span className="text-foreground">{option.label}</span>
                                <span className="text-xs text-muted-foreground">- {option.description}</span>
                              </label>
                            ))}
                          </div>
                          {selectedStats.length >= statLimit && (
                            <p className="text-xs text-muted-foreground">
                              Maximum ({statLimit}) erreicht.
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {!tile && (
            <Button variant="outline" onClick={() => setDialogMode("select")} className="mr-auto">
              Zurueck
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!title || !url || isSaving}>
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichern...</>
            ) : (
              tile ? "Speichern" : "Hinzufuegen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
