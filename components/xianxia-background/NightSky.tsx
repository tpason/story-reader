"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Group, Points, PointsMaterial } from "three";

// Soft disc texture for star glow (shared across groups)
function makeStarTex(size = 64): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.52);
  grad.addColorStop(0,   "rgba(255,255,255,1)");
  grad.addColorStop(0.38,"rgba(255,255,255,0.75)");
  grad.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

// Xianxia star palette: mostly warm white, some gold, rare cool blue
const PALETTE: [number, number, number][] = [
  [1.00, 0.98, 0.94],  // warm white  (60 %)
  [1.00, 0.96, 0.80],  // gold tint   (22 %)
  [0.93, 0.95, 1.00],  // cool blue   (10 %)
  [1.00, 0.91, 0.65],  // deep gold   ( 8 %)
];

function starColor(seed: number, i: number): [number, number, number] {
  const v = Math.abs(Math.sin(seed * 17.3 + i * 23.7));
  if (v < 0.60) return PALETTE[0];
  if (v < 0.82) return PALETTE[1];
  if (v < 0.92) return PALETTE[2];
  return PALETTE[3];
}

// Build a single Points group of stars distributed in upper hemisphere
function buildStarPoints(
  count: number,
  size: number,
  tex: CanvasTexture,
  opacity: number,
  seed: number
): { points: Points; mat: PointsMaterial; geo: BufferGeometry } {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Uniform sphere distribution, biased toward upper sky (y > 0)
    const u = Math.abs(Math.sin(seed + i * 31.7));   // 0-1
    const v = Math.abs(Math.sin(seed + i * 19.3));   // 0-1
    const phi   = Math.acos(1 - u * 1.35);           // 0..~115° (upper + slight below horizon)
    const theta = v * Math.PI * 2;
    const r     = 5.8 + Math.abs(Math.sin(seed + i * 37.1)) * 2.2;
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) + 0.4;  // shift dome slightly upward
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const [cr, cg, cb] = starColor(seed, i);
    col[i * 3]     = cr;
    col[i * 3 + 1] = cg;
    col[i * 3 + 2] = cb;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("color",    new BufferAttribute(col, 3));

  const mat = new PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    map: tex,
    alphaTest: 0.04,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  return { points: new Points(geo, mat), mat, geo };
}

// Three groups twinkle at different phases — produces convincing varied sparkle
const GROUPS = [
  { count: 440, size: 0.019, opacity: 0.52, freq: 0.26, phase: 0.0, seed: 1  },
  { count: 200, size: 0.031, opacity: 0.70, freq: 0.43, phase: 2.1, seed: 17 },
  { count: 65,  size: 0.055, opacity: 0.90, freq: 0.71, phase: 4.4, seed: 37 },
];

export function NightSky() {
  const groupRef = useRef<Group>(null);
  const starData = useRef<Array<{ mat: PointsMaterial; geo: BufferGeometry; baseOpacity: number; freq: number; phase: number }>>([]);

  const tex = useMemo(() => makeStarTex(64), []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const built = GROUPS.map((cfg) => {
      const { points, mat, geo } = buildStarPoints(cfg.count, cfg.size, tex, cfg.opacity, cfg.seed);
      group.add(points);
      return { mat, geo, baseOpacity: cfg.opacity, freq: cfg.freq, phase: cfg.phase };
    });
    starData.current = built;

    return () => {
      built.forEach(({ mat, geo }) => {
        group.children.forEach((c) => { if ((c as Points).material === mat) group.remove(c); });
        geo.dispose();
        mat.dispose();
      });
    };
  }, [tex]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const group = groupRef.current;
    if (!group) return;

    // Very slow celestial drift
    group.rotation.y += 0.000015;

    // Each group shimmers at its own frequency → convincing multi-star twinkle
    starData.current.forEach((g) => {
      g.mat.opacity = g.baseOpacity * (0.70 + 0.30 * Math.sin(t * g.freq + g.phase));
    });
  });

  return <group ref={groupRef} />;
}
