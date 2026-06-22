"use client";

import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer
} from "three";
import { prefersReducedMotion } from "@/lib/browser";

type ThreeNotificationOrbProps = {
  trigger: number;
  className?: string;
};

const PARTICLE_COUNT = 10;

export function ThreeNotificationOrb({ trigger, className = "" }: ThreeNotificationOrbProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trigger || prefersReducedMotion()) return;
    const host = hostRef.current;
    if (!host) return;

    const size = 96;
    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size, false);
    renderer.domElement.className = "three-notification-orb-canvas";
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 20);
    camera.position.z = 2.4;

    const geometry = new BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = Array.from({ length: PARTICLE_COUNT }, (_, index) => index / PARTICLE_COUNT);
    geometry.setAttribute("position", new BufferAttribute(positions, 3));

    const gold = new Color("#f0d06a");
    const jade = new Color("#26a882");
    const material = new PointsMaterial({
      size: 0.14,
      color: gold,
      transparent: true,
      opacity: 0.88,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new Points(geometry, material);
    scene.add(points);

    let frame = 0;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      frame += 1;

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const angle = seeds[index] * Math.PI * 2 + elapsed * (1.6 + seeds[index]);
        const radius = 0.35 + seeds[index] * 0.55 + Math.sin(elapsed * 2 + index) * 0.08;
        positions[index * 3] = Math.cos(angle) * radius;
        positions[index * 3 + 1] = Math.sin(angle) * radius * 0.72 + elapsed * 0.08;
        positions[index * 3 + 2] = Math.sin(elapsed + index) * 0.12;
      }
      geometry.attributes.position.needsUpdate = true;
      material.color.copy(indexBlend(gold, jade, (Math.sin(elapsed * 1.4) + 1) * 0.5));
      points.rotation.z = elapsed * 0.35;
      renderer.render(scene, camera);

      if (elapsed < 1.35) {
        raf = window.requestAnimationFrame(tick);
      } else {
        cleanup();
      }
    };

    const cleanup = () => {
      window.cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };

    raf = window.requestAnimationFrame(tick);
    return cleanup;
  }, [trigger]);

  if (prefersReducedMotion()) return null;

  return <div ref={hostRef} className={`three-notification-orb ${className}`.trim()} aria-hidden="true" />;
}

function indexBlend(a: Color, b: Color, t: number) {
  return new Color().copy(a).lerp(b, t);
}
