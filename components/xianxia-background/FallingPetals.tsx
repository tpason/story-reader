"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DynamicDrawUsage,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";

const VS = `
  attribute float size;
  attribute vec3 color;
  attribute float rot;
  varying vec3 vColor;
  varying float vRot;
  void main() {
    vColor = color;
    vRot = rot;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (7.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FS = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  varying float vRot;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot);
    float s = sin(vRot);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    uv += 0.5;
    vec4 tex = texture2D(pointTexture, uv);
    if (tex.a < 0.05) discard;
    gl_FragColor = vec4(vColor, tex.a * 0.62);
  }
`;

function makePetalTex(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 48);
  ctx.fillStyle = "rgba(255, 200, 210, 0.95)";
  ctx.beginPath();
  ctx.ellipse(16, 24, 10, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 240, 245, 0.5)";
  ctx.beginPath();
  ctx.ellipse(14, 20, 4, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  return new CanvasTexture(canvas);
}

const PETAL_COLORS: [number, number, number][] = [
  [1.0, 0.82, 0.88],
  [1.0, 0.9, 0.94],
  [0.98, 0.78, 0.85],
  [1.0, 0.88, 0.72],
  [0.95, 0.72, 0.82],
];

type FallingPetalsProps = {
  count?: number;
};

export function FallingPetals({ count = 40 }: FallingPetalsProps) {
  const pointsRef = useRef<Points>(null);

  const { geo, mat, positions, speeds, drifts, rotations, rotSpeeds, discTex } = useMemo(() => {
    const discTex = makePetalTex();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count);
    const speeds = new Float32Array(count);
    const drifts = new Float32Array(count);
    const rotSpeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 12;
      positions[i3 + 1] = 2 + Math.random() * 8;
      positions[i3 + 2] = -0.4 - Math.random() * 2.2;

      const [r, g, b] = PETAL_COLORS[i % PETAL_COLORS.length];
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;

      sizes[i] = 10 + Math.random() * 14;
      rotations[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.35 + Math.random() * 0.55;
      drifts[i] = (Math.random() - 0.5) * 0.35;
      rotSpeeds[i] = (Math.random() - 0.5) * 1.2;
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    geo.setAttribute("rot", new BufferAttribute(rotations, 1));
    const sizeAttr = new BufferAttribute(sizes, 1);
    sizeAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("size", sizeAttr);

    const mat = new ShaderMaterial({
      uniforms: { pointTexture: { value: discTex } },
      vertexShader: VS,
      fragmentShader: FS,
      blending: NormalBlending,
      depthWrite: false,
      transparent: true,
    });

    return { geo, mat, positions, speeds, drifts, rotations, rotSpeeds, discTex };
  }, [count]);

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
    discTex.dispose();
  }, [geo, mat, discTex]);

  useFrame((_, delta) => {
    const posAttr = pointsRef.current?.geometry.attributes.position as BufferAttribute | undefined;
    const rotAttr = pointsRef.current?.geometry.attributes.rot as BufferAttribute | undefined;
    if (!posAttr || !rotAttr) return;

    const rot = rotAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] += drifts[i] * delta;
      positions[i3 + 1] -= speeds[i] * delta;
      rot[i] += rotSpeeds[i] * delta;

      if (positions[i3 + 1] < -5.5) {
        positions[i3 + 1] = 5.5 + Math.random() * 2;
        positions[i3] = (Math.random() - 0.5) * 12;
      }
    }

    (posAttr.array as Float32Array).set(positions);
    rotAttr.needsUpdate = true;
    posAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
