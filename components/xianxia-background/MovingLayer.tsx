"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Blending } from "three";
import { Group, NormalBlending } from "three";
import { ImageLayer } from "./ImageLayer";

type MovingLayerProps = {
  src: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
  speedX?: number;
  speedY?: number;
  drift?: number;
  blendMode?: Blending;
  alphaTest?: number;
};

export function MovingLayer({
  src,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  opacity = 1,
  speedX = 0.02,
  speedY = 0,
  drift = 0.05,
  blendMode = NormalBlending,
  alphaTest = 0,
}: MovingLayerProps) {
  const groupRef = useRef<Group>(null);
  const initialY = position[1];

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    group.position.x += speedX * delta;
    group.position.y =
      initialY + Math.sin(state.clock.elapsedTime * 0.35) * drift;
    group.position.y += speedY * delta;

    if (group.position.x > 8) group.position.x = -8;
    if (group.position.x < -8) group.position.x = 8;
    // Y wrap for layers that drift vertically (speedY != 0)
    if (speedY > 0 && group.position.y > 6) group.position.y = -6;
    if (speedY < 0 && group.position.y < -6) group.position.y = 6;
  });

  return (
    <group ref={groupRef} position={position}>
      <ImageLayer
        src={src}
        position={[0, 0, 0]}
        scale={scale}
        opacity={opacity}
        blendMode={blendMode}
        alphaTest={alphaTest}
      />
    </group>
  );
}
