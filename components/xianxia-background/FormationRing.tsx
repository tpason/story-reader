"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Group } from "three";

// Subtle cultivation formation array — a barely-visible torus in the far background.
// Xianxia 陣法 motif: two concentric rings (gold outer, jade inner) rotating at different rates.
// Placed at z=-6.5 so it sits behind the mountains, barely perceptible through the mist.

export function FormationRing() {
  const outerRef = useRef<Group>(null);
  const innerRef = useRef<Group>(null);

  useFrame((_, delta) => {
    // Outer gold ring — slow clockwise rotation
    if (outerRef.current) {
      outerRef.current.rotation.z += delta * 0.014;
      outerRef.current.rotation.x += delta * 0.006;
    }
    // Inner jade ring — slightly faster counter-clockwise
    if (innerRef.current) {
      innerRef.current.rotation.z -= delta * 0.022;
      innerRef.current.rotation.y += delta * 0.008;
    }
  });

  // Node positions on outer ring (8 nodes)
  const outerNodes = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return [Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0] as [number, number, number];
  });

  // Node positions on inner ring (6 nodes)
  const innerNodes = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return [Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0] as [number, number, number];
  });

  return (
    <group position={[0.4, 0.2, -6.5]} rotation={[0.55, 0.08, 0]}>
      {/* Outer gold ring */}
      <group ref={outerRef}>
        <mesh>
          <torusGeometry args={[3.4, 0.007, 6, 128]} />
          <meshBasicMaterial
            color={0xf0d06a}
            transparent
            opacity={0.13}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {outerNodes.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.042, 6, 6]} />
            <meshBasicMaterial
              color={0xfff8e0}
              transparent
              opacity={0.22}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Inner jade ring — counter-rotates */}
      <group ref={innerRef} rotation={[0, 0, Math.PI / 6]}>
        <mesh>
          <torusGeometry args={[2.1, 0.005, 6, 96]} />
          <meshBasicMaterial
            color={0x26a882}
            transparent
            opacity={0.10}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {innerNodes.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.032, 6, 6]} />
            <meshBasicMaterial
              color={0x80ffda}
              transparent
              opacity={0.18}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
