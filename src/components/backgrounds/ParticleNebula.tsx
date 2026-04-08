"use client";

import { useRef, useEffect, memo } from "react";

const FPS_INTERVAL = 1000 / 30;
const PARTICLE_COUNT = 120;

interface Particle {
  x: number; y: number; vx: number; vy: number; r: number;
  color: number[]; alpha: number; pulse: number; pulseSpeed: number;
}

function ParticleNebulaInner({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const lastFrameTime = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const colors = [
      [99, 102, 241], [139, 92, 246], [236, 72, 153],
      [34, 211, 238], [251, 191, 36], [16, 185, 129],
    ];

    function createParticles(): Particle[] {
      return Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      }));
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
      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles();
      }
    }

    function draw(timestamp: number) {
      animFrameRef.current = requestAnimationFrame(draw);
      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < FPS_INTERVAL) return;
      lastFrameTime.current = timestamp - (elapsed % FPS_INTERVAL);

      timeRef.current++;
      const t = timeRef.current;

      ctx!.fillStyle = "rgba(10, 10, 24, 0.15)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "lighter";

      const cx1 = w * 0.3 + Math.sin(t * 0.003) * 40;
      const cy1 = h * 0.4 + Math.cos(t * 0.004) * 30;
      const g1 = ctx!.createRadialGradient(cx1, cy1, 0, cx1, cy1, 200);
      g1.addColorStop(0, "rgba(99,102,241,0.03)");
      g1.addColorStop(1, "rgba(99,102,241,0)");
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, w, h);

      const cx2 = w * 0.7 + Math.cos(t * 0.003) * 35;
      const cy2 = h * 0.6 + Math.sin(t * 0.005) * 25;
      const g2 = ctx!.createRadialGradient(cx2, cy2, 0, cx2, cy2, 180);
      g2.addColorStop(0, "rgba(236,72,153,0.025)");
      g2.addColorStop(1, "rgba(236,72,153,0)");
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.vx + Math.sin(t * 0.005 + p.pulse) * 0.1;
        p.y += p.vy + Math.cos(t * 0.004 + p.pulse) * 0.1;
        p.pulse += p.pulseSpeed;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
        const glowR = p.r * 6;
        const glow = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        glow.addColorStop(0, `rgba(${p.color.join(",")}, ${a * 0.4})`);
        glow.addColorStop(0.4, `rgba(${p.color.join(",")}, ${a * 0.1})`);
        glow.addColorStop(1, `rgba(${p.color.join(",")}, 0)`);
        ctx!.fillStyle = glow;
        ctx!.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color.join(",")}, ${a})`;
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

export const ParticleNebula = memo(ParticleNebulaInner);
