"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Moonlight dancing on water — small bright points flickering on the lake surface.
// Each particle pulses independently via ShaderMaterial size attribute.
// Night-only; placed at y≈-4.85 (just above the WaterPlane at y=-5.2 rotated).

const COUNT = 55;

const VS = `
  attribute float size;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (8.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const FS = `
  uniform sampler2D pointTexture;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.05) discard;
    // Silver-blue moonlight sparkle
    gl_FragColor = vec4(0.82, 0.90, 1.0, tex.a * 0.80);
  }
`;

function makeSharpDiscTex(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
  grad.addColorStop(0,   "rgba(255,255,255,1)");
  grad.addColorStop(0.55,"rgba(255,255,255,0.65)");
  grad.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function WaterSparkles() {
  const pointsRef = useRef<THREE.Points>(null);

  const { geo, mat, sizeAttr, baseSizes, phases, discTex } = useMemo(() => {
    const discTex  = makeSharpDiscTex(64);
    const positions = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);
    const baseSizes = new Float32Array(COUNT);
    const phases    = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Scatter across the water surface
      positions[i * 3]     = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = -4.85 + Math.random() * 0.10;
      positions[i * 3 + 2] = -3.5  + (Math.random() - 0.5) * 1.8;

      baseSizes[i] = 3 + Math.random() * 7;  // 3–10 px base
      sizes[i]     = baseSizes[i];
      phases[i]    = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const sizeAttr = new THREE.BufferAttribute(sizes, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("size", sizeAttr);

    const mat = new THREE.ShaderMaterial({
      uniforms:       { pointTexture: { value: discTex } },
      vertexShader:   VS,
      fragmentShader: FS,
      blending:       THREE.AdditiveBlending,
      depthWrite:     false,
      transparent:    true,
    });

    return { geo, mat, sizeAttr, baseSizes, phases, discTex };
  }, []);

  useEffect(() => () => {
    geo.dispose(); mat.dispose(); discTex.dispose();
  }, [geo, mat, discTex]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Each sparkle flickers at its own phase — simulates rippling moonlight
    for (let i = 0; i < COUNT; i++) {
      const flicker = Math.sin(t * 2.8 + phases[i]) * Math.sin(t * 1.3 + phases[i] * 1.7);
      sizeAttr.array[i] = baseSizes[i] * Math.max(0.1, 0.5 + 0.5 * flicker);
    }
    sizeAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}
