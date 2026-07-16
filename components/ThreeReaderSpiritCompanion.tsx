"use client";

/**
 * Tiểu hồ linh — low-poly spirit companion for the chapter reader.
 * Looks toward pointer / reading focus (Yakudoo look-at idea, xianxia skin).
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, MeshStandardMaterial } from "three";
import type { Group } from "three";

type GazeRef = { current: { nx: number; ny: number } };

function SpiritFox({ gaze }: { gaze: GazeRef }) {
  const headRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);

  const mats = useMemo(() => {
    const fur = new MeshStandardMaterial({
      color: 0xf2ebe0,
      roughness: 0.88,
      metalness: 0.02,
    });
    const tip = new MeshStandardMaterial({
      color: 0xc73a2e,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0x7a2018,
      emissiveIntensity: 0.15,
    });
    const eye = new MeshStandardMaterial({
      color: 0x1a1209,
      roughness: 0.4,
      metalness: 0.1,
    });
    const jade = new MeshStandardMaterial({
      color: 0xe8c96a,
      roughness: 0.55,
      metalness: 0.12,
      emissive: 0xc8962e,
      emissiveIntensity: 0.22,
    });
    return { fur, tip, eye, jade };
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

    body.position.y = Math.sin(t * 1.4) * 0.04;
    body.rotation.z = Math.sin(t * 0.9) * 0.03;

    const { nx, ny } = gaze.current;
    // Map screen gaze → neck yaw/pitch (creature faces reader content to the left)
    const targetYaw = MathUtils.clamp(nx * 0.85 - 0.15, -0.95, 0.95);
    const targetPitch = MathUtils.clamp(-ny * 0.55, -0.5, 0.5);
    const a = 1 - Math.exp(-6.5 * delta);
    head.rotation.y = MathUtils.lerp(head.rotation.y, targetYaw, a);
    head.rotation.x = MathUtils.lerp(head.rotation.x, targetPitch, a);
  });

  return (
    <group position={[0, -0.15, 0]} rotation={[0, 0.35, 0]}>
      <ambientLight intensity={1.2} color={0xf2ebe0} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} color={0xfff1dc} />

      <group ref={bodyRef}>
        <mesh material={mats.fur} position={[0, 0.05, 0]} scale={[0.55, 0.42, 0.4]}>
          <sphereGeometry args={[0.5, 12, 10]} />
        </mesh>
        <mesh material={mats.jade} position={[0, 0.08, 0.28]} scale={[0.12, 0.12, 0.08]}>
          <sphereGeometry args={[0.5, 8, 8]} />
        </mesh>
        <mesh material={mats.fur} position={[-0.28, -0.05, -0.15]} scale={[0.32, 0.28, 0.3]}>
          <sphereGeometry args={[0.5, 10, 8]} />
        </mesh>
        <mesh
          material={mats.fur}
          position={[-0.55, 0.1, -0.25]}
          rotation={[0.4, 0.6, 0.3]}
          scale={[0.22, 0.22, 0.55]}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
        </mesh>
        <mesh material={mats.tip} position={[-0.78, 0.22, -0.42]} scale={[0.1, 0.1, 0.14]}>
          <sphereGeometry args={[0.5, 8, 8]} />
        </mesh>
        <mesh material={mats.fur} position={[0.12, -0.28, 0.12]} scale={[0.1, 0.18, 0.1]}>
          <capsuleGeometry args={[0.35, 0.4, 2, 6]} />
        </mesh>
        <mesh material={mats.fur} position={[-0.08, -0.28, 0.18]} scale={[0.1, 0.18, 0.1]}>
          <capsuleGeometry args={[0.35, 0.4, 2, 6]} />
        </mesh>

        <group ref={headRef} position={[0.32, 0.28, 0.12]}>
          <mesh material={mats.fur} scale={[0.38, 0.36, 0.36]}>
            <sphereGeometry args={[0.5, 12, 10]} />
          </mesh>
          <mesh material={mats.fur} position={[0.22, -0.04, 0.08]} scale={[0.18, 0.12, 0.14]}>
            <sphereGeometry args={[0.5, 8, 8]} />
          </mesh>
          <mesh material={mats.tip} position={[0.32, -0.05, 0.1]} scale={[0.06, 0.05, 0.06]}>
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh
            material={mats.fur}
            position={[-0.06, 0.28, -0.05]}
            rotation={[0, 0, -0.25]}
            scale={[0.1, 0.22, 0.08]}
          >
            <coneGeometry args={[0.5, 1, 5]} />
          </mesh>
          <mesh
            material={mats.fur}
            position={[0.1, 0.28, -0.08]}
            rotation={[0, 0, 0.2]}
            scale={[0.1, 0.22, 0.08]}
          >
            <coneGeometry args={[0.5, 1, 5]} />
          </mesh>
          <mesh material={mats.tip} position={[-0.06, 0.4, -0.05]} scale={[0.05, 0.05, 0.04]}>
            <sphereGeometry args={[0.5, 6, 6]} />
          </mesh>
          <mesh material={mats.eye} position={[0.12, 0.06, 0.22]} scale={[0.055, 0.07, 0.04]}>
            <sphereGeometry args={[0.5, 8, 8]} />
          </mesh>
          <mesh material={mats.eye} position={[0.22, 0.05, 0.16]} scale={[0.055, 0.07, 0.04]}>
            <sphereGeometry args={[0.5, 8, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function ThreeReaderSpiritCompanion() {
  const gaze = useRef({ nx: -0.2, ny: 0.1 });
  const lastPointerAt = useRef(0);
  const lastPointerX = useRef(0);

  useEffect(() => {
    function setFromClient(clientX: number, clientY: number) {
      gaze.current.nx = (clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      gaze.current.ny = -((clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
    }

    function onPointer(e: PointerEvent) {
      lastPointerAt.current = performance.now();
      lastPointerX.current = e.clientX;
      setFromClient(e.clientX, e.clientY);
    }

    function onScroll() {
      if (performance.now() - lastPointerAt.current < 120) return;
      const readingY = window.innerHeight * 0.38;
      const readingX =
        lastPointerAt.current > 0 ? lastPointerX.current : window.innerWidth * 0.42;
      setFromClient(readingX, readingY);
    }

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    lastPointerX.current = window.innerWidth * 0.4;
    setFromClient(lastPointerX.current, window.innerHeight * 0.4);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  return (
    <div className="reader-spirit-companion-webgl" aria-hidden="true">
      <Canvas
        camera={{ position: [0.6, 0.35, 2.6], fov: 40 }}
        dpr={[0.6, 0.9]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <SpiritFox gaze={gaze} />
      </Canvas>
    </div>
  );
}
