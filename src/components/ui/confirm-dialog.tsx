"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Loeschen bestaetigen",
  message = "Bist du sicher? Diese Aktion kann nicht rueckgaengig gemacht werden.",
  confirmLabel = "Loeschen",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the dialog container when it opens (for keyboard accessibility)
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        // Focus the first button in the dialog
        const btn = dialogRef.current?.querySelector("button");
        btn?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div
              ref={dialogRef}
              role="alertdialog"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-desc"
              className="glass-card rounded-xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="confirm-dialog-title" className="text-base font-semibold mb-1">{title}</h3>
              <p id="confirm-dialog-desc" className="text-sm text-muted-foreground mb-5">{message}</p>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                >
                  {cancelLabel}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
