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
  /** Show the left resize handle (adjusts left margin or symmetric width) */
  showLeftHandle?: boolean;
  /** Show the right resize handle */
  showRightHandle?: boolean;
  /** Left margin percent (used when panel is expanded) */
  marginLeftPercent?: number;
  onMarginLeftChange?: (percent: number) => void;
  onMarginLeftResizeEnd?: (percent: number) => void;
  /** When true, both handles adjust width symmetrically and container is centered */
  symmetricMode?: boolean;
}

export function ResizableContainer({
  children,
  widthPercent,
  onWidthChange,
  onResizeEnd,
  className,
  minPercent = 40,
  maxPercent = 95,
  showLeftHandle = false,
  showRightHandle = true,
  marginLeftPercent = 0,
  onMarginLeftChange,
  onMarginLeftResizeEnd,
  symmetricMode = false,
}: ResizableContainerProps) {
  const { editMode } = useEditMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const latestPercentRef = useRef(widthPercent);
  latestPercentRef.current = widthPercent;
  const latestMarginRef = useRef(marginLeftPercent);
  latestMarginRef.current = marginLeftPercent;

  /** Right handle: drag to adjust width (or symmetric width) */
  const handleRightMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      e.preventDefault();
      setIsDraggingRight(true);

      const startX = e.clientX;
      const parentWidth =
        containerRef.current?.parentElement?.clientWidth ?? window.innerWidth;
      const startPercent = widthPercent;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercent = (deltaX / parentWidth) * 100;
        if (symmetricMode) {
          // Both sides adjust: dragging right outward increases width by 2x delta
          const newPercent = Math.round(
            Math.min(maxPercent, Math.max(minPercent, startPercent + deltaPercent * 2))
          );
          onWidthChange(newPercent);
        } else {
          const newPercent = Math.round(
            Math.min(maxPercent, Math.max(minPercent, startPercent + deltaPercent))
          );
          onWidthChange(newPercent);
        }
      };

      const handleMouseUp = () => {
        setIsDraggingRight(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        onResizeEnd?.(latestPercentRef.current);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [editMode, widthPercent, onWidthChange, onResizeEnd, minPercent, maxPercent, symmetricMode]
  );

  /** Left handle: drag to adjust left margin (or symmetric width when symmetricMode) */
  const handleLeftMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editMode) return;
      e.preventDefault();
      setIsDraggingLeft(true);

      const startX = e.clientX;
      const parentWidth =
        containerRef.current?.parentElement?.clientWidth ?? window.innerWidth;

      if (symmetricMode) {
        // Symmetric: dragging left handle leftward increases width
        const startPercent = widthPercent;
        const handleMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaPercent = (deltaX / parentWidth) * 100;
          // Dragging left (negative deltaX) should increase width
          const newPercent = Math.round(
            Math.min(maxPercent, Math.max(minPercent, startPercent - deltaPercent * 2))
          );
          onWidthChange(newPercent);
        };

        const handleMouseUp = () => {
          setIsDraggingLeft(false);
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          onResizeEnd?.(latestPercentRef.current);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      } else {
        // Non-symmetric: left handle adjusts margin
        const startMargin = marginLeftPercent;
        const handleMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaPercent = (deltaX / parentWidth) * 100;
          const newMargin = Math.round(
            Math.min(30, Math.max(0, startMargin + deltaPercent))
          );
          onMarginLeftChange?.(newMargin);
        };

        const handleMouseUp = () => {
          setIsDraggingLeft(false);
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          onMarginLeftResizeEnd?.(latestMarginRef.current);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      }
    },
    [editMode, widthPercent, marginLeftPercent, onWidthChange, onMarginLeftChange, onResizeEnd, onMarginLeftResizeEnd, minPercent, maxPercent, symmetricMode]
  );

  const marginStyle = symmetricMode
    ? "margin-left: auto; margin-right: auto;"
    : `margin-left: ${marginLeftPercent}%;`;

  return (
    <>
      <style>{`
        @media (min-width: 1280px) {
          .resizable-dashboard {
            width: ${widthPercent}%;
            ${marginStyle}
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className={cn("relative w-full resizable-dashboard", className)}
      >
        {/* Left resize handle — only visible in edit mode */}
        {editMode && showLeftHandle && (
          <div
            onMouseDown={handleLeftMouseDown}
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
              "transition-colors hover:bg-primary/30",
              isDraggingLeft ? "bg-primary/50" : "bg-border/30"
            )}
            title="Linken Rand anpassen"
          />
        )}

        {children}

        {/* Right resize handle — only visible in edit mode */}
        {editMode && showRightHandle && (
          <div
            onMouseDown={handleRightMouseDown}
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10",
              "transition-colors hover:bg-primary/30",
              isDraggingRight ? "bg-primary/50" : "bg-border/30"
            )}
            title="Breite anpassen"
          />
        )}
      </div>
    </>
  );
}
