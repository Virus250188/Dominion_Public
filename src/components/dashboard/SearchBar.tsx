"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Globe, Shield, Lock, Compass, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

// Map provider names to icons
function getProviderIcon(name: string) {
  const icons: Record<string, React.ReactNode> = {
    Google: <Globe className="h-4 w-4" />,
    DuckDuckGo: <Shield className="h-4 w-4" />,
    Bing: <Globe className="h-4 w-4" />,
    Startpage: <Lock className="h-4 w-4" />,
    Brave: <Compass className="h-4 w-4" />,
  };
  return icons[name] || <Search className="h-4 w-4" />;
}

interface SearchBarProps {
  providers: Array<{
    id: number;
    name: string;
    url: string;
    icon: string | null;
    isDefault: boolean;
  }>;
  tiles: Array<{ id: number; title: string; url: string; color: string; icon: string | null }>;
}

export function SearchBar({ providers, tiles }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(
    providers.find((p) => p.isDefault) || providers[0]
  );
  const [showProviders, setShowProviders] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter tiles based on query
  const filteredTiles = query.length >= 2
    ? tiles.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setQuery("");
        setShowProviders(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowProviders(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || !selectedProvider) return;
      if (selectedProvider) {
        const searchUrl = selectedProvider.url.replace("{query}", encodeURIComponent(query.trim()));
        window.open(searchUrl, "_blank", "noopener,noreferrer");
      }
      setQuery("");
    },
    [query, selectedProvider]
  );

  const handleTileClick = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setQuery("");
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className={cn(
          "glass-input flex items-center gap-2 px-3 py-2 transition-all",
          isFocused && "ring-2 ring-ring/30"
        )}>
          {/* Provider selector */}
          <button
            type="button"
            onClick={() => setShowProviders(!showProviders)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
          >
            {selectedProvider && getProviderIcon(selectedProvider.name)}
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Search input */}
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Suchen... (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Provider dropdown */}
      <AnimatePresence>
        {showProviders && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-0 top-full mt-2 z-50 glass-surface rounded-lg p-1 min-w-48"
          >
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p);
                  setShowProviders(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  selectedProvider?.id === p.id && "bg-accent text-accent-foreground"
                )}
              >
                {getProviderIcon(p.name)}
                <span>{p.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tile search results */}
      <AnimatePresence>
        {filteredTiles.length > 0 && isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-0 right-0 top-full mt-2 z-40 glass-surface rounded-lg p-1 max-h-64 overflow-auto"
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Deine Apps</div>
            {filteredTiles.map((tile) => (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile.url)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: tile.color }}
                >
                  {tile.title[0]}
                </div>
                <span className="text-foreground">{tile.title}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
