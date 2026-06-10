"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { ImageLayer } from "./ImageLayer";

type WindLayerProps = {
  src: string;
  position: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
  alphaTest?: number;
  // Wind parameters
  swayAmp?: number;    // radians — rotation amplitude around Z
  swaySpeed?: number;  // Hz
  driftAmpX?: number;  // world units — horizontal sway
  driftAmpY?: number;  // world units — vertical sway
  phase?: number;      // phase offset so multiple trees don't sync
};

// Billboard layer with sinusoidal rotation + translation — simulates wind.
// The rotation pivot is at the group origin, so positioning the group at the
// base of the object makes it sway naturally from the root.
export function WindLayer({
  src,
  position,
  scale = [1, 1, 1],
  opacity = 1,
  alphaTest = 0,
  swayAmp = 0.025,
  swaySpeed = 0.38,
  driftAmpX = 0.04,
  driftAmpY = 0.012,
  phase = 0,
}: WindLayerProps) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime + phase;

    // Primary sway + subtle harmonic (wind gusts)
    group.rotation.z =
      Math.sin(t * swaySpeed) * swayAmp +
      Math.sin(t * swaySpeed * 1.9 + 0.7) * swayAmp * 0.35;

    // Gentle horizontal and vertical drift
    group.position.x = position[0] + Math.sin(t * swaySpeed * 0.6 + phase) * driftAmpX;
    group.position.y = position[1] + Math.sin(t * swaySpeed * 0.8 + phase + 1.1) * driftAmpY;
    group.position.z = position[2];
  });

  return (
    <group ref={groupRef} position={position}>
      <ImageLayer
        src={src}
        scale={scale}
        opacity={opacity}
        alphaTest={alphaTest}
      />
    </group>
  );
}
