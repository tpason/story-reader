"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, LinearFilter, NormalBlending, Sprite, SRGBColorSpace } from "three";

type MistPuff = {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  rise: number;
  sway: number;
  phase: number;
};

const PUFFS: MistPuff[] = [
  { x: -3.9, y: -3.15, z: -1.7, scale: 1.45, opacity: 0.16, rise: 0.060, sway: 0.18, phase: 0.2 },
  { x: -2.7, y: -2.95, z: -2.1, scale: 1.95, opacity: 0.12, rise: 0.045, sway: 0.24, phase: 1.1 },
  { x: 2.4, y: -3.05, z: -1.9, scale: 1.65, opacity: 0.14, rise: 0.052, sway: 0.20, phase: 2.0 },
  { x: 3.6, y: -2.82, z: -2.4, scale: 2.10, opacity: 0.10, rise: 0.038, sway: 0.26, phase: 3.4 },
  { x: 0.4, y: -3.35, z: -2.6, scale: 2.45, opacity: 0.09, rise: 0.030, sway: 0.30, phase: 4.2 },
];

function createMistTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);

  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 122);
  gradient.addColorStop(0, "rgba(255,255,255,0.42)");
  gradient.addColorStop(0.34, "rgba(244,239,224,0.22)");
  gradient.addColorStop(0.68, "rgba(220,230,226,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 9; i += 1) {
    const x = 80 + (i % 3) * 48;
    const y = 78 + Math.floor(i / 3) * 44;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 48);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

export function MistPlumes() {
  const refs = useRef<Array<Sprite | null>>([]);
  const texture = useMemo(createMistTexture, []);
  useEffect(() => () => { texture.dispose(); }, [texture]);

  useFrame((state, delta) => {
    const MAX_LIFT = 1.75;
    PUFFS.forEach((puff, index) => {
      const sprite = refs.current[index];
      if (!sprite) return;

      sprite.position.y += puff.rise * delta;
      sprite.position.x = puff.x + Math.sin(state.clock.elapsedTime * 0.22 + puff.phase) * puff.sway;
      sprite.material.rotation = Math.sin(state.clock.elapsedTime * 0.10 + puff.phase) * 0.12;

      const lift = sprite.position.y - puff.y;
      const t = Math.min(1, Math.max(0, lift / MAX_LIFT));
      // Ramp in during first 20% of lift, hold at full, ramp out to 0 at 100%
      const fadeIn = Math.min(1, t / 0.20);
      const fadeOut = t < 0.25 ? 1 : Math.max(0, 1 - (t - 0.25) / 0.75);
      sprite.material.opacity = puff.opacity * fadeIn * fadeOut;

      const scale = puff.scale * (1 + lift * 0.18);
      sprite.scale.set(scale * 1.35, scale, 1);

      if (t >= 1) {
        // Reset only after opacity has reached 0 (t==1 guarantees opacity=0)
        sprite.position.y = puff.y;
        sprite.position.x = puff.x;
      }
    });
  });

  return (
    <>
      {PUFFS.map((puff, index) => (
        <sprite
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          position={[puff.x, puff.y, puff.z]}
          scale={[puff.scale * 1.35, puff.scale, 1]}
        >
          <spriteMaterial
            map={texture}
            transparent
            opacity={puff.opacity}
            depthWrite={false}
            blending={NormalBlending}
          />
        </sprite>
      ))}
    </>
  );
}
