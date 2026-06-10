"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Mesh, NormalBlending } from "three";

function makeShadowBlobTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.22)");
  grad.addColorStop(0.75, "rgba(0,0,0,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.scale(1, 0.55); // squash into ellipse
  ctx.beginPath();
  ctx.arc(cx, cy / 0.55, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
  return new CanvasTexture(canvas);
}

export function CloudShadow() {
  const mesh1 = useRef<Mesh>(null);
  const mesh2 = useRef<Mesh>(null);
  const [tex, setTex] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    const t = makeShadowBlobTexture();
    setTex(t);
    return () => t.dispose();
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh1.current) {
      mesh1.current.position.x = ((t * 0.12) % 28) - 14;
    }
    if (mesh2.current) {
      mesh2.current.position.x = ((t * 0.09 + 14) % 28) - 14;
    }
  });

  if (!tex) return null;

  return (
    <>
      <mesh ref={mesh1} position={[-14, 0.5, -6]}>
        <planeGeometry args={[9, 3.5]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.07}
          blending={NormalBlending}
          depthWrite={false}
          color={0x000000}
        />
      </mesh>
      <mesh ref={mesh2} position={[0, -0.2, -5.5]}>
        <planeGeometry args={[7, 2.8]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.055}
          blending={NormalBlending}
          depthWrite={false}
          color={0x000000}
        />
      </mesh>
    </>
  );
}
