"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationClip, AnimationMixer, DoubleSide, Group, Material, Mesh, MeshStandardMaterial, Scene } from "three";

// ── Stork (cò) ─────────────────────────────────────────────────────────────
// 2 storks flying independently, original GLTF colors, deeper than cranes
const STORK_CFG = [
  { startX:  3.8, y: 0.72, z: -1.22, speed: -0.36, dur: 0.92, phase: 0.4 },
  { startX: -3.5, y: 0.95, z: -1.28, speed:  0.28, dur: 1.04, phase: 2.1 },
];
// Keep z from 7940cc1 (in front of mountains); scale ÷ ~1.7 vs pre-visibility-fix size.
const STORK_SCALE = 0.007;

// ── Parrot (vẹt) ────────────────────────────────────────────────────────────
// 3 parrots, faster wing-beat, closer to camera, original colors
const PARROT_CFG = [
  { startX:  2.5, y: 1.25, z: -0.92, speed: -0.80, dur: 0.46, phase: 0.0 },
  { startX: -1.8, y: 1.05, z: -0.98, speed:  0.68, dur: 0.52, phase: 2.3 },
  { startX:  5.2, y: 1.48, z: -0.88, speed: -0.73, dur: 0.49, phase: 1.2 },
];
const PARROT_SCALE = 0.0047;

// ── Horse (thiên mã) ────────────────────────────────────────────────────────
// 3 horses galloping along far mountain ridges
const HORSE_CFG = [
  { startX: -4.5, y: -1.55, z: -3.85, speed:  0.55, dur: 0.9,  phase: 0.0 },
  { startX:  1.5, y: -1.70, z: -4.05, speed:  0.48, dur: 1.02, phase: 0.7 },
  { startX: -0.5, y: -1.40, z: -3.75, speed:  0.62, dur: 0.88, phase: 1.5 },
];
const HORSE_SCALE = 0.0036;

const BOUNDARY_X = 7.5;

type AnimalConfig = {
  startX: number; y: number; z: number;
  speed: number; dur: number; phase: number;
};

type AnimalInstance = {
  group:  Group;
  mixer:  AnimationMixer;
  xRef:   { current: number };
  dirRef: { current: 1 | -1 };
  cfg:    AnimalConfig;
};

function setupAnimals(
  gltf: { scene: Group; animations: AnimationClip[] },
  cfgs: AnimalConfig[],
  scale: number,
  scene: Scene,
  keepOriginalColors = true,
): AnimalInstance[] {
  return cfgs.map(cfg => {
    const group = gltf.scene.clone(true) as Group;
    group.scale.setScalar(scale);

    if (keepOriginalColors) {
      // Keep GLTF colors — only add DoubleSide so the mesh renders both faces
      // when the bird flips direction.
      group.traverse(node => {
        if (node instanceof Mesh) {
          const orig = node.material as Material;
          const mat  = orig.clone() as MeshStandardMaterial;
          mat.side = DoubleSide;
          node.material = mat;
        }
      });
    }

    group.position.set(cfg.startX, cfg.y, cfg.z);
    group.rotation.y = cfg.speed < 0 ? -Math.PI / 2 : Math.PI / 2;
    group.renderOrder = 12;

    const mixer = new AnimationMixer(group);
    mixer.clipAction(gltf.animations[0]).setDuration(cfg.dur).play();

    scene.add(group);

    return {
      group, mixer,
      xRef:   { current: cfg.startX },
      dirRef: { current: cfg.speed < 0 ? -1 : 1 },
      cfg,
    };
  });
}

function cleanupAnimals(animals: AnimalInstance[], scene: Scene) {
  animals.forEach(({ group, mixer }) => {
    mixer.stopAllAction();
    scene.remove(group);
    group.traverse(node => {
      if (node instanceof Mesh) {
        node.geometry.dispose();
        (node.material as Material).dispose();
      }
    });
  });
}

export function WildAnimals() {
  const { scene }  = useThree();
  const storkGltf  = useGLTF("/assets/xianxia/models/stork.glb");
  const parrotGltf = useGLTF("/assets/xianxia/models/parrot.glb");
  const horseGltf  = useGLTF("/assets/xianxia/models/horse.glb");

  const storksRef  = useRef<AnimalInstance[]>([]);
  const parrotsRef = useRef<AnimalInstance[]>([]);
  const horsesRef  = useRef<AnimalInstance[]>([]);

  useEffect(() => {
    const spawned: AnimalInstance[][] = [[], [], []];

    if (storkGltf.animations.length) {
      spawned[0] = setupAnimals(storkGltf as typeof storkGltf & { scene: Group }, STORK_CFG, STORK_SCALE, scene);
    }
    if (parrotGltf.animations.length) {
      spawned[1] = setupAnimals(parrotGltf as typeof parrotGltf & { scene: Group }, PARROT_CFG, PARROT_SCALE, scene);
    }
    if (horseGltf.animations.length) {
      spawned[2] = setupAnimals(horseGltf as typeof horseGltf & { scene: Group }, HORSE_CFG, HORSE_SCALE, scene);
    }

    storksRef.current = spawned[0];
    parrotsRef.current = spawned[1];
    horsesRef.current = spawned[2];

    return () => {
      cleanupAnimals(storksRef.current, scene);
      cleanupAnimals(parrotsRef.current, scene);
      cleanupAnimals(horsesRef.current, scene);
      storksRef.current = [];
      parrotsRef.current = [];
      horsesRef.current = [];
    };
  }, [scene, storkGltf, parrotGltf, horseGltf]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const updateGroup = (animals: AnimalInstance[], swayAmp: number, swayFreq: number) => {
      animals.forEach((a, i) => {
        a.mixer.update(delta);
        a.xRef.current += a.dirRef.current * Math.abs(a.cfg.speed) * delta;

        if (a.xRef.current >  BOUNDARY_X) a.dirRef.current = -1;
        if (a.xRef.current < -BOUNDARY_X) a.dirRef.current =  1;

        a.group.position.x = a.xRef.current;
        a.group.position.y = a.cfg.y + Math.sin(t * swayFreq + a.cfg.phase + i * 0.8) * swayAmp;
        a.group.rotation.y = a.dirRef.current < 0 ? -Math.PI / 2 : Math.PI / 2;
      });
    };

    updateGroup(storksRef.current,  0.08, 0.35);
    updateGroup(parrotsRef.current, 0.06, 0.60);
    updateGroup(horsesRef.current,  0.02, 0.20);
  });

  return null;
}

useGLTF.preload("/assets/xianxia/models/stork.glb");
useGLTF.preload("/assets/xianxia/models/parrot.glb");
useGLTF.preload("/assets/xianxia/models/horse.glb");
