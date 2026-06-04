"use client";

import { useFrame } from "@react-three/fiber";

// Slow sinusoidal camera drift — reveals 3D parallax depth between layers.
// The camera breathes gently: ±0.18 horizontal, ±0.10 vertical.
// Period ~90s horizontal, ~120s vertical → barely perceptible but feels alive.
export function CameraBreath() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.065) * 0.18;
    state.camera.position.y = Math.sin(t * 0.048 + 1.4) * 0.10;
    // Subtle tilt — like floating on immortal wind
    state.camera.rotation.z = Math.sin(t * 0.031 + 2.0) * 0.0028;
    // z stays at 5 (set in Canvas camera prop)
  });
  return null;
}
