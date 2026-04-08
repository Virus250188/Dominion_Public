"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useEditMode } from "@/contexts/EditModeContext";

interface ResizableContainerProps {
  children: React.ReactNode;
  widthPercent: number;
  onWidthChange: (percent: number) => void;
  onResizeEnd?: (percent: number) => void;
  className?: string;
  minPercent?: number;
  maxPercent?: number;
}

export function ResizableContainer({
  children,
  widthPercent,
  onWidthChange,
  onResizeEnd,
  className,
  minPercent = 40,
  maxPercent = 95,
}: ResizableContainerProps) {
  const { editMode } = useEditMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const latestPercentRef = useRef(widthPercent);
  latestPercentRef.current = widthPercent;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const parentWidth =
        containerRef.current?.parentElement?.clientWidth ?? window.innerWidth;
      const startPercent = widthPercent;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / parentWidth) * 100;
        const newPercent = Math.round(
          Math.min(maxPercent, Math.max(minPercent, startPercent + deltaPercent))
        );
        onWidthChange(newPercent);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        onResizeEnd?.(latestPercentRef.current);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [editMode, widthPercent, onWidthChange, onResizeEnd, minPercent, maxPercent]
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ width: `${widthPercent}%` }}
    >
      {children}

      {/* Resize handle — only visible in edit mode */}
      {editMode && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
            "transition-colors hover:bg-primary/30",
            isDragging ? "bg-primary/50" : "bg-border/30"
          )}
          title="Breite anpassen"
        />
      )}
    </div>
  );
}
