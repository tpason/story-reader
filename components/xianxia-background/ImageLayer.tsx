"use client";

import { useTexture } from "@react-three/drei";
import type { Blending } from "three";
import { FrontSide, LinearFilter, NormalBlending, SRGBColorSpace } from "three";

type ImageLayerProps = {
  src: string;
  position?: [number, number, number];
  scale?: [number, number, number];
  opacity?: number;
  transparent?: boolean;
  depthWrite?: boolean;
  blendMode?: Blending;
  alphaTest?: number;
};

export function ImageLayer({
  src,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  opacity = 1,
  transparent = true,
  depthWrite = false,
  blendMode = NormalBlending,
  alphaTest = 0,
}: ImageLayerProps) {
  const texture = useTexture(src, (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
  });

  // texture.image is typed as {} in three@0.184 — cast to access pixel dimensions.
  // useTexture suspends until loaded, so image is always populated at render time.
  const img = texture.image as { width: number; height: number };
  const aspect = img.width > 0 && img.height > 0 ? img.width / img.height : 1;

  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[aspect, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={transparent || blendMode !== NormalBlending}
        opacity={opacity}
        depthWrite={depthWrite}
        blending={blendMode}
        alphaTest={alphaTest}
        side={FrontSide}
      />
    </mesh>
  );
}
