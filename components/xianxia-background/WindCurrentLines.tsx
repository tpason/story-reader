"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Color, Line, LineBasicMaterial, Vector3 } from "three";

type CurrentLine = {
  y: number;
  z: number;
  width: number;
  opacity: number;
  speed: number;
  phase: number;
  color: number;   // hex
  gustAmp: number; // extra opacity spike amplitude during gusts
};

// More lines, higher base opacity, gold tint on upper currents
const LINES: CurrentLine[] = [
  // High altitude — gold-tinted immortal wind
  { y:  2.10, z: -4.0, width: 5.8, opacity: 0.18, speed: 0.28, phase: 0.0, color: 0xfff4c0, gustAmp: 0.14 },
  { y:  1.30, z: -3.2, width: 4.6, opacity: 0.16, speed: 0.38, phase: 1.2, color: 0xfff0c0, gustAmp: 0.12 },
  // Mid altitude — cool silver
  { y:  0.50, z: -2.6, width: 5.2, opacity: 0.14, speed: 0.44, phase: 2.4, color: 0xe8f0ff, gustAmp: 0.10 },
  { y: -0.45, z: -2.0, width: 4.8, opacity: 0.13, speed: 0.30, phase: 3.6, color: 0xddeeff, gustAmp: 0.09 },
  // Low — ground wind, wider
  { y: -1.35, z: -1.4, width: 6.0, opacity: 0.12, speed: 0.36, phase: 4.8, color: 0xd8ecff, gustAmp: 0.08 },
  { y: -2.20, z: -1.0, width: 5.4, opacity: 0.11, speed: 0.24, phase: 6.0, color: 0xd0e8f8, gustAmp: 0.07 },
  // Near foreground — faint wisps close to camera
  { y:  0.80, z: -0.8, width: 3.2, opacity: 0.09, speed: 0.52, phase: 1.8, color: 0xfff8e0, gustAmp: 0.08 },
];

function createCurrentGeometry(width: number, phase: number) {
  const steps = 42;
  const pts: Vector3[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const x = (t - 0.5) * width;
    const y =
      Math.sin(t * Math.PI * 2.4 + phase) * 0.068 +
      Math.sin(t * Math.PI * 5.2 + phase * 1.3) * 0.022 +
      Math.sin(t * Math.PI * 8.8 + phase * 0.7) * 0.009;
    pts.push(new Vector3(x, y, 0));
  }
  return new BufferGeometry().setFromPoints(pts);
}

export function WindCurrentLines() {
  const refs = useRef<Array<Line | null>>([]);

  const objects = useMemo(() =>
    LINES.map((line) => {
      const geometry = createCurrentGeometry(line.width, line.phase);
      const material = new LineBasicMaterial({
        color:       new Color(line.color),
        transparent: true,
        opacity:     line.opacity,
        blending:    AdditiveBlending,
        depthWrite:  false,
      });
      return new Line(geometry, material);
    }),
  []);

  useEffect(() => () => {
    objects.forEach((obj) => { obj.geometry.dispose(); (obj.material as LineBasicMaterial).dispose(); });
  }, [objects]);

  useFrame((state) => {
    LINES.forEach((line, index) => {
      const mesh = refs.current[index];
      if (!mesh) return;
      const t = state.clock.elapsedTime * line.speed + line.phase;

      // Horizontal drift with gentle vertical float
      mesh.position.x = Math.sin(t * 0.38) * 2.2;
      mesh.position.y = line.y + Math.sin(t * 0.66) * 0.09;
      mesh.rotation.z = Math.sin(t * 0.28) * 0.030;

      // Gust pulse — sharp spike in opacity every ~8–14s
      const gustPhase = Math.sin(t * 0.44) * Math.sin(t * 0.17 + 1.3);
      const gust = Math.max(0, gustPhase) * line.gustAmp;

      const mat = mesh.material as LineBasicMaterial;
      mat.opacity = line.opacity * (0.52 + 0.30 * Math.sin(t * 0.9) + 0.18) + gust;
    });
  });

  return (
    <>
      {LINES.map((line, index) => (
        <primitive
          key={index}
          object={objects[index]}
          ref={(node: Line | null) => { refs.current[index] = node; }}
          position={[0, line.y, line.z]}
        />
      ))}
    </>
  );
}
