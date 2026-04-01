"use client";

import { useRef, useEffect, memo } from "react";

interface Blob {
  x: number;
  y: number;
  radius: number;
  color: [number, number, number];
  xSpeed: number;
  ySpeed: number;
  xPhase: number;
  yPhase: number;
  xFreq: number;
  yFreq: number;
}

function createBlobs(width: number, height: number): Blob[] {
  const colors: [number, number, number][] = [
    [88, 28, 135],   // deep purple
    [15, 118, 110],  // teal
    [6, 95, 70],     // emerald
    [30, 64, 175],   // blue
    [76, 29, 149],   // violet
  ];

  return colors.map((color, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.min(width, height) * (0.25 + Math.random() * 0.15),
    color,
    xSpeed: 0.3 + Math.random() * 0.4,
    ySpeed: 0.2 + Math.random() * 0.3,
    xPhase: Math.random() * Math.PI * 2,
    yPhase: Math.random() * Math.PI * 2,
    xFreq: 0.0003 + i * 0.00008,
    yFreq: 0.0002 + i * 0.00006,
  }));
}

function SoftAuroraInner({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const blobsRef = useRef<Blob[]>([]);
  const lastFrameTime = useRef<number>(0);

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
      blobsRef.current = createBlobs(w, h);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw(timestamp: number) {
      animFrameRef.current = requestAnimationFrame(draw);

      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) return;
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Dark background fill
      ctx!.fillStyle = "rgb(10, 10, 18)";
      ctx!.fillRect(0, 0, w, h);

      ctx!.globalCompositeOperation = "lighter";

      for (const blob of blobsRef.current) {
        const bx = blob.x + Math.sin(timestamp * blob.xFreq + blob.xPhase) * w * 0.3;
        const by = blob.y + Math.cos(timestamp * blob.yFreq + blob.yPhase) * h * 0.25;

        const gradient = ctx!.createRadialGradient(bx, by, 0, bx, by, blob.radius);
        const [r, g, b] = blob.color;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.12)`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.04)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(bx, by, blob.radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalCompositeOperation = "source-over";
    }

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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}

export const SoftAurora = memo(SoftAuroraInner);
