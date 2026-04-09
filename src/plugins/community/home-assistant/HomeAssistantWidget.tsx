"use client";

import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/components/widgets/registry";
import { WidgetHeader } from "@/components/widgets/shared/WidgetHeader";
import { Loader2, AlertCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WidgetEntity } from "./types";
import { DOMAIN_ICONS } from "./types";

const PLUGIN_COLOR = "#18BCF2";

// ── Helpers ───────────────────────────────────────────────────

function getDomainIcon(domain: string): LucideIcon | null {
  const iconName = DOMAIN_ICONS[domain];
  if (!iconName) return null;
  return (
    (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] ?? null
  );
}

function isOnOff(entity: WidgetEntity): boolean {
  const d = entity.domain;
  return (
    d === "light" ||
    d === "switch" ||
    d === "input_boolean" ||
    d === "fan" ||
    d === "binary_sensor"
  );
}

function getStateColor(entity: WidgetEntity): string | undefined {
  const { state, domain, unit, deviceClass } = entity;

  if (state === "unavailable" || state === "unknown") return "text-red-400";

  if (domain === "binary_sensor") {
    const positiveOn = new Set(["connectivity", "plug", "power", "running"]);
    if (state === "on")
      return positiveOn.has(deviceClass || "")
        ? "text-emerald-400"
        : "text-red-400";
    return positiveOn.has(deviceClass || "") ? undefined : "text-emerald-400";
  }

  if (isOnOff(entity)) {
    return state === "on" ? "text-emerald-400" : "text-muted-foreground";
  }

  const num = parseFloat(state);
  if (!isNaN(num) && unit === "%") {
    if (num > 85) return "text-red-400";
    if (num > 70) return "text-yellow-400";
    return "text-emerald-400";
  }
  if (!isNaN(num) && (unit === "°C" || unit === "°F")) {
    return "text-sky-400";
  }

  return undefined;
}

function getStatusDotColor(entity: WidgetEntity): string | undefined {
  if (!isOnOff(entity)) return undefined;
  const { state, domain, deviceClass } = entity;
  if (state === "unavailable") return "bg-red-500";
  if (domain === "binary_sensor") {
    const positiveOn = new Set(["connectivity", "plug", "power", "running"]);
    return state === "on"
      ? positiveOn.has(deviceClass || "")
        ? "bg-emerald-500"
        : "bg-red-500"
      : "bg-muted-foreground/40";
  }
  return state === "on" ? "bg-emerald-500" : "bg-muted-foreground/40";
}

function formatState(entity: WidgetEntity): string {
  const { state, unit, domain, deviceClass } = entity;

  if (state === "unavailable") return "N/A";
  if (state === "unknown") return "?";

  if (domain === "binary_sensor") {
    const doorLike = new Set([
      "door",
      "window",
      "garage_door",
      "opening",
      "lock",
    ]);
    const motionLike = new Set([
      "motion",
      "occupancy",
      "presence",
      "vibration",
    ]);
    if (doorLike.has(deviceClass || ""))
      return state === "on" ? "Offen" : "Zu";
    if (motionLike.has(deviceClass || ""))
      return state === "on" ? "Erkannt" : "Frei";
    return state === "on" ? "An" : "Aus";
  }

  if (isOnOff(entity)) {
    return state === "on" ? "An" : "Aus";
  }

  const num = parseFloat(state);
  if (!isNaN(num)) {
    const rounded = Number.isInteger(num) ? num.toString() : num.toFixed(1);
    return unit ? `${rounded} ${unit}` : rounded;
  }

  return state;
}

// ── Loading State ─────────────────────────────────────────────

function WidgetLoading() {
  return (
    <div className="flex flex-col h-full">
      <WidgetHeader
        icon="House"
        iconColor={PLUGIN_COLOR}
        title="Home Assistant"
        status="unknown"
      />
      <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Laden...</span>
      </div>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────

function WidgetError({ error }: { error?: string }) {
  return (
    <div className="flex flex-col h-full">
      <WidgetHeader
        icon="House"
        iconColor={PLUGIN_COLOR}
        title="Home Assistant"
        status="offline"
      />
      <div className="flex-1 flex items-center justify-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">{error || "Verbindungsfehler"}</span>
      </div>
    </div>
  );
}

// ── Entity Card for 2x1 ──────────────────────────────────────

function EntityCard({ entity }: { entity: WidgetEntity }) {
  const Icon = getDomainIcon(entity.domain);
  const colorClass = getStateColor(entity);
  const display = formatState(entity);
  const dotColor = getStatusDotColor(entity);

  return (
    <div className="flex flex-col rounded-lg bg-muted/20 border border-border/20 min-w-0 p-1.5 gap-0.5">
      {/* Header: icon + name + optional status dot */}
      <div className="flex items-center gap-1 min-w-0">
        {dotColor && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotColor)}
          />
        )}
        {!dotColor && Icon && (
          <Icon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-[9px] text-muted-foreground">
          {entity.friendlyName}
        </span>
      </div>
      {/* Value */}
      <span
        className={cn(
          "font-semibold tabular-nums truncate text-xs",
          colorClass || "text-foreground"
        )}
      >
        {display}
      </span>
    </div>
  );
}

// ── 2x1 Variant ───────────────────────────────────────────────

function HomeAssistant2x1({ stats }: WidgetProps) {
  const entities = (
    stats.widgetData as { entities?: WidgetEntity[] } | undefined
  )?.entities || [];

  const count = entities.length;
  // Dynamic grid: 2 cols for <=4, 3 cols for 5-6
  const cols = count <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="flex flex-col h-full">
      <WidgetHeader
        icon="House"
        iconColor={PLUGIN_COLOR}
        title="Home Assistant"
        subtitle={`${count} Entities`}
        status={stats.status === "ok" ? "online" : "offline"}
      />
      <div className="flex-1 p-2 min-h-0 overflow-hidden">
        {count === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            Keine Entities konfiguriert
          </div>
        ) : (
          <div className={cn("grid gap-1.5 h-full auto-rows-fr", cols)}>
            {entities.slice(0, 6).map((entity) => (
              <EntityCard key={entity.entityId} entity={entity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────

export function HomeAssistantWidget(props: WidgetProps) {
  if (props.stats.status === "loading") return <WidgetLoading />;
  if (props.stats.status === "error")
    return <WidgetError error={props.stats.error} />;

  return <HomeAssistant2x1 {...props} />;
}