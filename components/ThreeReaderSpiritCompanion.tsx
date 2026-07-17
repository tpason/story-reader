"use client";

/**
 * WebGL fox — only used when reader performance mode is full_effects.
 * Demand frameloop + capped invalidate (~8fps); pause on scroll / hidden.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { MathUtils, MeshStandardMaterial } from "three";
import type { Group, Mesh } from "three";
import type { SpiritPose } from "@/lib/spirit-companion";

const BLINK_MIN_S = 3.2;
const BLINK_MAX_S = 7.2;
const TARGET_FRAME_MS = 125; // ~8 fps

const POSE_TARGETS: Record<
  SpiritPose,
  { bodyY: number; bodyRotZ: number; bodyRotX: number; headY: number; float: number }
> = {
  stand: { bodyY: 0, bodyRotZ: 0, bodyRotX: 0, headY: 0.32, float: 0.55 },
  sit: { bodyY: -0.1, bodyRotZ: 0.08, bodyRotX: 0.35, headY: 0.28, float: 0.2 },
  lie: { bodyY: -0.18, bodyRotZ: 1.15, bodyRotX: 0.05, headY: 0.22, float: 0 },
  sleep: { bodyY: -0.2, bodyRotZ: 1.28, bodyRotX: 0.02, headY: 0.18, float: 0 },
};

function scheduleNextBlink(nowSeconds: number) {
  return nowSeconds + BLINK_MIN_S + Math.random() * (BLINK_MAX_S - BLINK_MIN_S);
}

function FrameCap({ active, frameMs }: { active: boolean; frameMs: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!active) return;
    invalidate();
    const id = window.setInterval(() => invalidate(), frameMs);
    return () => window.clearInterval(id);
  }, [active, frameMs, invalidate]);
  return null;
}

function PoseKick({ pose }: { pose: SpiritPose }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [pose, invalidate]);
  return null;
}

function SpiritFox({ pose }: { pose: SpiritPose }) {
  const rootRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const leftLidRef = useRef<Mesh>(null);
  const rightLidRef = useRef<Mesh>(null);
  const leftShineRef = useRef<Mesh>(null);
  const rightShineRef = useRef<Mesh>(null);
  const nextBlinkAt = useRef(scheduleNextBlink(0));
  const blinkPhase = useRef(0);
  const eyeOpenY = 0.085;
  const poseRef = useRef(pose);
  poseRef.current = pose;

  const mats = useMemo(() => {
    const fur = new MeshStandardMaterial({
      color: 0xf3ebe0,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
    });
    const tip = new MeshStandardMaterial({
      color: 0xb8860b,
      roughness: 0.7,
      metalness: 0.05,
      flatShading: true,
    });
    const eye = new MeshStandardMaterial({
      color: 0x1a2218,
      roughness: 0.4,
      metalness: 0,
      flatShading: true,
    });
    const shine = new MeshStandardMaterial({
      color: 0xf0d06a,
      roughness: 0.4,
      transparent: true,
      opacity: 0.7,
      flatShading: true,
    });
    const lid = new MeshStandardMaterial({
      color: 0xe8dccf,
      roughness: 0.95,
      flatShading: true,
    });
    const mark = new MeshStandardMaterial({
      color: 0xc8962e,
      roughness: 0.55,
      emissive: 0xc8962e,
      emissiveIntensity: 0.12,
      flatShading: true,
    });
    const jade = new MeshStandardMaterial({
      color: 0x26a882,
      roughness: 0.5,
      emissive: 0x1a6b5a,
      emissiveIntensity: 0.22,
      flatShading: true,
    });
    const earIn = new MeshStandardMaterial({
      color: 0x7a9e90,
      roughness: 0.9,
      flatShading: true,
    });
    return { fur, tip, eye, shine, lid, mark, jade, earIn };
  }, []);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const body = bodyRef.current;
    const head = headRef.current;
    const root = rootRef.current;
    if (!body || !head || !root) return;

    const target = POSE_TARGETS[poseRef.current];
    const a = 1 - Math.exp(-2.4 * delta);
    root.position.y = MathUtils.lerp(root.position.y, target.bodyY, a);
    root.rotation.z = MathUtils.lerp(root.rotation.z, target.bodyRotZ, a);
    root.rotation.x = MathUtils.lerp(root.rotation.x, target.bodyRotX, a);
    head.position.y = MathUtils.lerp(head.position.y, target.headY, a);

    const floatAmp = target.float;
    body.position.y = Math.sin(t * 0.9) * 0.03 * floatAmp;
    body.rotation.z = Math.sin(t * 0.55) * 0.02 * floatAmp;

    const sleeping = poseRef.current === "sleep";
    head.rotation.y = MathUtils.lerp(head.rotation.y, sleeping ? 0.08 : -0.12, a);
    head.rotation.x = MathUtils.lerp(head.rotation.x, sleeping ? 0.04 : 0.05, a);

    const blinkTRef = leftLidRef.current?.userData;
    let lidClose = typeof blinkTRef?.blinkT === "number" ? blinkTRef.blinkT : 0;

    if (sleeping) {
      lidClose = MathUtils.lerp(lidClose, 1, 1 - Math.exp(-6 * delta));
      blinkPhase.current = 0;
    } else if (blinkPhase.current === 0 && t >= nextBlinkAt.current) {
      blinkPhase.current = 1;
    } else if (blinkPhase.current === 1) {
      lidClose = Math.min(1, lidClose + delta * 12);
      if (lidClose >= 1) blinkPhase.current = 2;
    } else if (blinkPhase.current === 2) {
      lidClose = Math.max(0, lidClose - delta * 9);
      if (lidClose <= 0) {
        blinkPhase.current = 0;
        nextBlinkAt.current = scheduleNextBlink(t);
      }
    }

    if (leftLidRef.current) leftLidRef.current.userData.blinkT = lidClose;
    if (rightLidRef.current) rightLidRef.current.userData.blinkT = lidClose;

    const eyeScaleY = eyeOpenY * (1 - lidClose * 0.94);
    const lidScaleY = 0.02 + lidClose * 0.1;
    const shineVisible = lidClose < 0.35;
    for (const eye of [leftEyeRef.current, rightEyeRef.current]) {
      if (eye) eye.scale.y = eyeScaleY;
    }
    for (const shine of [leftShineRef.current, rightShineRef.current]) {
      if (shine) shine.visible = shineVisible;
    }
    for (const lid of [leftLidRef.current, rightLidRef.current]) {
      if (lid) {
        lid.scale.y = lidScaleY;
        lid.visible = lidClose > 0.02;
      }
    }
  });

  // Lower segment counts = cheaper GPU
  return (
    <group ref={rootRef} position={[0, -0.12, 0]}>
      <ambientLight intensity={1.15} color={0xfff4e8} />
      <directionalLight position={[2, 4, 3]} intensity={1.1} color={0xfff1dc} />

      <group rotation={[0, 0.32, 0]} ref={bodyRef}>
        <mesh material={mats.fur} position={[0, 0.02, 0]} scale={[0.58, 0.48, 0.44]}>
          <sphereGeometry args={[0.5, 10, 8]} />
        </mesh>
        <mesh material={mats.jade} position={[0, 0.06, 0.3]} scale={[0.11, 0.11, 0.08]}>
          <sphereGeometry args={[0.5, 6, 6]} />
        </mesh>
        <mesh material={mats.fur} position={[-0.3, -0.02, -0.16]} scale={[0.34, 0.3, 0.32]}>
          <sphereGeometry args={[0.5, 8, 6]} />
        </mesh>
        <mesh
          material={mats.fur}
          position={[-0.58, 0.12, -0.26]}
          rotation={[0.35, 0.55, 0.25]}
          scale={[0.24, 0.24, 0.58]}
        >
          <sphereGeometry args={[0.5, 6, 6]} />
        </mesh>
        <mesh material={mats.tip} position={[-0.82, 0.24, -0.44]} scale={[0.11, 0.11, 0.15]}>
          <sphereGeometry args={[0.5, 6, 6]} />
        </mesh>
        <mesh material={mats.fur} position={[0.14, -0.3, 0.14]} scale={[0.11, 0.16, 0.11]}>
          <sphereGeometry args={[0.5, 6, 5]} />
        </mesh>
        <mesh material={mats.fur} position={[-0.1, -0.3, 0.18]} scale={[0.11, 0.16, 0.11]}>
          <sphereGeometry args={[0.5, 6, 5]} />
        </mesh>

        <group ref={headRef} position={[0.3, 0.32, 0.12]}>
          <mesh material={mats.fur} scale={[0.44, 0.42, 0.4]}>
            <sphereGeometry args={[0.5, 10, 8]} />
          </mesh>
          <mesh material={mats.fur} position={[0.24, -0.02, 0.1]} scale={[0.2, 0.14, 0.16]}>
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh material={mats.tip} position={[0.35, -0.02, 0.12]} scale={[0.065, 0.055, 0.065]}>
            <sphereGeometry args={[0.5, 5, 5]} />
          </mesh>
          <mesh
            material={mats.fur}
            position={[-0.08, 0.32, -0.04]}
            rotation={[0, 0, -0.28]}
            scale={[0.12, 0.26, 0.09]}
          >
            <coneGeometry args={[0.5, 1, 4]} />
          </mesh>
          <mesh
            material={mats.earIn}
            position={[-0.08, 0.3, 0]}
            rotation={[0, 0, -0.28]}
            scale={[0.06, 0.14, 0.04]}
          >
            <coneGeometry args={[0.5, 1, 4]} />
          </mesh>
          <mesh
            material={mats.fur}
            position={[0.12, 0.32, -0.06]}
            rotation={[0, 0, 0.22]}
            scale={[0.12, 0.26, 0.09]}
          >
            <coneGeometry args={[0.5, 1, 4]} />
          </mesh>
          <mesh
            material={mats.earIn}
            position={[0.12, 0.3, -0.02]}
            rotation={[0, 0, 0.22]}
            scale={[0.06, 0.14, 0.04]}
          >
            <coneGeometry args={[0.5, 1, 4]} />
          </mesh>
          <mesh material={mats.tip} position={[-0.08, 0.44, -0.04]} scale={[0.05, 0.05, 0.04]}>
            <sphereGeometry args={[0.5, 5, 5]} />
          </mesh>
          <mesh material={mats.mark} position={[0.18, 0.16, 0.22]} scale={[0.035, 0.05, 0.02]}>
            <sphereGeometry args={[0.5, 5, 5]} />
          </mesh>
          <mesh
            ref={leftEyeRef}
            material={mats.eye}
            position={[0.12, 0.07, 0.24]}
            scale={[0.07, eyeOpenY, 0.05]}
          >
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh
            ref={rightEyeRef}
            material={mats.eye}
            position={[0.24, 0.06, 0.18]}
            scale={[0.07, eyeOpenY, 0.05]}
          >
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh
            ref={leftShineRef}
            material={mats.shine}
            position={[0.135, 0.095, 0.275]}
            scale={[0.025, 0.03, 0.02]}
          >
            <sphereGeometry args={[0.5, 5, 5]} />
          </mesh>
          <mesh
            ref={rightShineRef}
            material={mats.shine}
            position={[0.255, 0.085, 0.215]}
            scale={[0.025, 0.03, 0.02]}
          >
            <sphereGeometry args={[0.5, 5, 5]} />
          </mesh>
          <mesh
            ref={leftLidRef}
            material={mats.lid}
            position={[0.12, 0.1, 0.245]}
            scale={[0.075, 0.02, 0.05]}
            visible={false}
          >
            <sphereGeometry args={[0.5, 5, 4]} />
          </mesh>
          <mesh
            ref={rightLidRef}
            material={mats.lid}
            position={[0.24, 0.09, 0.185]}
            scale={[0.075, 0.02, 0.05]}
            visible={false}
          >
            <sphereGeometry args={[0.5, 5, 4]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function ThreeReaderSpiritCompanion({ pose = "stand" }: { pose?: SpiritPose }) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    let scrollTimer = 0;
    function pause() {
      setActive(false);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        if (!document.hidden) setActive(true);
      }, 1200);
    }
    function onVis() {
      setActive(!document.hidden);
    }
    window.addEventListener("scroll", pause, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => {
      window.removeEventListener("scroll", pause, true);
      document.removeEventListener("visibilitychange", onVis);
      if (scrollTimer) window.clearTimeout(scrollTimer);
    };
  }, []);

  // Sleep / lie: ~2fps settle; stand/sit ~8fps
  const quiet = pose === "sleep" || pose === "lie";

  return (
    <div className="reader-spirit-companion-webgl" aria-hidden="true">
      <Canvas
        camera={{ position: [0.55, 0.32, 2.55], fov: 40 }}
        dpr={[0.45, 0.65]}
        frameloop="demand"
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
          stencil: false,
          depth: true,
        }}
        style={{ background: "transparent" }}
      >
        <FrameCap active={active} frameMs={quiet ? 500 : TARGET_FRAME_MS} />
        <PoseKick pose={pose} />
        <SpiritFox pose={pose} />
      </Canvas>
    </div>
  );
}
