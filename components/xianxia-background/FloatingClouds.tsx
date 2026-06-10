"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Mesh } from "three";
import type { TimeOfDay } from "./sceneConfig";

// Time-of-day tint for cloud procedural texture
const CLOUD_TINTS: Record<TimeOfDay, [number, number, number]> = {
  dawn:  [255, 228, 185],   // warm pink-gold
  day:   [255, 252, 242],   // neutral cream
  dusk:  [255, 200, 155],   // warm amber-orange
  night: [175, 198, 242],   // cool blue-silver
};

function makeCloudTex(seed: number, tint: [number, number, number], size = 512): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const [tr, tg, tb] = tint;

  const rnd = (n: number) => {
    const x = Math.sin(seed * 47.31 + n * 127.1) * 43758.55;
    return x - Math.floor(x);
  };

  const cx = size * 0.50;
  const cy = size * 0.54;
  const blobs = 6 + Math.floor(rnd(99) * 3);

  for (let i = 0; i < blobs; i++) {
    const bx = cx + (rnd(i * 4)     - 0.5) * size * 0.65;
    const by = cy + (rnd(i * 4 + 1) - 0.5) * size * 0.24;
    const r  = (0.11 + rnd(i * 4 + 2) * 0.17) * size;
    const a  =  0.13 + rnd(i * 4 + 3) * 0.07;

    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    grad.addColorStop(0,   `rgba(${tr},${tg},${tb},${a})`);
    grad.addColorStop(0.5, `rgba(${Math.round(tr * 0.97)},${Math.round(tg * 0.97)},${Math.round(tb * 0.96)},${(a * 0.42).toFixed(3)})`);
    grad.addColorStop(1,   `rgba(${Math.round(tr * 0.94)},${Math.round(tg * 0.94)},${Math.round(tb * 0.88)},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  return new CanvasTexture(canvas);
}

type CloudDef = {
  texIdx: number;
  initX: number;
  y: number;
  z: number;
  w: number;
  h: number;
  opacity: number;
  speed: number;
  bobAmp: number;
  bobPhase: number;
};

const CLOUDS: CloudDef[] = [
  { texIdx: 0, initX: -5.5, y: 2.2, z: -7.8, w: 4.4, h: 1.5, opacity: 0.36, speed:  0.22, bobAmp: 0.08, bobPhase: 0.0 },
  { texIdx: 1, initX:  3.8, y: 3.0, z: -7.5, w: 5.0, h: 1.7, opacity: 0.32, speed: -0.18, bobAmp: 0.10, bobPhase: 1.4 },
  { texIdx: 2, initX: -1.2, y: 3.4, z: -7.1, w: 5.6, h: 1.8, opacity: 0.30, speed:  0.27, bobAmp: 0.07, bobPhase: 2.7 },
  { texIdx: 0, initX:  5.8, y: 1.7, z: -6.7, w: 3.8, h: 1.3, opacity: 0.28, speed: -0.15, bobAmp: 0.09, bobPhase: 0.8 },
  { texIdx: 1, initX: -6.2, y: 0.8, z: -6.2, w: 5.2, h: 1.6, opacity: 0.26, speed:  0.20, bobAmp: 0.06, bobPhase: 3.4 },
  { texIdx: 2, initX:  0.8, y: 2.6, z: -5.7, w: 3.6, h: 1.2, opacity: 0.24, speed: -0.23, bobAmp: 0.08, bobPhase: 1.9 },
  { texIdx: 0, initX: -3.2, y: 1.8, z: -5.1, w: 4.8, h: 1.5, opacity: 0.22, speed:  0.17, bobAmp: 0.06, bobPhase: 4.1 },
  { texIdx: 1, initX:  6.8, y: 0.4, z: -4.6, w: 3.2, h: 1.1, opacity: 0.19, speed: -0.13, bobAmp: 0.05, bobPhase: 2.2 },
  { texIdx: 2, initX: -4.5, y: 1.2, z: -4.2, w: 4.0, h: 1.3, opacity: 0.17, speed:  0.19, bobAmp: 0.07, bobPhase: 5.0 },
];

const WRAP = 9.5;

type FloatingCloudsProps = {
  timeOfDay?: TimeOfDay;
};

export function FloatingClouds({ timeOfDay = "day" }: FloatingCloudsProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);

  const textures = useMemo(() => {
    const tint = CLOUD_TINTS[timeOfDay];
    return [makeCloudTex(3, tint), makeCloudTex(11, tint), makeCloudTex(19, tint)];
  }, [timeOfDay]);

  useEffect(() => () => { textures.forEach((t) => t.dispose()); }, [textures]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    CLOUDS.forEach((def, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.position.x += def.speed * delta;
      if (mesh.position.x >  WRAP) mesh.position.x -= WRAP * 2;
      if (mesh.position.x < -WRAP) mesh.position.x += WRAP * 2;
      mesh.position.y = def.y + Math.sin(t * 0.13 + def.bobPhase) * def.bobAmp;
    });
  });

  return (
    <>
      {CLOUDS.map((def, i) => (
        <mesh
          key={i}
          ref={(n) => { meshRefs.current[i] = n; }}
          position={[def.initX, def.y, def.z]}
        >
          <planeGeometry args={[def.w, def.h]} />
          <meshBasicMaterial
            map={textures[def.texIdx]}
            transparent
            opacity={def.opacity}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}
