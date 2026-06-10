"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Color, DoubleSide, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

const MODEL_URL = "/assets/xianxia/models/flamingo.glb";

// V-formation trailing offsets: [deltaX_behind, deltaY, deltaZ_depth]
// ox > 0 = trailing behind leader when flying left
const OFFSETS: [number, number, number][] = [
  [0.00,  0.00, 0.00],
  [0.85,  0.42, 0.18],
  [0.85, -0.42, 0.18],
  [1.70,  0.85, 0.38],
  [1.70, -0.85, 0.38],
  [2.40,  0.30, 0.52],
  [2.55,  1.15, 0.62],
  [2.55, -1.15, 0.62],
];

// Bạch Hạc Linh Vân — antique muted tones
// [body, emissive, emissiveIntensity, opacity]
const BIRD_CONFIGS: [number, number, number, number][] = [
  [0xF0EBE0, 0x9FE7D7, 0.38, 0.94],  // leader     — ngà cổ + linh khí ngọc
  [0xE6E0D4, 0xB9C7D6, 0.20, 0.88],  // right-1    — ngà ấm + xám lam
  [0xE6E0D4, 0xB9C7D6, 0.18, 0.88],  // left-1
  [0xCBD3E0, 0x8E86A8, 0.14, 0.80],  // right-2    — lam nhạt + tím khói
  [0xCBD3E0, 0x8E86A8, 0.12, 0.80],  // left-2
  [0xB8C2D4, 0x7A7898, 0.09, 0.70],  // center-bk  — xám lam đục
  [0xA1AEC4, 0x3D4F6E, 0.07, 0.58],  // right-bk   — lam hoàng hôn
  [0x8A9BB4, 0x1B2740, 0.04, 0.46],  // left-bk    — nhòa vào lam đêm
];

const BIRD_SCALE   = 0.009;
const FLOCK_BASE_Y = 0.85;
const FLOCK_BASE_Z = -3.1;
const FLOCK_SPEED  = 0.50;
const BOUNDARY_X   = 7.5;

// Đầu hạc: đỏ chu sa
const CROWN_RADIUS = 0.022; // world units
const CROWN_COLOR  = 0xB8473D;
const CROWN_EMISSIVE = 0x601a12;

// Con lạc đàn — tím khói, bay ngược chiều ở tầng cao
const LONER_SCALE  = 0.008;
const LONER_Y      = 1.78;
const LONER_Z      = -4.05;
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
        roughness: 0.82, metalness: 0.02,
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
      crown.position.set(0, geoHeadY * 0.80, 0);
      bird.add(crown);

      bird.position.set(flockXRef.current + ox, FLOCK_BASE_Y + oy, FLOCK_BASE_Z - oz);
      bird.rotation.y = -Math.PI / 2; // face left (-X)

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
      color: new Color(0xC0BBCF),
      emissive: new Color(0x9FE7D7),
      emissiveIntensity: 0.18,
      roughness: 0.85, metalness: 0.01,
      side: DoubleSide,
      transparent: true, opacity: 0.62,
    });
    lonerMatRef.current = lonerMat;

    const lonerCrown = new Mesh(crownGeo, crownMat);
    lonerCrown.scale.setScalar(1 / LONER_SCALE);
    lonerCrown.position.set(0, geoHeadY * 0.80, 0);

    const loner = gltf.scene.clone(true) as Group;
    loner.scale.setScalar(LONER_SCALE);
    loner.traverse(node => { if (node instanceof Mesh) node.material = lonerMat; });
    loner.add(lonerCrown);
    loner.position.set(lonerXRef.current, LONER_Y, LONER_Z);
    loner.rotation.y = Math.PI / 2; // face right (+X)

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

    // ±π/2 = bird faces direction of travel; instant snap (realistic for birds)
    const flockRotY = flockDirRef.current < 0 ? -Math.PI / 2 : Math.PI / 2;

    groupsRef.current.forEach((bird, i) => {
      if (!mixersRef.current[i]) return;
      mixersRef.current[i].update(delta);

      const [ox, oy, oz] = OFFSETS[i];
      bird.position.x = flockXRef.current + ox;
      bird.position.y = FLOCK_BASE_Y + oy + Math.sin(t * 0.40 + phasesRef.current[i]) * 0.10;
      bird.position.z = FLOCK_BASE_Z - oz;
      bird.rotation.y = flockRotY;
    });

    // ── Loner ────────────────────────────────────────────────────────────
    const loner = lonerRef.current;
    if (loner && lonerMixerRef.current) {
      lonerMixerRef.current.update(delta);
      lonerXRef.current += lonerDirRef.current * LONER_SPEED * delta;
      if (lonerXRef.current >  BOUNDARY_X) lonerDirRef.current = -1;
      if (lonerXRef.current < -BOUNDARY_X) lonerDirRef.current =  1;
      loner.position.x = lonerXRef.current;
      loner.position.y = LONER_Y + Math.sin(t * 0.25 + 1.7) * 0.07;
      loner.rotation.y = lonerDirRef.current < 0 ? -Math.PI / 2 : Math.PI / 2;
    }
  });

  // Lights chỉ tác động MeshStandardMaterial — các layer ảnh dùng
  // MeshBasicMaterial nên không bị ảnh hưởng.
  return (
    <>
      <ambientLight intensity={2.0} color={0xdde8f5} />
      <directionalLight position={[1, 9, 3]} intensity={2.6} color={0xe5eeff} />
    </>
  );
}

useGLTF.preload(MODEL_URL);
