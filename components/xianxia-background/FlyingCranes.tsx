"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Color, DoubleSide, Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import {
  CRANE_CROWN_HEAD_FACTOR,
  CRANE_FLOCK_SCALE,
  CRANE_LONER_SCALE,
  CRANE_MODEL_URL,
  CRANE_TURN_LERP,
} from "./craneModel";

const MODEL_URL = CRANE_MODEL_URL;

// V-formation trailing offsets — tightened so flock footprint matches smaller birds
const OFFSETS: [number, number, number][] = [
  [0.00,  0.00, 0.00],
  [0.48,  0.24, 0.12],
  [0.48, -0.24, 0.12],
  [0.95,  0.48, 0.22],
  [0.95, -0.48, 0.22],
  [1.35,  0.16, 0.30],
  [1.45,  0.62, 0.36],
  [1.45, -0.62, 0.36],
];

// Bạch Hạc Tiên Phong — warm paper ivory → mountain-mist taupe (matches parchment UI).
// Avoid cool steel/mint: those read as plastic blue against ink-wash gold/cream.
// [body, emissive, emissiveIntensity, opacity]
const BIRD_CONFIGS: [number, number, number, number][] = [
  [0xF7F1E6, 0xE8C96A, 0.14, 0.92],  // leader     — giấy bồi + linh khí kim
  [0xF0E8DA, 0xD4B878, 0.09, 0.86],  // right-1    — ngà ấm
  [0xF0E8DA, 0xD4B878, 0.08, 0.86],  // left-1
  [0xE4D8C6, 0xC9A86A, 0.06, 0.78],  // right-2    — trà nhạt
  [0xE4D8C6, 0xC9A86A, 0.05, 0.78],  // left-2
  [0xD2C4B0, 0xA89070, 0.04, 0.64],  // center-bk  — sương núi ấm
  [0xBBA892, 0x8A7860, 0.03, 0.50],  // right-bk
  [0xA0907C, 0x6E5E4A, 0.02, 0.38],  // left-bk    — nhòa vào mây núi
];

const BIRD_SCALE   = CRANE_FLOCK_SCALE;
const FLOCK_BASE_Y = 1.05;
/** In front of mountain billboards (near z ≈ -2.3) so flock is visible in the sky. */
const FLOCK_BASE_Z = -1.15;
const FLOCK_SPEED  = 0.50;
const BOUNDARY_X   = 7.5;

// Đầu hạc: đỏ chu sa (cinnabar) — world radius scaled for smaller flock
const CROWN_RADIUS = 0.012; // world units
const CROWN_COLOR  = 0xC73A2E;
const CROWN_EMISSIVE = 0x7A2018;

// Con lạc đàn — ngà ấm mờ, bay ngược chiều ở tầng cao
const LONER_SCALE  = CRANE_LONER_SCALE;
const LONER_Y      = 1.78;
const LONER_Z      = -1.35;
const LONER_SPEED  = 0.26;

export function FlyingCranes() {
  const { scene } = useThree();
  const gltf = useGLTF(MODEL_URL);

  const mixersRef   = useRef<AnimationMixer[]>([]);
  const groupsRef   = useRef<Group[]>([]);
  const matsRef     = useRef<MeshStandardMaterial[]>([]);
  const flockXRef   = useRef(1.5);
  const flockDirRef = useRef<1 | -1>(-1);
  const phasesRef   = useRef(OFFSETS.map(() => Math.random() * Math.PI * 2));

  const lonerRef       = useRef<Group | null>(null);
  const lonerMixerRef  = useRef<AnimationMixer | null>(null);
  const lonerMatRef    = useRef<MeshStandardMaterial | null>(null);
  const lonerXRef      = useRef(-5.0);
  const lonerDirRef    = useRef<1 | -1>(1); // flies RIGHT, opposite to flock

  useEffect(() => {
    if (!gltf.animations.length) return;

    // ── Compute head Y (max) from geometry bounding box
    let geoHeadY = 45;
    {
      const probe = gltf.scene.clone(true);
      let maxY = -Infinity;
      probe.traverse(node => {
        if (node instanceof Mesh) {
          node.geometry.computeBoundingBox();
          const bb = node.geometry.boundingBox;
          if (!bb) return;
          if (bb.max.y > maxY) maxY = bb.max.y;
        }
      });
      if (maxY > 45)       geoHeadY = maxY;
    }

    const crownGeo = new SphereGeometry(CROWN_RADIUS, 7, 5);
    const crownMat = new MeshStandardMaterial({
      color: CROWN_COLOR, emissive: new Color(CROWN_EMISSIVE),
      emissiveIntensity: 0.28, roughness: 0.6,
    });

    const groups: Group[]                  = [];
    const mixers: AnimationMixer[]         = [];
    const mats:   MeshStandardMaterial[]   = [];

    OFFSETS.forEach(([ox, oy, oz], i) => {
      const [bodyHex, emitHex, emitInt, opacity] = BIRD_CONFIGS[i];

      const mat = new MeshStandardMaterial({
        color: new Color(bodyHex),
        emissive: new Color(emitHex),
        emissiveIntensity: emitInt,
        roughness: 0.90, metalness: 0.01,
        side: DoubleSide,
        transparent: true, opacity,
      });
      mats.push(mat);

      const bird = gltf.scene.clone(true) as Group;
      bird.scale.setScalar(BIRD_SCALE);
      bird.traverse(node => { if (node instanceof Mesh) node.material = mat; });

      // Red crown — counteract parent scale so world radius = CROWN_RADIUS
      const crown = new Mesh(crownGeo, crownMat);
      crown.scale.setScalar(1 / BIRD_SCALE);
      crown.position.set(0, geoHeadY * CRANE_CROWN_HEAD_FACTOR, 0);
      bird.add(crown);

      bird.position.set(flockXRef.current + ox, FLOCK_BASE_Y + oy, FLOCK_BASE_Z - oz);
      bird.rotation.y = -Math.PI / 2; // face left (-X)
      bird.renderOrder = 12;

      const mixer = new AnimationMixer(bird);
      mixer.clipAction(gltf.animations[0]).setDuration(0.70 + Math.random() * 0.38).play();

      scene.add(bird);
      groups.push(bird);
      mixers.push(mixer);
    });

    groupsRef.current = groups;
    mixersRef.current = mixers;
    matsRef.current   = mats;

    // ── Loner ─────────────────────────────────────────────────────────────
    const lonerMat = new MeshStandardMaterial({
      color: new Color(0xEDE4D4),
      emissive: new Color(0xE8C96A),
      emissiveIntensity: 0.10,
      roughness: 0.90, metalness: 0.01,
      side: DoubleSide,
      transparent: true, opacity: 0.55,
    });
    lonerMatRef.current = lonerMat;

    const lonerCrown = new Mesh(crownGeo, crownMat);
    lonerCrown.scale.setScalar(1 / LONER_SCALE);
    lonerCrown.position.set(0, geoHeadY * CRANE_CROWN_HEAD_FACTOR, 0);

    const loner = gltf.scene.clone(true) as Group;
    loner.scale.setScalar(LONER_SCALE);
    loner.traverse(node => { if (node instanceof Mesh) node.material = lonerMat; });
    loner.add(lonerCrown);
    loner.position.set(lonerXRef.current, LONER_Y, LONER_Z);
    loner.rotation.y = Math.PI / 2; // face right (+X)
    loner.renderOrder = 12;

    const lonerMixer = new AnimationMixer(loner);
    lonerMixer.clipAction(gltf.animations[0]).setDuration(1.10).play();
    lonerMixerRef.current = lonerMixer;
    lonerRef.current = loner;
    scene.add(loner);

    return () => {
      crownGeo.dispose();
      crownMat.dispose();
      mats.forEach(m => m.dispose());

      groups.forEach((g, i) => {
        mixers[i].stopAllAction();
        scene.remove(g);
        g.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); });
      });

      lonerMat.dispose();
      if (lonerRef.current) {
        lonerMixerRef.current?.stopAllAction();
        scene.remove(lonerRef.current);
        lonerRef.current.traverse(node => {
          if (node instanceof Mesh) node.geometry.dispose();
        });
        lonerRef.current = null;
      }
      groupsRef.current   = [];
      mixersRef.current   = [];
      matsRef.current     = [];
      lonerMixerRef.current = null;
      lonerMatRef.current   = null;
    };
  }, [scene, gltf]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // ── Flock ────────────────────────────────────────────────────────────
    flockXRef.current += flockDirRef.current * FLOCK_SPEED * delta;
    if (flockXRef.current >  BOUNDARY_X) flockDirRef.current = -1;
    if (flockXRef.current < -BOUNDARY_X) flockDirRef.current =  1;

    const targetFlockRotY = flockDirRef.current < 0 ? -Math.PI / 2 : Math.PI / 2;
    const turnAlpha = Math.min(1, CRANE_TURN_LERP * delta);

    groupsRef.current.forEach((bird, i) => {
      if (!mixersRef.current[i]) return;
      mixersRef.current[i].update(delta);

      const [ox, oy, oz] = OFFSETS[i];
      bird.position.x = flockXRef.current + ox;
      bird.position.y = FLOCK_BASE_Y + oy + Math.sin(t * 0.40 + phasesRef.current[i]) * 0.10;
      bird.position.z = FLOCK_BASE_Z - oz;
      bird.rotation.y = MathUtils.lerp(bird.rotation.y, targetFlockRotY, turnAlpha);
    });

    // ── Loner ────────────────────────────────────────────────────────────
    const loner = lonerRef.current;
    if (loner && lonerMixerRef.current) {
      lonerMixerRef.current.update(delta);
      lonerXRef.current += lonerDirRef.current * LONER_SPEED * delta;
      if (lonerXRef.current >  BOUNDARY_X) lonerDirRef.current = -1;
      if (lonerXRef.current < -BOUNDARY_X) lonerDirRef.current =  1;
      const targetLonerRotY = lonerDirRef.current < 0 ? -Math.PI / 2 : Math.PI / 2;
      loner.position.x = lonerXRef.current;
      loner.position.y = LONER_Y + Math.sin(t * 0.25 + 1.7) * 0.07;
      loner.rotation.y = MathUtils.lerp(loner.rotation.y, targetLonerRotY, turnAlpha);
    }
  });

  // Warm key lights — cool blue fills were washing ivory bodies into steel-grey.
  // Image layers use MeshBasicMaterial so they stay unaffected.
  return (
    <>
      <ambientLight intensity={1.55} color={0xf2ebe0} />
      <directionalLight position={[1, 9, 3]} intensity={1.95} color={0xfff1dc} />
    </>
  );
}

useGLTF.preload(MODEL_URL);
