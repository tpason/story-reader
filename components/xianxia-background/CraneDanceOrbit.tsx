"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Color, DoubleSide, Group, Mesh, MeshStandardMaterial } from "three";
import { CRANE_MODEL_URL, CRANE_ORBIT_SCALE } from "./craneModel";

const MODEL_URL = CRANE_MODEL_URL;
const BIRD_SCALE = CRANE_ORBIT_SCALE;
const ORBIT_RADIUS = 0.72;
const ORBIT_SPEED = 0.28;
const BOB_AMP = 0.09;

type CraneDanceOrbitProps = {
  center: [number, number, number];
};

/** Two cranes in a slow orbit — desktop full quality, near sun/moon. */
export function CraneDanceOrbit({ center }: CraneDanceOrbitProps) {
  const { scene } = useThree();
  const gltf = useGLTF(MODEL_URL);
  const birdsRef = useRef<Group[]>([]);
  const mixersRef = useRef<AnimationMixer[]>([]);
  const angleRef = useRef(0);

  useEffect(() => {
    if (!gltf.animations.length) return;

    const birds: Group[] = [];
    const mixers: AnimationMixer[] = [];
    const mats: MeshStandardMaterial[] = [];

    for (let i = 0; i < 2; i += 1) {
      const mat = new MeshStandardMaterial({
        color: new Color(i === 0 ? 0xf7f1e6 : 0xe4d8c6),
        emissive: new Color(i === 0 ? 0xe8c96a : 0xc9a86a),
        emissiveIntensity: i === 0 ? 0.12 : 0.06,
        roughness: 0.90,
        metalness: 0.01,
        side: DoubleSide,
        transparent: true,
        opacity: i === 0 ? 0.88 : 0.70,
      });
      mats.push(mat);

      const bird = gltf.scene.clone(true) as Group;
      bird.scale.setScalar(BIRD_SCALE);
      bird.traverse((node) => {
        if (node instanceof Mesh) node.material = mat;
      });

      const mixer = new AnimationMixer(bird);
      mixer.clipAction(gltf.animations[0]).setDuration(0.85 + i * 0.12).play();

      scene.add(bird);
      birds.push(bird);
      mixers.push(mixer);
    }

    birdsRef.current = birds;
    mixersRef.current = mixers;

    return () => {
      mats.forEach((m) => m.dispose());
      birds.forEach((bird, i) => {
        mixers[i]?.stopAllAction();
        scene.remove(bird);
        bird.traverse((node) => {
          if (node instanceof Mesh) node.geometry.dispose();
        });
      });
      birdsRef.current = [];
      mixersRef.current = [];
    };
  }, [scene, gltf]);

  useFrame((state, delta) => {
    angleRef.current += ORBIT_SPEED * delta;
    const t = state.clock.elapsedTime;
    const [cx, cy, cz] = center;

    birdsRef.current.forEach((bird, i) => {
      mixersRef.current[i]?.update(delta);
      const phase = angleRef.current + i * Math.PI;
      const r = ORBIT_RADIUS * (i === 0 ? 1 : 0.82);
      bird.position.x = cx + Math.cos(phase) * r;
      bird.position.y = cy + Math.sin(t * 0.55 + i) * BOB_AMP;
      bird.position.z = cz + Math.sin(phase) * r * 0.35;
      bird.rotation.y = phase + Math.PI / 2;
    });
  });

  return null;
}

useGLTF.preload(MODEL_URL);
