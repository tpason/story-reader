"use client";

/**
 * Lightweight ambient rain / snow for the xianxia world backdrop.
 * Mount only while a weather burst is active — unmount when clear.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DynamicDrawUsage,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";

type FallingWeatherProps = {
  mode: "rain" | "snow";
  count: number;
};

const VS = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (6.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FS = `
  uniform sampler2D pointTexture;
  uniform float uAlpha;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.06) discard;
    gl_FragColor = vec4(vColor, tex.a * uAlpha);
  }
`;

function makeRainTex(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(4, 0, 4, 32);
  grad.addColorStop(0, "rgba(210, 230, 245, 0)");
  grad.addColorStop(0.25, "rgba(210, 230, 245, 0.55)");
  grad.addColorStop(1, "rgba(180, 210, 235, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(3, 0, 2, 32);
  return new CanvasTexture(canvas);
}

function makeSnowTex(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const c = 16;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, 14);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.45, "rgba(240,248,255,0.55)");
  grad.addColorStop(1, "rgba(240,248,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return new CanvasTexture(canvas);
}

export function FallingWeather({ mode, count }: FallingWeatherProps) {
  const pointsRef = useRef<Points>(null);
  const safeCount = Math.max(12, Math.min(count, 100));

  const { geo, mat, positions, speeds, drifts, discTex } = useMemo(() => {
    const discTex = mode === "rain" ? makeRainTex() : makeSnowTex();
    const positions = new Float32Array(safeCount * 3);
    const colors = new Float32Array(safeCount * 3);
    const sizes = new Float32Array(safeCount);
    const speeds = new Float32Array(safeCount);
    const drifts = new Float32Array(safeCount);

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 14;
      positions[i3 + 1] = 2 + Math.random() * 7;
      positions[i3 + 2] = -0.5 - Math.random() * 3.2;

      if (mode === "rain") {
        colors[i3] = 0.78;
        colors[i3 + 1] = 0.86;
        colors[i3 + 2] = 0.94;
        sizes[i] = 14 + Math.random() * 18;
        speeds[i] = 2.4 + Math.random() * 2.2;
        drifts[i] = (Math.random() - 0.5) * 0.18;
      } else {
        const tint = 0.92 + Math.random() * 0.08;
        colors[i3] = tint;
        colors[i3 + 1] = tint;
        colors[i3 + 2] = 1;
        sizes[i] = 8 + Math.random() * 12;
        speeds[i] = 0.28 + Math.random() * 0.42;
        drifts[i] = (Math.random() - 0.5) * 0.55;
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    const sizeAttr = new BufferAttribute(sizes, 1);
    sizeAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("size", sizeAttr);

    const mat = new ShaderMaterial({
      uniforms: {
        pointTexture: { value: discTex },
        uAlpha: { value: mode === "rain" ? 0.58 : 0.78 },
      },
      vertexShader: VS,
      fragmentShader: FS,
      blending: NormalBlending,
      depthWrite: false,
      transparent: true,
    });

    return { geo, mat, positions, speeds, drifts, discTex };
  }, [mode, safeCount]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      discTex.dispose();
    },
    [geo, mat, discTex],
  );

  useFrame((_, delta) => {
    const posAttr = pointsRef.current?.geometry.attributes.position as BufferAttribute | undefined;
    if (!posAttr) return;
    const dt = Math.min(delta, 0.05);
    const floor = mode === "rain" ? -4.2 : -3.8;

    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;
      positions[i3] += drifts[i] * dt;
      positions[i3 + 1] -= speeds[i] * dt;
      if (mode === "snow") {
        positions[i3] += Math.sin(positions[i3 + 1] * 0.9 + i) * 0.12 * dt;
      }

      if (positions[i3 + 1] < floor) {
        positions[i3 + 1] = 4.5 + Math.random() * 3;
        positions[i3] = (Math.random() - 0.5) * 14;
        positions[i3 + 2] = -0.5 - Math.random() * 3.2;
      }
    }

    (posAttr.array as Float32Array).set(positions);
    posAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} frustumCulled={false} />;
}
