"use client";

import { useRef, useEffect, memo } from "react";

interface Line {
  x: number;
  y: number;
  length: number;
  angle: number;
  speed: number;
  color: [number, number, number];
  alpha: number;
  width: number;
}

function createLines(width: number, height: number): Line[] {
  const colors: [number, number, number][] = [
    [255, 255, 255], // white
    [147, 197, 253], // light blue
    [196, 181, 253], // light purple
    [167, 243, 208], // light green
    [253, 186, 116], // soft orange
  ];

  const lines: Line[] = [];
  for (let i = 0; i < 18; i++) {
    lines.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 100 + Math.random() * 250,
      angle: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.3,
      color: colors[i % colors.length],
      alpha: 0.08 + Math.random() * 0.12,
      width: 0.5 + Math.random() * 1,
    });
  }
  return lines;
}

function FloatingLinesInner({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const linesRef = useRef<Line[]>([]);
  const lastFrameTime = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const FPS_INTERVAL = 1000 / 30;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(dpr, dpr);
      linesRef.current = createLines(w, h);
    }

    function handleMouseMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    }

    function handleMouseLeave() {
      mouseRef.current = null;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    function drawGlowLine(
      line: Line,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) {
      const [r, g, b] = line.color;
      // Outer glow
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${line.alpha * 0.3})`;
      ctx!.lineWidth = line.width + 4;
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();

      // Middle glow
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${line.alpha * 0.6})`;
      ctx!.lineWidth = line.width + 2;
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();

      // Core line
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${line.alpha})`;
      ctx!.lineWidth = line.width;
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();
    }

    function draw(timestamp: number) {
      animFrameRef.current = requestAnimationFrame(draw);

      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) return;
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Dark background
      ctx!.fillStyle = "rgb(10, 10, 18)";
      ctx!.fillRect(0, 0, w, h);

      ctx!.lineCap = "round";

      for (const line of linesRef.current) {
        // Move the line
        line.x += Math.cos(line.angle) * line.speed;
        line.y += Math.sin(line.angle) * line.speed;

        // Slight angle variation for organic feel
        line.angle += (Math.random() - 0.5) * 0.003;

        // Wrap around screen edges
        if (line.x < -line.length) line.x = w + line.length;
        if (line.x > w + line.length) line.x = -line.length;
        if (line.y < -line.length) line.y = h + line.length;
        if (line.y > h + line.length) line.y = -line.length;

        // Calculate end point
        let endX = line.x + Math.cos(line.angle) * line.length;
        let endY = line.y + Math.sin(line.angle) * line.length;

        // Subtle mouse repulsion
        if (mouseRef.current) {
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;
          const midX = (line.x + endX) / 2;
          const midY = (line.y + endY) / 2;
          const dx = midX - mx;
          const dy = midY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 0) {
            const force = (200 - dist) / 200 * 0.8;
            const pushX = (dx / dist) * force;
            const pushY = (dy / dist) * force;
            line.x += pushX;
            line.y += pushY;
            endX += pushX;
            endY += pushY;
          }
        }

        drawGlowLine(line, line.x, line.y, endX, endY);
      }
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}

export const FloatingLines = memo(FloatingLinesInner);
