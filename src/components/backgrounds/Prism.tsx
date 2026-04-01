"use client";

import { useRef, useEffect, memo } from "react";

interface Shape {
  cx: number;
  cy: number;
  radius: number;
  sides: number;
  rotation: number;
  rotSpeed: number;
  hue: number;
  hueSpeed: number;
  alpha: number;
  driftX: number;
  driftY: number;
  driftXFreq: number;
  driftYFreq: number;
  driftXPhase: number;
  driftYPhase: number;
}

function createShapes(width: number, height: number): Shape[] {
  const shapes: Shape[] = [];
  const count = 7;

  for (let i = 0; i < count; i++) {
    shapes.push({
      cx: width * (0.2 + Math.random() * 0.6),
      cy: height * (0.2 + Math.random() * 0.6),
      radius: Math.min(width, height) * (0.12 + Math.random() * 0.15),
      sides: 3 + Math.floor(Math.random() * 4), // 3-6 sides
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (0.0002 + Math.random() * 0.0003) * (Math.random() > 0.5 ? 1 : -1),
      hue: (360 / count) * i,
      hueSpeed: 0.01 + Math.random() * 0.02,
      alpha: 0.06 + Math.random() * 0.06,
      driftX: width * 0.15,
      driftY: height * 0.12,
      driftXFreq: 0.0002 + Math.random() * 0.0002,
      driftYFreq: 0.00015 + Math.random() * 0.00015,
      driftXPhase: Math.random() * Math.PI * 2,
      driftYPhase: Math.random() * Math.PI * 2,
    });
  }
  return shapes;
}

function PrismInner({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const shapesRef = useRef<Shape[]>([]);
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
      shapesRef.current = createShapes(w, h);
    }

    resize();
    window.addEventListener("resize", resize);

    function drawPolygon(
      x: number,
      y: number,
      radius: number,
      sides: number,
      rotation: number,
      hue: number,
      alpha: number
    ) {
      ctx!.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = rotation + (i * Math.PI * 2) / sides;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) {
          ctx!.moveTo(px, py);
        } else {
          ctx!.lineTo(px, py);
        }
      }
      ctx!.closePath();

      // Fill with prismatic color
      const gradient = ctx!.createLinearGradient(
        x - radius,
        y - radius,
        x + radius,
        y + radius
      );
      gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${hue + 40}, 80%, 55%, ${alpha * 0.7})`);
      gradient.addColorStop(1, `hsla(${hue + 80}, 80%, 50%, ${alpha * 0.4})`);

      ctx!.fillStyle = gradient;
      ctx!.fill();

      // Subtle edge glow
      ctx!.strokeStyle = `hsla(${hue + 20}, 90%, 70%, ${alpha * 0.5})`;
      ctx!.lineWidth = 1;
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

      ctx!.globalCompositeOperation = "screen";

      for (const shape of shapesRef.current) {
        shape.rotation += shape.rotSpeed * (elapsed || FPS_INTERVAL);
        shape.hue = (shape.hue + shape.hueSpeed) % 360;

        const x =
          shape.cx +
          Math.sin(timestamp * shape.driftXFreq + shape.driftXPhase) *
            shape.driftX;
        const y =
          shape.cy +
          Math.cos(timestamp * shape.driftYFreq + shape.driftYPhase) *
            shape.driftY;

        drawPolygon(
          x,
          y,
          shape.radius,
          shape.sides,
          shape.rotation,
          shape.hue,
          shape.alpha
        );

        // Draw a second slightly offset copy for depth
        drawPolygon(
          x + shape.radius * 0.15,
          y + shape.radius * 0.1,
          shape.radius * 0.8,
          shape.sides,
          shape.rotation + 0.3,
          shape.hue + 60,
          shape.alpha * 0.5
        );
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

export const Prism = memo(PrismInner);
