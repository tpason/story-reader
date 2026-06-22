"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";

type SpiritBurstCanvasProps = {
  /** Increment to fire a new burst. */
  trigger: number;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
};

const PARTICLE_COUNT = 14;

export function SpiritBurstCanvas({ trigger, className = "" }: SpiritBurstCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger || prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 96;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 0.55 + Math.random() * 1.1;
      return {
        x: size / 2,
        y: size / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.35,
        life: 0,
        maxLife: 42 + Math.floor(Math.random() * 18),
        size: 1.4 + Math.random() * 2.2,
        hue: index % 2 === 0 ? 46 : 158
      };
    });

    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, size, size);

      let alive = 0;
      for (const particle of particles) {
        particle.life += 1;
        if (particle.life > particle.maxLife) continue;
        alive += 1;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.018;
        particle.vx *= 0.992;
        particle.vy *= 0.992;

        const t = 1 - particle.life / particle.maxLife;
        const alpha = t * t * 0.85;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${particle.hue}, 78%, 58%, ${alpha})`;
        ctx.arc(particle.x, particle.y, particle.size * (0.6 + t * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }

      if (alive > 0 && frame < 90) {
        raf = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, size, size);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [trigger]);

  if (prefersReducedMotion()) return null;

  return <canvas ref={canvasRef} className={`spirit-burst-canvas ${className}`.trim()} aria-hidden="true" />;
}
