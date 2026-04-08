"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import * as simpleIcons from "simple-icons";

interface IconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (icon: { slug: string; title: string; svg: string; hex: string }) => void;
}

// Build icon index once, lazily
let cachedIcons: Array<{ slug: string; title: string; svg: string; hex: string }> | null = null;

function getIconIndex() {
  if (cachedIcons) return cachedIcons;
  cachedIcons = [];
  for (const key of Object.keys(simpleIcons)) {
    if (!key.startsWith("si")) continue;
    const icon = (simpleIcons as Record<string, unknown>)[key];
    if (icon && typeof icon === "object" && "svg" in icon && "title" in icon && "hex" in icon) {
      const { title, svg, hex } = icon as { title: string; svg: string; hex: string };
      cachedIcons.push({ slug: key.slice(2), title, svg, hex });
    }
  }
  cachedIcons.sort((a, b) => a.title.localeCompare(b.title));
  return cachedIcons;
}

export function IconPicker({ open, onOpenChange, onSelect }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const allIcons = useMemo(() => (open ? getIconIndex() : []), [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allIcons.slice(0, 200);
    const lower = search.toLowerCase();
    return allIcons.filter((i) => i.title.toLowerCase().includes(lower)).slice(0, 200);
  }, [allIcons, search]);

  const handleSelect = useCallback(
    (icon: (typeof filtered)[0]) => {
      onSelect(icon);
      onOpenChange(false);
      setSearch("");
    },
    [onSelect, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Icon auswaehlen</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Icon suchen..."
            className="pl-8"
            autoFocus
          />
        </div>

        <ScrollArea className="h-80">
          <div className="grid grid-cols-6 gap-2 p-1">
            {filtered.map((icon) => (
              <button
                key={icon.slug}
                type="button"
                onClick={() => handleSelect(icon)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2",
                  "hover:bg-accent/50 transition-colors cursor-pointer"
                )}
                title={icon.title}
              >
                <div
                  className="h-8 w-8 flex items-center justify-center [&>svg]:h-6 [&>svg]:w-6"
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                  style={{ color: `#${icon.hex}` }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {icon.title}
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Kein Icon gefunden
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
