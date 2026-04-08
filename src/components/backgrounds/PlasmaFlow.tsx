"use client";

import { useRef, useEffect, memo } from "react";

const FPS_INTERVAL = 1000 / 30;

function PlasmaFlowInner({ className }: { className?: string }) {
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

    function plasma(x: number, y: number, t: number): number {
      let v = Math.sin(x * 0.008 + t);
      v += Math.sin(y * 0.006 + t * 0.4);
      v += Math.sin((x + y) * 0.005 + t * 0.3);
      v += Math.sin(Math.sqrt(x * x + y * y) * 0.006 - t * 0.3);
      return v / 4;
    }

    function draw(timestamp: number) {
      animFrameRef.current = requestAnimationFrame(draw);
      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) return;
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      timeRef.current += 0.004; // Much slower, calmer pace
      const t = timeRef.current;
      const imgData = ctx!.createImageData(w, h);
      const step = 4;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const v = plasma(x, y, t);
          // Darker, muted tones — deep purple/blue, not psychedelic
          const r = Math.floor(25 + 40 * Math.sin(v * Math.PI + 0.5));
          const g = Math.floor(15 + 25 * Math.sin(v * Math.PI + 2.5));
          const b = Math.floor(50 + 50 * Math.sin(v * Math.PI + 4.0));
          for (let dy = 0; dy < step && y + dy < h; dy++) {
            for (let dx = 0; dx < step && x + dx < w; dx++) {
              const i = ((y + dy) * w + (x + dx)) * 4;
              imgData.data[i] = r;
              imgData.data[i + 1] = g;
              imgData.data[i + 2] = b;
              imgData.data[i + 3] = 255;
            }
          }
        }
      }
      ctx!.putImageData(imgData, 0, 0);
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

export const PlasmaFlow = memo(PlasmaFlowInner);
