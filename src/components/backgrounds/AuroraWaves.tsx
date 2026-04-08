"use client";

import { useRef, useEffect, memo } from "react";

const FPS_INTERVAL = 1000 / 30;

interface AuroraBand {
  offset: number; speed: number; amp: number; freq: number;
  color: number[]; alpha: number; width: number;
}

function AuroraWavesInner({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const lastFrameTime = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const bands: AuroraBand[] = [
      { offset: 0.35, speed: 0.8, amp: 40, freq: 0.003, color: [99, 200, 241], alpha: 0.15, width: 120 },
      { offset: 0.45, speed: 0.6, amp: 50, freq: 0.004, color: [120, 80, 220], alpha: 0.12, width: 100 },
      { offset: 0.40, speed: 1.0, amp: 35, freq: 0.005, color: [34, 211, 180], alpha: 0.1, width: 140 },
      { offset: 0.50, speed: 0.5, amp: 55, freq: 0.002, color: [180, 60, 200], alpha: 0.08, width: 90 },
      { offset: 0.30, speed: 0.9, amp: 30, freq: 0.006, color: [60, 220, 160], alpha: 0.12, width: 110 },
    ];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.scale(dpr, dpr);
    }

    function draw(timestamp: number) {
      animFrameRef.current = requestAnimationFrame(draw);
      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) return;
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      timeRef.current += 0.008;
      const t = timeRef.current;

      ctx!.fillStyle = "rgb(10, 10, 24)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "lighter";

      for (const band of bands) {
        const baseY = h * band.offset;
        ctx!.beginPath();
        ctx!.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const y = baseY
            + Math.sin(x * band.freq + t * band.speed) * band.amp
            + Math.sin(x * band.freq * 1.5 + t * band.speed * 0.7) * band.amp * 0.5;
          ctx!.lineTo(x, y);
        }
        ctx!.lineTo(w, h);
        ctx!.closePath();

        const grd = ctx!.createLinearGradient(0, baseY - band.width, 0, baseY + band.width);
        const c = band.color.join(",");
        grd.addColorStop(0, `rgba(${c}, 0)`);
        grd.addColorStop(0.3, `rgba(${c}, ${band.alpha})`);
        grd.addColorStop(0.5, `rgba(${c}, ${band.alpha * 1.5})`);
        grd.addColorStop(0.7, `rgba(${c}, ${band.alpha})`);
        grd.addColorStop(1, `rgba(${c}, 0)`);
        ctx!.fillStyle = grd;
        ctx!.fill();
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

export const AuroraWaves = memo(AuroraWavesInner);
