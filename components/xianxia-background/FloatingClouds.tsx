"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Mesh } from "three";
import type { TimeOfDay } from "./sceneConfig";
import { makeFluffyCloudTexture } from "@/lib/three-cloud-utils";

// Time-of-day tint for cloud procedural texture
const CLOUD_TINTS: Record<TimeOfDay, [number, number, number]> = {
  dawn:  [255, 228, 185],   // warm pink-gold
  day:   [255, 252, 242],   // neutral cream
  dusk:  [255, 200, 155],   // warm amber-orange
  night: [175, 198, 242],   // cool blue-silver
};

type CloudDef = {
  texIdx: number;
  initX: number;
  y: number;
  z: number;
  w: number;
  h: number;
  opacity: number;
  speed: number;
  bobAmp: number;
  bobPhase: number;
};

const CLOUDS: CloudDef[] = [
  { texIdx: 0, initX: -5.5, y: 2.2, z: -7.8, w: 4.4, h: 1.5, opacity: 0.36, speed:  0.22, bobAmp: 0.08, bobPhase: 0.0 },
  { texIdx: 1, initX:  3.8, y: 3.0, z: -7.5, w: 5.0, h: 1.7, opacity: 0.32, speed: -0.18, bobAmp: 0.10, bobPhase: 1.4 },
  { texIdx: 2, initX: -1.2, y: 3.4, z: -7.1, w: 5.6, h: 1.8, opacity: 0.30, speed:  0.27, bobAmp: 0.07, bobPhase: 2.7 },
  { texIdx: 0, initX:  5.8, y: 1.7, z: -6.7, w: 3.8, h: 1.3, opacity: 0.28, speed: -0.15, bobAmp: 0.09, bobPhase: 0.8 },
  { texIdx: 1, initX: -6.2, y: 0.8, z: -6.2, w: 5.2, h: 1.6, opacity: 0.26, speed:  0.20, bobAmp: 0.06, bobPhase: 3.4 },
  { texIdx: 2, initX:  0.8, y: 2.6, z: -5.7, w: 3.6, h: 1.2, opacity: 0.24, speed: -0.23, bobAmp: 0.08, bobPhase: 1.9 },
  { texIdx: 0, initX: -3.2, y: 1.8, z: -5.1, w: 4.8, h: 1.5, opacity: 0.22, speed:  0.17, bobAmp: 0.06, bobPhase: 4.1 },
  { texIdx: 1, initX:  6.8, y: 0.4, z: -4.6, w: 3.2, h: 1.1, opacity: 0.19, speed: -0.13, bobAmp: 0.05, bobPhase: 2.2 },
  { texIdx: 2, initX: -4.5, y: 1.2, z: -4.2, w: 4.0, h: 1.3, opacity: 0.17, speed:  0.19, bobAmp: 0.07, bobPhase: 5.0 },
];

const WRAP = 9.5;

type FloatingCloudsProps = {
  timeOfDay?: TimeOfDay;
};

export function FloatingClouds({ timeOfDay = "day" }: FloatingCloudsProps) {
  const meshRefs = useRef<(Mesh | null)[]>([]);

  const textures = useMemo(() => {
    const tint = CLOUD_TINTS[timeOfDay];
    // makeFluffyCloudTexture: 14–18 core blobs + highlights + shadows + wispy tendrils
    return [
      makeFluffyCloudTexture(3, tint, 512),
      makeFluffyCloudTexture(11, tint, 512),
      makeFluffyCloudTexture(19, tint, 512),
    ];
  }, [timeOfDay]);

  useEffect(() => () => { textures.forEach((t) => t.dispose()); }, [textures]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    CLOUDS.forEach((def, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.position.x += def.speed * delta;
      if (mesh.position.x >  WRAP) mesh.position.x -= WRAP * 2;
      if (mesh.position.x < -WRAP) mesh.position.x += WRAP * 2;
      mesh.position.y = def.y + Math.sin(t * 0.13 + def.bobPhase) * def.bobAmp;
    });
  });

  return (
    <>
      {CLOUDS.map((def, i) => (
        <mesh
          key={i}
          ref={(n) => { meshRefs.current[i] = n; }}
          position={[def.initX, def.y, def.z]}
        >
          <planeGeometry args={[def.w, def.h]} />
          <meshBasicMaterial
            map={textures[def.texIdx]}
            transparent
            opacity={def.opacity}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}
