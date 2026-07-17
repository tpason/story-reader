"use client";

/**
 * Tiểu hồ linh — cute low-poly spirit companion for the chapter reader.
 * Looks toward pointer / reading focus; blink + idle sway; pauses when tab hidden.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { MathUtils, MeshStandardMaterial } from "three";
import type { Group, Mesh } from "three";

type GazeRef = {
  current: { nx: number; ny: number; lastPointerAt: number };
};

const IDLE_AFTER_MS = 1200;
const BLINK_MIN_MS = 2800;
const BLINK_MAX_MS = 6200;

function scheduleNextBlink(now: number) {
  return now + BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
}

function SpiritFox({ gaze }: { gaze: GazeRef }) {
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
  const blinkDouble = useRef(false);
  const eyeOpenY = 0.085;

  const mats = useMemo(() => {
    const fur = new MeshStandardMaterial({
      color: 0xf6eee4,
      roughness: 0.86,
      metalness: 0.02,
    });
    const tip = new MeshStandardMaterial({
      color: 0xd94a3d,
      roughness: 0.68,
      metalness: 0.04,
      emissive: 0x7a2018,
      emissiveIntensity: 0.12,
    });
    const eye = new MeshStandardMaterial({
      color: 0x2a1810,
      roughness: 0.35,
      metalness: 0.08,
    });
    const shine = new MeshStandardMaterial({
      color: 0xfff8f0,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
    });
    const lid = new MeshStandardMaterial({
      color: 0xeadfd3,
      roughness: 0.9,
      metalness: 0.02,
    });
    const blush = new MeshStandardMaterial({
      color: 0xf2a0a8,
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
    });
    const jade = new MeshStandardMaterial({
      color: 0xf0d06a,
      roughness: 0.5,
      metalness: 0.14,
      emissive: 0xc8962e,
      emissiveIntensity: 0.28,
    });
    const earIn = new MeshStandardMaterial({
      color: 0xf5b8c0,
      roughness: 0.9,
      metalness: 0,
    });
    return { fur, tip, eye, shine, lid, blush, jade, earIn };
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
    if (!body || !head) return;

    // Soft float + tiny wiggle — cute, not frantic
    body.position.y = Math.sin(t * 1.15) * 0.045;
    body.rotation.z = Math.sin(t * 0.75) * 0.035;

    const { nx, ny, lastPointerAt } = gaze.current;
    const idle = performance.now() - lastPointerAt > IDLE_AFTER_MS;
    const swayYaw = idle ? Math.sin(t * 0.5) * 0.14 : 0;
    const swayPitch = idle ? Math.sin(t * 0.38 + 0.9) * 0.07 : 0;

    const targetYaw = MathUtils.clamp(nx * 0.85 - 0.15 + swayYaw, -0.95, 0.95);
    const targetPitch = MathUtils.clamp(-ny * 0.55 + swayPitch, -0.5, 0.5);
    const a = 1 - Math.exp(-6.2 * delta);
    head.rotation.y = MathUtils.lerp(head.rotation.y, targetYaw, a);
    head.rotation.x = MathUtils.lerp(head.rotation.x, targetPitch, a);

    const blinkTRef = leftLidRef.current?.userData;
    let lidClose = typeof blinkTRef?.blinkT === "number" ? blinkTRef.blinkT : 0;

    if (blinkPhase.current === 0 && t >= nextBlinkAt.current) {
      blinkPhase.current = 1;
      blinkDouble.current = Math.random() < 0.32;
    }

    if (blinkPhase.current === 1) {
      lidClose = Math.min(1, lidClose + delta * 14);
      if (lidClose >= 1) blinkPhase.current = 2;
    } else if (blinkPhase.current === 2) {
      lidClose = Math.max(0, lidClose - delta * 10);
      if (lidClose <= 0) {
        if (blinkDouble.current) {
          blinkDouble.current = false;
          blinkPhase.current = 3;
          if (blinkTRef) blinkTRef.holdT = 0;
        } else {
          blinkPhase.current = 0;
          nextBlinkAt.current = scheduleNextBlink(t);
        }
      }
    } else if (blinkPhase.current === 3) {
      const hold = (typeof blinkTRef?.holdT === "number" ? blinkTRef.holdT : 0) + delta;
      if (blinkTRef) blinkTRef.holdT = hold;
      lidClose = 0;
      if (hold > 0.08) blinkPhase.current = 1;
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

  return (
    <group position={[0, -0.12, 0]} rotation={[0, 0.32, 0]}>
      <ambientLight intensity={1.25} color={0xfff4e8} />
      <directionalLight position={[2, 4, 3]} intensity={1.35} color={0xfff1dc} />

      <group ref={bodyRef}>
        {/* rounder chibi body */}
        <mesh material={mats.fur} position={[0, 0.02, 0]} scale={[0.58, 0.48, 0.44]}>
          <sphereGeometry args={[0.5, 14, 12]} />
        </mesh>
        <mesh material={mats.jade} position={[0, 0.06, 0.3]} scale={[0.11, 0.11, 0.08]}>
          <sphereGeometry args={[0.5, 8, 8]} />
        </mesh>
        {/* fluffy tail */}
        <mesh material={mats.fur} position={[-0.3, -0.02, -0.16]} scale={[0.34, 0.3, 0.32]}>
          <sphereGeometry args={[0.5, 10, 8]} />
        </mesh>
        <mesh
          material={mats.fur}
          position={[-0.58, 0.12, -0.26]}
          rotation={[0.35, 0.55, 0.25]}
          scale={[0.24, 0.24, 0.58]}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
        </mesh>
        <mesh material={mats.tip} position={[-0.82, 0.24, -0.44]} scale={[0.11, 0.11, 0.15]}>
          <sphereGeometry args={[0.5, 8, 8]} />
        </mesh>
        {/* stubby paws */}
        <mesh material={mats.fur} position={[0.14, -0.3, 0.14]} scale={[0.11, 0.16, 0.11]}>
          <sphereGeometry args={[0.5, 8, 6]} />
        </mesh>
        <mesh material={mats.fur} position={[-0.1, -0.3, 0.18]} scale={[0.11, 0.16, 0.11]}>
          <sphereGeometry args={[0.5, 8, 6]} />
        </mesh>

        <group ref={headRef} position={[0.3, 0.32, 0.12]}>
          {/* bigger chibi head */}
          <mesh material={mats.fur} scale={[0.44, 0.42, 0.4]}>
            <sphereGeometry args={[0.5, 14, 12]} />
          </mesh>
          <mesh material={mats.fur} position={[0.24, -0.02, 0.1]} scale={[0.2, 0.14, 0.16]}>
            <sphereGeometry args={[0.5, 8, 8]} />
          </mesh>
          <mesh material={mats.tip} position={[0.35, -0.02, 0.12]} scale={[0.065, 0.055, 0.065]}>
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          {/* ears + pink insides */}
          <mesh
            material={mats.fur}
            position={[-0.08, 0.32, -0.04]}
            rotation={[0, 0, -0.28]}
            scale={[0.12, 0.26, 0.09]}
          >
            <coneGeometry args={[0.5, 1, 5]} />
          </mesh>
          <mesh
            material={mats.earIn}
            position={[-0.08, 0.3, 0.0]}
            rotation={[0, 0, -0.28]}
            scale={[0.06, 0.14, 0.04]}
          >
            <coneGeometry args={[0.5, 1, 5]} />
          </mesh>
          <mesh
            material={mats.fur}
            position={[0.12, 0.32, -0.06]}
            rotation={[0, 0, 0.22]}
            scale={[0.12, 0.26, 0.09]}
          >
            <coneGeometry args={[0.5, 1, 5]} />
          </mesh>
          <mesh
            material={mats.earIn}
            position={[0.12, 0.3, -0.02]}
            rotation={[0, 0, 0.22]}
            scale={[0.06, 0.14, 0.04]}
          >
            <coneGeometry args={[0.5, 1, 5]} />
          </mesh>
          <mesh material={mats.tip} position={[-0.08, 0.44, -0.04]} scale={[0.05, 0.05, 0.04]}>
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          {/* blush cheeks */}
          <mesh material={mats.blush} position={[0.08, 0.0, 0.26]} scale={[0.08, 0.045, 0.03]}>
            <sphereGeometry args={[0.5, 8, 6]} />
          </mesh>
          <mesh material={mats.blush} position={[0.28, -0.01, 0.18]} scale={[0.08, 0.045, 0.03]}>
            <sphereGeometry args={[0.5, 8, 6]} />
          </mesh>
          {/* big shiny eyes */}
          <mesh
            ref={leftEyeRef}
            material={mats.eye}
            position={[0.12, 0.07, 0.24]}
            scale={[0.07, eyeOpenY, 0.05]}
          >
            <sphereGeometry args={[0.5, 10, 8]} />
          </mesh>
          <mesh
            ref={rightEyeRef}
            material={mats.eye}
            position={[0.24, 0.06, 0.18]}
            scale={[0.07, eyeOpenY, 0.05]}
          >
            <sphereGeometry args={[0.5, 10, 8]} />
          </mesh>
          <mesh
            ref={leftShineRef}
            material={mats.shine}
            position={[0.135, 0.095, 0.275]}
            scale={[0.025, 0.03, 0.02]}
          >
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh
            ref={rightShineRef}
            material={mats.shine}
            position={[0.255, 0.085, 0.215]}
            scale={[0.025, 0.03, 0.02]}
          >
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh
            ref={leftLidRef}
            material={mats.lid}
            position={[0.12, 0.1, 0.245]}
            scale={[0.075, 0.02, 0.05]}
            visible={false}
          >
            <sphereGeometry args={[0.5, 6, 4]} />
          </mesh>
          <mesh
            ref={rightLidRef}
            material={mats.lid}
            position={[0.24, 0.09, 0.185]}
            scale={[0.075, 0.02, 0.05]}
            visible={false}
          >
            <sphereGeometry args={[0.5, 6, 4]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function ThreeReaderSpiritCompanion() {
  const gaze = useRef({ nx: -0.2, ny: 0.1, lastPointerAt: 0 });
  const lastPointerX = useRef(0);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  useEffect(() => {
    function setFromClient(clientX: number, clientY: number) {
      gaze.current.nx = (clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      gaze.current.ny = -((clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
    }

    function onPointer(e: PointerEvent) {
      gaze.current.lastPointerAt = performance.now();
      lastPointerX.current = e.clientX;
      setFromClient(e.clientX, e.clientY);
    }

    function onScroll() {
      if (performance.now() - gaze.current.lastPointerAt < 120) return;
      const readingY = window.innerHeight * 0.38;
      const readingX =
        gaze.current.lastPointerAt > 0 ? lastPointerX.current : window.innerWidth * 0.42;
      setFromClient(readingX, readingY);
    }

    function onVisibility() {
      setFrameloop(document.hidden ? "never" : "always");
    }

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    lastPointerX.current = window.innerWidth * 0.4;
    gaze.current.lastPointerAt = performance.now();
    setFromClient(lastPointerX.current, window.innerHeight * 0.4);
    onVisibility();

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="reader-spirit-companion-webgl" aria-hidden="true">
      <Canvas
        camera={{ position: [0.55, 0.32, 2.55], fov: 40 }}
        dpr={[0.55, 0.85]}
        frameloop={frameloop}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <SpiritFox gaze={gaze} />
      </Canvas>
    </div>
  );
}
