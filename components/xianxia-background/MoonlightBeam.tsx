"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Tall canvas gradient — bright at top (moon), fades downward + edges
function makeMoonlightTex(w = 256, h = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // 1. Vertical gradient: strong silver-blue at top → transparent at bottom
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0,    "rgba(192, 208, 240, 0.24)");
  vGrad.addColorStop(0.30, "rgba(178, 195, 235, 0.10)");
  vGrad.addColorStop(0.65, "rgba(162, 182, 228, 0.03)");
  vGrad.addColorStop(1,    "rgba(148, 170, 222, 0)");
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Horizontal fade mask — keeps beam narrow, fades at edges
  ctx.globalCompositeOperation = "destination-in";
  const hGrad = ctx.createLinearGradient(0, 0, w, 0);
  hGrad.addColorStop(0,    "rgba(0,0,0,0)");
  hGrad.addColorStop(0.20, "rgba(0,0,0,0.55)");
  hGrad.addColorStop(0.50, "rgba(0,0,0,1)");
  hGrad.addColorStop(0.80, "rgba(0,0,0,0.55)");
  hGrad.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, w, h);

  return new THREE.CanvasTexture(canvas);
}

// Moonlight shimmer reflection on ground/water level
function makeMoonReflectTex(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,   "rgba(185, 200, 235, 0.28)");
  grad.addColorStop(0.4, "rgba(172, 190, 230, 0.12)");
  grad.addColorStop(0.75,"rgba(158, 178, 225, 0.03)");
  grad.addColorStop(1,   "rgba(145, 165, 220, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Moon is at preset.celestialPos ≈ [1.6, 2.4, -8.5]
// Beam planes at shallower z so they appear in-scene, roughly tracing the moon's direction
export function MoonlightBeam() {
  const mat1Ref  = useRef<THREE.MeshBasicMaterial>(null);
  const mat2Ref  = useRef<THREE.MeshBasicMaterial>(null);
  const mat3Ref  = useRef<THREE.MeshBasicMaterial>(null);
  const reflRef  = useRef<THREE.MeshBasicMaterial>(null);

  const { beamTex, reflTex } = useMemo(() => ({
    beamTex: makeMoonlightTex(),
    reflTex: makeMoonReflectTex(),
  }), []);

  useEffect(() => () => {
    beamTex.dispose();
    reflTex.dispose();
  }, [beamTex, reflTex]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Slow shimmer — clouds passing over the moon
    const base = 0.78 + 0.22 * Math.sin(t * 0.32);
    if (mat1Ref.current) mat1Ref.current.opacity = 0.16 * base;
    if (mat2Ref.current) mat2Ref.current.opacity = 0.10 * (0.80 + 0.20 * Math.sin(t * 0.47 + 1.2));
    if (mat3Ref.current) mat3Ref.current.opacity = 0.07 * base;
    if (reflRef.current)  reflRef.current.opacity  = 0.12 * (0.72 + 0.28 * Math.sin(t * 0.28 + 2.8));
  });

  return (
    <>
      {/* Primary wide beam — fans down from moon direction */}
      <mesh position={[1.55, -0.6, -1.8]}>
        <planeGeometry args={[4.8, 7.5]} />
        <meshBasicMaterial
          ref={mat1Ref}
          map={beamTex}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Narrow inner beam — more concentrated silver column */}
      <mesh position={[1.6, -0.2, -1.5]}>
        <planeGeometry args={[2.0, 6.5]} />
        <meshBasicMaterial
          ref={mat2Ref}
          map={beamTex}
          transparent
          opacity={0.10}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Slight tilt variant — gives depth to the beam */}
      <mesh position={[1.4, -0.8, -2.2]} rotation={[0, 0, 0.08]}>
        <planeGeometry args={[3.5, 6.0]} />
        <meshBasicMaterial
          ref={mat3Ref}
          map={beamTex}
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Ground/water reflection pool — soft ellipse where moonlight lands */}
      <mesh position={[1.6, -3.8, -2.0]} rotation={[-Math.PI / 2.2, 0, 0]}>
        <planeGeometry args={[3.5, 2.0]} />
        <meshBasicMaterial
          ref={reflRef}
          map={reflTex}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
