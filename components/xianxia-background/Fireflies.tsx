"use client";

/**
 * Night fireflies — soft warm Points hovering near water / bamboo.
 * Keep counts low; AdditiveBlending at gentle opacity for night bloom.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
} from "three";

type FirefliesProps = {
  count?: number;
};

const VS = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (9.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FS = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.05) discard;
    gl_FragColor = vec4(vColor, tex.a * 0.78);
  }
`;

const COLORS: [number, number, number][] = [
  [1.0, 0.92, 0.42],
  [0.86, 1.0, 0.48],
  [1.0, 0.84, 0.28],
  [0.72, 0.95, 0.42],
];

function makeGlowTex(size = 64): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, "rgba(255,255,220,1)");
  grad.addColorStop(0.28, "rgba(255,240,140,0.7)");
  grad.addColorStop(0.62, "rgba(200,255,120,0.22)");
  grad.addColorStop(1, "rgba(200,255,120,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export function Fireflies({ count = 28 }: FirefliesProps) {
  const pointsRef = useRef<Points>(null);
  const safeCount = Math.max(10, Math.min(count, 36));

  const { geo, mat, positions, home, phases, baseSizes, sizeAttr, discTex } = useMemo(() => {
    const discTex = makeGlowTex(64);
    const positions = new Float32Array(safeCount * 3);
    const colors = new Float32Array(safeCount * 3);
    const sizes = new Float32Array(safeCount);
    const baseSizes = new Float32Array(safeCount);
    const phases = new Float32Array(safeCount);
    const home = new Float32Array(safeCount * 3);

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      // Prefer corridors + near water (lower y), keep out of opaque page column a bit
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (2.9 + Math.random() * 3.4);
      const y = -0.15 + Math.random() * 1.35;
      const z = -0.7 - Math.random() * 2.4;
      home[i3] = x;
      home[i3 + 1] = y;
      home[i3 + 2] = z;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      const [r, g, b] = COLORS[i % COLORS.length];
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;

      baseSizes[i] = 9 + Math.random() * 14;
      sizes[i] = baseSizes[i];
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    const sizeAttr = new BufferAttribute(sizes, 1);
    sizeAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("size", sizeAttr);

    const mat = new ShaderMaterial({
      uniforms: { pointTexture: { value: discTex } },
      vertexShader: VS,
      fragmentShader: FS,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    return { geo, mat, positions, home, phases, baseSizes, sizeAttr, discTex };
  }, [safeCount]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      discTex.dispose();
    },
    [geo, mat, discTex],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const posAttr = pointsRef.current?.geometry.attributes.position as BufferAttribute | undefined;
    if (!posAttr) return;

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      const p = phases[i];
      positions[i3] = home[i3] + Math.sin(t * 0.55 + p) * 0.42 + Math.sin(t * 0.21 + p * 1.3) * 0.18;
      positions[i3 + 1] = home[i3 + 1] + Math.sin(t * 0.72 + p * 1.1) * 0.28 + Math.cos(t * 0.33 + p) * 0.12;
      positions[i3 + 2] = home[i3 + 2] + Math.cos(t * 0.48 + p) * 0.22;

      // Soft blink — fireflies pulse, they don't stay solid
      const blink = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1.4 + (i % 5) * 0.17) + p));
      sizeAttr.array[i] = baseSizes[i] * blink;
    }

    (posAttr.array as Float32Array).set(positions);
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} frustumCulled={false} />;
}
