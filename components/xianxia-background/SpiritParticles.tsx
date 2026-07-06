"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, DynamicDrawUsage, Points, ShaderMaterial } from "three";

const DEFAULT_COUNT = 120;

// Per-particle pulsing size — each hạt linh khí breathes independently
const VS = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (8.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FS = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.04) discard;
    gl_FragColor = vec4(vColor, tex.a * 0.72);
  }
`;

function makeDiscTex(size = 128): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.72)");
  grad.addColorStop(0.72, "rgba(255,255,255,0.22)");
  grad.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

// Xianxia linh khí palette
const COLORS: [number, number, number][] = [
  [0.94, 0.82, 0.42],  // gold        #f0d06a  — 52%
  [1.00, 0.95, 0.70],  // gold-light  #fff0b2  — 23%
  [0.15, 0.66, 0.51],  // jade        #26a882  — 15%
  [0.96, 0.75, 0.26],  // amber       #f4bf42  — 10%
];

function pickColor(i: number): [number, number, number] {
  const v = Math.abs(Math.sin(i * 29.7 + 4.3));
  if (v < 0.52) return COLORS[0];
  if (v < 0.75) return COLORS[1];
  if (v < 0.90) return COLORS[2];
  return COLORS[3];
}

export function SpiritParticles({ count = DEFAULT_COUNT }: { count?: number }) {
  const pointsRef = useRef<Points>(null);
  const safeCount = Math.max(8, Math.min(count, DEFAULT_COUNT));

  const { geo, mat, positions, velocities, baseSizes, phases, sizeAttr, discTex } = useMemo(() => {
    const discTex = makeDiscTex(128);

    const positions  = new Float32Array(safeCount * 3);
    const colors     = new Float32Array(safeCount * 3);
    const sizes      = new Float32Array(safeCount);
    const baseSizes  = new Float32Array(safeCount);
    const phases     = new Float32Array(safeCount);
    const velocities = new Float32Array(safeCount * 2);

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 14;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = -0.6 - Math.random() * 7;

      velocities[i * 2]     = (Math.random() - 0.5) * 0.14;
      velocities[i * 2 + 1] = 0.07 + Math.random() * 0.20;

      baseSizes[i] = 7 + Math.random() * 14;   // pixel base sizes 7–21px
      sizes[i]     = baseSizes[i];
      phases[i]    = Math.random() * Math.PI * 2;

      const [r, g, b] = pickColor(i);
      colors[i3] = r; colors[i3 + 1] = g; colors[i3 + 2] = b;
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color",    new BufferAttribute(colors, 3));
    const sizeAttr = new BufferAttribute(sizes, 1);
    sizeAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("size", sizeAttr);

    const mat = new ShaderMaterial({
      uniforms:       { pointTexture: { value: discTex } },
      vertexShader:   VS,
      fragmentShader: FS,
      blending:       AdditiveBlending,
      depthWrite:     false,
      transparent:    true,
    });

    return { geo, mat, positions, velocities, baseSizes, phases, sizeAttr, discTex };
  }, [safeCount]);

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
    discTex.dispose();
  }, [geo, mat, discTex]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const posAttr = pointsRef.current?.geometry.attributes.position as BufferAttribute | undefined;
    if (!posAttr) return;

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      positions[i3]     += velocities[i * 2]     * delta;
      positions[i3 + 1] += velocities[i * 2 + 1] * delta;

      if (positions[i3 + 1] > 5.8) {
        positions[i3 + 1] = -5.8;
        positions[i3]     = (Math.random() - 0.5) * 14;
      }

      // Per-particle breathing size
      sizeAttr.array[i] = baseSizes[i] * (0.55 + 0.45 * Math.sin(t * 1.55 + phases[i]));
    }

    (posAttr.array as Float32Array).set(positions);
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
