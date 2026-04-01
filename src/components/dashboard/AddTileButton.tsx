"use client";

import { Plus, AppWindow, FolderOpen, LayoutDashboard } from "lucide-react";
import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";

interface AddTileButtonProps {
  onAddTile: () => void;
  onAddGroup?: () => void;
  onAddSubDashboard?: () => void;
  /** Hide sub-dashboard option (e.g. inside a sub-dashboard) */
  hideSubDashboard?: boolean;
}

export function AddTileButton({ onAddTile, onAddGroup, onAddSubDashboard, hideSubDashboard }: AddTileButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // If no group/subdashboard handlers, just show a simple button
  const hasMenu = !!onAddGroup || (!!onAddSubDashboard && !hideSubDashboard);

  if (!hasMenu) {
    return (
      <motion.button
        onClick={onAddTile}
        className="flex flex-col items-center justify-center gap-3 p-5 cursor-pointer rounded-[var(--radius-lg)] border-2 border-dashed border-border/50 hover:border-primary/50 bg-card/30 backdrop-blur-md"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Hinzufuegen</span>
      </motion.button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        className="flex flex-col items-center justify-center gap-3 p-5 cursor-pointer rounded-[var(--radius-lg)] border-2 border-dashed border-border/50 hover:border-primary/50 bg-card/30 backdrop-blur-md w-full h-full"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Hinzufuegen</span>
      </motion.button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-card rounded-lg border border-border/50 shadow-xl overflow-hidden">
          <button
            onClick={() => { onAddTile(); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-white/10 transition-colors cursor-pointer"
          >
            <AppWindow className="h-4 w-4 text-primary" />
            <span>App hinzufuegen</span>
          </button>

          {onAddGroup && (
            <button
              onClick={() => { onAddGroup(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-white/10 transition-colors cursor-pointer border-t border-border/30"
            >
              <FolderOpen className="h-4 w-4 text-amber-400" />
              <span>Gruppe erstellen</span>
            </button>
          )}

          {onAddSubDashboard && !hideSubDashboard && (
            <button
              onClick={() => { onAddSubDashboard(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-white/10 transition-colors cursor-pointer border-t border-border/30"
            >
              <LayoutDashboard className="h-4 w-4 text-emerald-400" />
              <span>Sub-Dashboard erstellen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
