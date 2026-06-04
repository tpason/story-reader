"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type CloudBankProps = {
  sources: string[];
};

type CloudLayer = {
  textureIndex: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  speed: number;
  drift: number;
  phase: number;
  rotation: number;
};

const CLOUD_LAYERS: CloudLayer[] = [
  { textureIndex: 0, x: -4.8, y: 1.2, z: -6.2, scale: 5.8, opacity: 0.30, speed: 0.018, drift: 0.08, phase: 0.4, rotation: -0.04 },
  { textureIndex: 1, x: 4.4, y: 1.55, z: -5.8, scale: 5.2, opacity: 0.26, speed: -0.014, drift: 0.07, phase: 2.1, rotation: 0.03 },
  { textureIndex: 2, x: -1.6, y: 0.95, z: -4.8, scale: 6.7, opacity: 0.22, speed: 0.010, drift: 0.06, phase: 4.0, rotation: 0.01 },
  { textureIndex: 3, x: 3.0, y: -0.15, z: -3.6, scale: 4.4, opacity: 0.19, speed: -0.020, drift: 0.10, phase: 1.2, rotation: -0.02 },
  { textureIndex: 0, x: -6.2, y: -0.45, z: -3.1, scale: 4.0, opacity: 0.20, speed: 0.024, drift: 0.12, phase: 3.0, rotation: 0.05 },
];

export function DriftingCloudBank({ sources }: CloudBankProps) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const textures = useTexture(sources);

  const preparedTextures = useMemo(() => {
    return textures.map((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    });
  }, [textures]);

  useFrame((state, delta) => {
    CLOUD_LAYERS.forEach((layer, index) => {
      const mesh = refs.current[index];
      if (!mesh) return;
      mesh.position.x += layer.speed * delta;
      mesh.position.y = layer.y + Math.sin(state.clock.elapsedTime * 0.18 + layer.phase) * layer.drift;
      mesh.rotation.z = layer.rotation + Math.sin(state.clock.elapsedTime * 0.08 + layer.phase) * 0.015;

      if (mesh.position.x > 7.2) mesh.position.x = -7.2;
      if (mesh.position.x < -7.2) mesh.position.x = 7.2;
    });
  });

  return (
    <>
      {CLOUD_LAYERS.map((layer, index) => {
        const texture = preparedTextures[layer.textureIndex % preparedTextures.length];
        const image = texture.image as { width?: number; height?: number } | undefined;
        const aspect = image?.width && image?.height ? image.width / image.height : 1;

        return (
          <mesh
            key={`${layer.textureIndex}-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            position={[layer.x, layer.y, layer.z]}
            rotation={[0, 0, layer.rotation]}
            scale={[layer.scale, layer.scale, 1]}
          >
            <planeGeometry args={[aspect, 1]} />
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={layer.opacity}
              depthWrite={false}
              blending={THREE.NormalBlending}
              alphaTest={0.02}
              side={THREE.FrontSide}
            />
          </mesh>
        );
      })}
    </>
  );
}
