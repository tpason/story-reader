"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, MeshBasicMaterial } from "three";
import type { TimeOfDay } from "./sceneConfig";

const WATER_TINTS: Record<TimeOfDay, string> = {
  dawn: "#4a2218",
  day: "#1a3a2e",
  dusk: "#2e1a2a",
  night: "#050518",
};

const WATER_OPACITY: Record<TimeOfDay, number> = {
  dawn: 0.60,
  day: 0.52,
  dusk: 0.62,
  night: 0.70,
};

type WaterPlaneProps = {
  timeOfDay: TimeOfDay;
  compact?: boolean;
};

export function WaterPlane({ timeOfDay, compact = false }: WaterPlaneProps) {
  const shimmer1 = useRef<MeshBasicMaterial>(null);
  const shimmer2 = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (shimmer1.current) {
      shimmer1.current.opacity = 0.055 + Math.sin(t * 1.3) * 0.025;
    }
    if (shimmer2.current) {
      shimmer2.current.opacity = 0.032 + Math.sin(t * 0.85 + 1.7) * 0.018;
    }
  });

  if (compact) return null;

  return (
    <group position={[0, -5.2, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Base water — dark tinted plane */}
      <mesh>
        <planeGeometry args={[22, 5]} />
        <meshBasicMaterial
          color={WATER_TINTS[timeOfDay]}
          transparent
          opacity={WATER_OPACITY[timeOfDay]}
          depthWrite={false}
        />
      </mesh>

      {/* Shimmer band 1 — gold light on water */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[18, 3]} />
        <meshBasicMaterial
          ref={shimmer1}
          color="#c8962e"
          transparent
          opacity={0.055}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Shimmer band 2 — lighter gold ripple */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[12, 1.5]} />
        <meshBasicMaterial
          ref={shimmer2}
          color="#f0d06a"
          transparent
          opacity={0.032}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
