"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "../registry";
import { WidgetHeader } from "../shared/WidgetHeader";
import { Film, Tv, Play, Disc, MonitorPlay, Star } from "lucide-react";
import type { StatItem } from "@/types/tile";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RecentItem {
  id: string;
  title: string;
  year: number | null;
  rating: number | null;
  officialRating: string | null;
  type: "Movie" | "Series";
  imageUrl: string;
  overview: string | null;
}

interface EmbyWidgetData {
  recentItems: RecentItem[];
  mediaCategory: string;
  carouselSpeed?: number;
  carouselItems?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseWidgetData(
  raw: Record<string, unknown> | undefined
): EmbyWidgetData | null {
  if (!raw) return null;
  const items = raw.recentItems;
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    recentItems: items as RecentItem[],
    mediaCategory: (raw.mediaCategory as string) ?? "Mixed",
    carouselSpeed: (raw.carouselSpeed as number) || undefined,
    carouselItems: (raw.carouselItems as number) || undefined,
  };
}

function typeLabel(type: "Movie" | "Series"): string {
  return type === "Movie" ? "Film" : "Serie";
}

// ─── Stat fallback components (preserved from original) ─────────────────────

const statIconMap: Record<string, React.ComponentType<{ className?: string }>> =
  {
    Streams: Play,
    Filme: Film,
    Serien: Tv,
    Episoden: Disc,
  };

function getStatColor(item: StatItem): string {
  if (item.color === "green") return "text-emerald-400";
  if (item.color === "red") return "text-red-400";
  if (item.color === "yellow") return "text-yellow-400";
  return "text-foreground";
}

function StatCard({ item }: { item: StatItem }) {
  const Icon = statIconMap[item.label] ?? MonitorPlay;

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/20 p-3">
      <Icon className={cn("h-5 w-5", getStatColor(item))} />
      <span
        className={cn("text-lg font-bold tabular-nums", getStatColor(item))}
      >
        {item.value}
        {item.unit && (
          <span className="text-xs font-normal text-muted-foreground ml-0.5">
            {item.unit}
          </span>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {item.label}
      </span>
    </div>
  );
}

function StatFallback({ items }: { items: StatItem[] }) {
  const display = items.slice(0, 4);

  if (display.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Keine Daten
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {display.map((item, i) => (
        <StatCard key={i} item={item} />
      ))}
      {display.length < 4 &&
        Array.from({ length: 4 - display.length }).map((_, i) => (
          <div key={`empty-${i}`} className="rounded-lg bg-muted/10" />
        ))}
    </div>
  );
}

// ─── Cover image with error fallback (contain mode, dark bg) ────────────────

function CoverImage({
  src,
  alt,
  className,
  objectFit = "contain",
}: {
  src: string;
  alt: string;
  className?: string;
  objectFit?: "contain" | "cover";
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-black/50 rounded-md",
          className
        )}
      >
        <Film className="h-5 w-5 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className={cn("bg-black/50 rounded-md overflow-hidden", className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          "w-full h-full rounded-md",
          objectFit === "contain" ? "object-contain" : "object-cover"
        )}
      />
    </div>
  );
}

// ─── 2x1 Mini Widget (redesigned: single item with auto-swipe) ─────────────

function EmbyWidget2x1({ stats }: WidgetProps) {
  const data = parseWidgetData(stats.widgetData);
  const carouselSpeed = data?.carouselSpeed || 5000;
  const maxItems = Math.min(data?.carouselItems || 3, 3);
  const items = data ? data.recentItems.slice(0, maxItems) : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const isPausedRef = useRef(false);

  // Preload images
  useEffect(() => {
    items.forEach((item) => {
      if (item.imageUrl) {
        const img = new Image();
        img.src = item.imageUrl;
      }
    });
  }, [items]);

  // Auto-swipe
  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, carouselSpeed);

    return () => clearInterval(interval);
  }, [items.length, carouselSpeed]);

  const handleMouseEnter = useCallback(() => {
    isPausedRef.current = true;
  }, []);
  const handleMouseLeave = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  const statusValue =
    stats.status === "ok"
      ? "online"
      : stats.status === "error"
        ? "offline"
        : ("unknown" as const);

  // No widget data -- fall back to stat grid
  if (!data || items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <WidgetHeader
          icon="MonitorPlay"
          iconColor="#52b54b"
          title="Emby"
          subtitle="Media Server"
          status={statusValue}
        />
        <div className="flex-1 p-3">
          <StatFallback items={stats.items} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header: tile title | type badge | app logo */}
      <div className="flex items-center gap-2 h-9 px-2.5 border-b border-white/[0.06] flex-shrink-0">
        {/* Status dot */}
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full flex-shrink-0",
            statusValue === "online"
              ? "bg-emerald-500"
              : statusValue === "offline"
                ? "bg-red-500"
                : "bg-muted-foreground/40"
          )}
        />
        {/* Tile title */}
        <span className="text-[11px] font-semibold text-foreground flex-shrink-0">
          Emby
        </span>
        {/* Type badge */}
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#52b54b]/15 text-[#52b54b] font-medium flex-shrink-0 leading-none">
          Media Server
        </span>
        {/* Spacer */}
        <div className="flex-1 min-w-0" />
        {/* Slide indicators */}
        {items.length > 1 && (
          <div className="flex items-center gap-1">
            {items.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === currentIndex
                    ? "w-2.5 bg-[#52b54b]/70"
                    : "w-1 bg-white/15"
                )}
              />
            ))}
          </div>
        )}
        {/* App logo */}
        <MonitorPlay
          className="h-4 w-4 flex-shrink-0"
          style={{ color: "#52b54b" }}
        />
      </div>

      {/* Content: all slides stacked, only active one visible */}
      <div className="flex-1 relative min-h-0">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 flex items-stretch gap-2 px-2 py-1.5 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: i === currentIndex ? 1 : 0,
              pointerEvents: i === currentIndex ? "auto" : "none",
            }}
          >
            {/* Cover image - portrait, full height */}
            <CoverImage
              src={item.imageUrl}
              alt={item.title}
              className="h-full aspect-[2/3] flex-shrink-0 rounded-md shadow-md"
              objectFit="cover"
            />

            {/* Info panel */}
            <div className="flex flex-col justify-center gap-1 min-w-0 flex-1 rounded-md bg-white/[0.04] px-2.5 py-1.5">
              {/* Media title */}
              <span className="text-[11px] font-semibold text-foreground truncate leading-tight">
                {item.title}
                {item.year && (
                  <span className="font-normal text-muted-foreground/70 ml-1">
                    ({item.year})
                  </span>
                )}
              </span>

              {/* Description - always show if available, up to 2 lines */}
              {item.overview && (
                <p className="text-[9px] leading-snug text-muted-foreground/60 line-clamp-2">
                  {item.overview}
                </p>
              )}

              {/* Meta row: officialRating badge + type label */}
              <div className="flex items-center gap-1.5 mt-auto">
                {item.officialRating && (
                  <span className="text-[8px] px-1 py-px rounded border border-white/10 text-muted-foreground/60 leading-none font-medium">
                    {item.officialRating}
                  </span>
                )}
                <span className="text-[8px] text-muted-foreground/40">
                  {typeLabel(item.type)}
                </span>
                {/* Rating stars */}
                {item.rating != null && item.rating > 0 && (
                  <>
                    <span className="text-muted-foreground/20">·</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 text-[#52b54b] fill-[#52b54b]" />
                      <span className="text-[9px] font-bold text-foreground/70 tabular-nums">
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2x2 Carousel Widget ───────────────────────────────────────────────────

function EmbyWidget2x2({ stats }: WidgetProps) {
  const data = parseWidgetData(stats.widgetData);
  const carouselSpeed = data?.carouselSpeed || 5000;
  const carouselItems = data?.carouselItems || 5;
  const slides = data ? data.recentItems.slice(0, carouselItems) : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const isPausedRef = useRef(false);

  // Preload all slide images
  useEffect(() => {
    slides.forEach((s) => {
      if (s.imageUrl) {
        const img = new Image();
        img.src = s.imageUrl;
      }
    });
  }, [slides]);

  // Auto-advance interval
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      if (!isPausedRef.current) {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }
    }, carouselSpeed);

    return () => clearInterval(interval);
  }, [slides.length, carouselSpeed]);

  const handleMouseEnter = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  // No data: fall back to stat grid
  if (!data || slides.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <WidgetHeader
          icon="MonitorPlay"
          iconColor="#52b54b"
          title="Emby"
          subtitle="Medienbibliothek"
          status={
            stats.status === "ok"
              ? "online"
              : stats.status === "error"
                ? "offline"
                : "unknown"
          }
        />
        <div className="flex-1 p-3">
          <StatFallback items={stats.items} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <WidgetHeader
        icon="MonitorPlay"
        iconColor="#52b54b"
        title="Emby"
        subtitle="Medienbibliothek"
        status={
          stats.status === "ok"
            ? "online"
            : stats.status === "error"
              ? "offline"
              : "unknown"
        }
      />

      {/* Carousel area */}
      <div
        className="flex-1 flex flex-col min-h-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Image + overlay container */}
        <div className="relative flex-1 mx-2 mt-2 rounded-lg overflow-hidden bg-black">
          {/* All slides stacked, only active one visible */}
          {slides.map((slide, i) => (
            <CarouselSlide
              key={`${slide.id}-${i}`}
              item={slide}
              className="transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === currentIndex ? 1 : 0 }}
            />
          ))}
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-2 flex-shrink-0">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentIndex
                    ? "w-4 bg-[#52b54b]"
                    : "w-1.5 bg-white/25 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single carousel slide (2x2 - contain mode with dark bg) ───────────────

function CarouselSlide({
  item,
  style,
  className,
}: {
  item: RecentItem;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn("absolute inset-0", className)} style={style}>
      {/* Background image - object-contain with dark bg */}
      {!imgFailed ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <Film className="h-12 w-12 text-muted-foreground/20" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 flex items-end gap-2.5">
        {/* Rating badge */}
        {item.rating != null && item.rating > 0 && (
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1 flex-shrink-0">
            <Star className="h-3 w-3 text-[#52b54b] fill-[#52b54b]" />
            <span className="text-xs font-bold text-white tabular-nums">
              {item.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Text info */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-sm font-semibold text-white truncate">
            {item.title}
            {item.year && (
              <span className="font-normal text-white/60 ml-1.5">
                ({item.year})
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-white/50">
            {item.officialRating && (
              <>
                <span className="px-1 py-px rounded border border-white/20 text-white/60 leading-none">
                  {item.officialRating}
                </span>
                <span>·</span>
              </>
            )}
            <span>{typeLabel(item.type)}</span>
          </div>
          {item.overview && (
            <p className="text-[10px] leading-snug text-white/40 line-clamp-1 mt-0.5">
              {item.overview}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Exported Widget (routes by size) ───────────────────────────────────────

export function EmbyWidget(props: WidgetProps) {
  if (props.size === "2x2") return <EmbyWidget2x2 {...props} />;
  return <EmbyWidget2x1 {...props} />;
}
