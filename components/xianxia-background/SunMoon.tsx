"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TimeOfDay } from "./sceneConfig";

// Soft radial glow — used for sun corona and moon silver halo
function makeGlowTex(r: number, g: number, b: number, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.20, `rgba(${r},${g},${b},0.88)`);
  grad.addColorStop(0.50, `rgba(${r},${g},${b},0.28)`);
  grad.addColorStop(0.75, `rgba(${r},${g},${b},0.06)`);
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Moon surface with subtle crater detail
function makeMoonTex(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.46);
  grad.addColorStop(0,    "rgba(248,244,232,1)");
  grad.addColorStop(0.55, "rgba(228,224,212,0.92)");
  grad.addColorStop(0.82, "rgba(205,202,195,0.42)");
  grad.addColorStop(1,    "rgba(180,178,172,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Soft crater shadows
  for (const [cx, cy, cr, a] of [
    [c + 28, c - 18, 20, 0.06], [c - 38, c + 12, 16, 0.05],
    [c + 8,  c + 32, 13, 0.04], [c - 12, c - 32, 11, 0.04],
  ] as [number, number, number, number][]) {
    const s = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    s.addColorStop(0, `rgba(140,138,130,${a})`);
    s.addColorStop(1, "rgba(200,200,198,0)");
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

// Per-preset appearance config
const CFG: Record<TimeOfDay, {
  coreRGB: [number, number, number];
  glowRGB: [number, number, number];
  coreW: number;  // world units
  glowW: number;
  glowBase: number;  // base opacity for glow
  isMoon: boolean;
}> = {
  dawn:  { coreRGB: [255, 165, 55],  glowRGB: [255, 110, 25],  coreW: 0.58, glowW: 3.6, glowBase: 0.42, isMoon: false },
  day:   { coreRGB: [255, 252, 215], glowRGB: [255, 240, 175], coreW: 0.55, glowW: 2.8, glowBase: 0.28, isMoon: false },
  dusk:  { coreRGB: [255, 90,  35],  glowRGB: [220, 60,  15],  coreW: 0.64, glowW: 3.8, glowBase: 0.44, isMoon: false },
  night: { coreRGB: [242, 240, 228], glowRGB: [158, 172, 215], coreW: 0.52, glowW: 2.6, glowBase: 0.24, isMoon: true  },
};

type SunMoonProps = {
  timeOfDay: TimeOfDay;
  position: [number, number, number];
};

export function SunMoon({ timeOfDay, position }: SunMoonProps) {
  const cfg = CFG[timeOfDay];
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const { coreTex, glowTex } = useMemo(() => {
    const [r, g, b] = cfg.coreRGB;
    const [gr, gg, gb] = cfg.glowRGB;
    return {
      coreTex: cfg.isMoon ? makeMoonTex() : makeGlowTex(r, g, b),
      glowTex: makeGlowTex(gr, gg, gb),
    };
  }, [timeOfDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispose textures when timeOfDay changes or component unmounts
  useEffect(() => () => {
    coreTex.dispose();
    glowTex.dispose();
  }, [coreTex, glowTex]);

  // Subtle corona / moonlight pulse
  useFrame(({ clock }) => {
    if (!glowMatRef.current) return;
    const t = clock.elapsedTime;
    glowMatRef.current.opacity = cfg.glowBase * (0.84 + Math.sin(t * 0.62) * 0.16);
  });

  return (
    <group position={position}>
      {/* Wide soft glow — AdditiveBlending so it bleeds into sky */}
      <mesh>
        <planeGeometry args={[cfg.glowW, cfg.glowW]} />
        <meshBasicMaterial
          ref={glowMatRef}
          map={glowTex}
          transparent
          opacity={cfg.glowBase}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Core disc — slightly in front so it isn't eaten by glow */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[cfg.coreW, cfg.coreW]} />
        <meshBasicMaterial
          map={coreTex}
          transparent
          opacity={cfg.isMoon ? 0.90 : 0.96}
          blending={cfg.isMoon ? THREE.NormalBlending : THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
