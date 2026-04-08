"use client";

import { useRef, useEffect, memo } from "react";
import type { MeshConfig } from "@/types/background";
import { defaultMeshConfig } from "@/types/background";

const FPS_INTERVAL = 1000 / 30;

interface MeshPoint {
  x: number; y: number; vx: number; vy: number; r: number; color: number[];
}

function MeshGradientInner({ className, config }: { className?: string; config?: Partial<MeshConfig> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const lastFrameTime = useRef(0);
  const pointsRef = useRef<MeshPoint[]>([]);
  const timeRef = useRef(0);
  const configRef = useRef({ ...defaultMeshConfig, ...config });
  configRef.current = { ...defaultMeshConfig, ...config };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = 0;
    let h = 0;

    function createPoints(): MeshPoint[] {
      return [
        { x: 0.2, y: 0.3, vx: 0.0003, vy: 0.0004, r: 0.35, color: [99, 102, 241] },
        { x: 0.7, y: 0.2, vx: -0.0004, vy: 0.0003, r: 0.4, color: [236, 72, 153] },
        { x: 0.5, y: 0.8, vx: 0.0002, vy: -0.0005, r: 0.35, color: [34, 211, 238] },
        { x: 0.8, y: 0.7, vx: -0.0003, vy: -0.0002, r: 0.3, color: [251, 191, 36] },
        { x: 0.3, y: 0.6, vx: 0.0004, vy: 0.0002, r: 0.28, color: [16, 185, 129] },
      ];
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(dpr, dpr);
      if (pointsRef.current.length === 0) {
        pointsRef.current = createPoints();
      }
    }

    function draw(timestamp: number) {
      animFrameRef.current = requestAnimationFrame(draw);
      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) return;
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      const cfg = configRef.current;
      const speedMultiplier = cfg.speed / defaultMeshConfig.speed;

      timeRef.current++;
      const t = timeRef.current;

      ctx!.fillStyle = "rgb(10, 10, 24)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "lighter";

      for (const p of pointsRef.current) {
        p.x += (p.vx + Math.sin(t * 0.005) * 0.0002) * speedMultiplier;
        p.y += (p.vy + Math.cos(t * 0.004) * 0.0002) * speedMultiplier;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.x = Math.max(0, Math.min(1, p.x));
        p.y = Math.max(0, Math.min(1, p.y));

        const blobScale = cfg.blobSize / defaultMeshConfig.blobSize;
        const radius = p.r * blobScale * Math.min(w, h);
        const sat = cfg.saturation;
        const grd = ctx!.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, radius);
        grd.addColorStop(0, `rgba(${p.color.join(",")}, ${0.5 * sat})`);
        grd.addColorStop(0.5, `rgba(${p.color.join(",")}, ${0.15 * sat})`);
        grd.addColorStop(1, `rgba(${p.color.join(",")}, 0)`);
        ctx!.fillStyle = grd;
        ctx!.fillRect(0, 0, w, h);
      }

      ctx!.globalCompositeOperation = "source-over";
    }

    resize();
    window.addEventListener("resize", resize);
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}
    />
  );
}

export const MeshGradient = memo(MeshGradientInner);
