"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GroupSectionProps {
  title: string;
  groupId: number;
  children: React.ReactNode;
  onRename?: (id: number, title: string) => void;
  onDelete?: (id: number) => void;
}

export function GroupSection({
  title,
  groupId,
  children,
  onRename,
  onDelete,
}: GroupSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleFinishEdit = () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle !== title) {
      onRename?.(groupId, editTitle.trim());
    } else {
      setEditTitle(title);
    }
  };

  return (
    <div className="space-y-3">
      <div className="group flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <FolderOpen className="h-4 w-4 text-primary/60" />
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFinishEdit();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditTitle(title);
                }
              }}
              className="bg-transparent border-b border-primary outline-none text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{title}</span>
          )}
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        <button
          onClick={() => onDelete?.(groupId)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
