"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Group, Sprite, SpriteMaterial } from "three";

// Large, very-soft glow orbs that represent pools of immortal energy (linh khí).
// They drift slowly and pulse — giving the scene an alive, breathing quality.

type OrbDef = {
  x: number; y: number; z: number;
  scale: number;
  baseOpacity: number;
  phase: number;
  freqOp: number;   // opacity pulse frequency (rad/s)
  dx: number;       // horizontal drift speed (world-units/s)
};

const ORBS: OrbDef[] = [
  // Gold orbs — scattered at mid-depth
  { x: -4.2, y: -1.2, z: -4.8, scale: 5.8, baseOpacity: 0.11, phase: 0.0, freqOp: 0.18, dx:  0.060 },
  { x:  3.4, y:  1.0, z: -4.3, scale: 5.0, baseOpacity: 0.10, phase: 1.6, freqOp: 0.24, dx: -0.048 },
  { x:  5.2, y: -0.3, z: -5.6, scale: 6.4, baseOpacity: 0.07, phase: 4.1, freqOp: 0.15, dx: -0.072 },
  // Jade orbs — slightly shallower for contrast
  { x: -1.2, y:  2.0, z: -3.8, scale: 4.0, baseOpacity: 0.09, phase: 2.8, freqOp: 0.32, dx:  0.040 },
  { x: -3.0, y:  2.8, z: -3.3, scale: 3.4, baseOpacity: 0.12, phase: 0.9, freqOp: 0.28, dx:  0.053 },
  // Deep ambient — very large, very faint, far back
  { x:  1.6, y: -0.8, z: -5.2, scale: 7.2, baseOpacity: 0.06, phase: 3.5, freqOp: 0.20, dx: -0.038 },
  { x: -5.8, y:  0.5, z: -5.0, scale: 5.5, baseOpacity: 0.07, phase: 5.2, freqOp: 0.22, dx:  0.044 },
];

// Alternate gold / jade per orb
const ORB_COLORS: [number, number, number][] = [
  [248, 208,  96],   // gold
  [240, 200,  90],   // gold-warm
  [255, 228, 120],   // gold-bright
  [ 38, 168, 130],   // jade #26a882
  [ 32, 148, 112],   // jade-deep
  [250, 214, 100],   // gold-light
  [ 26, 107,  90],   // jade-dark
];

function makeGlowTex(r: number, g: number, b: number, size = 256): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.28, `rgba(${r},${g},${b},0.60)`);
  grad.addColorStop(0.60, `rgba(${r},${g},${b},0.18)`);
  grad.addColorStop(0.85, `rgba(${r},${g},${b},0.05)`);
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

export function LingQiOrbs() {
  const groupRef = useRef<Group>(null);
  const orbData  = useRef<{ sprite: Sprite; def: OrbDef }[]>([]);

  const textures = useMemo(
    () => ORB_COLORS.map(([r, g, b]) => makeGlowTex(r, g, b)),
    []
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const built = ORBS.map((def, i) => {
      const mat = new SpriteMaterial({
        map:       textures[i],
        transparent: true,
        opacity:   def.baseOpacity,
        blending:  AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new Sprite(mat);
      sprite.position.set(def.x, def.y, def.z);
      sprite.scale.setScalar(def.scale);
      group.add(sprite);
      return { sprite, def };
    });
    orbData.current = built;

    return () => {
      built.forEach(({ sprite }) => {
        (sprite.material as SpriteMaterial).dispose();
        group.remove(sprite);
      });
    };
  }, [textures]);

  useEffect(() => () => { textures.forEach((t) => t.dispose()); }, [textures]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    orbData.current.forEach(({ sprite, def }) => {
      // Slow horizontal drift with wrap
      sprite.position.x += def.dx * delta;
      if (sprite.position.x >  8.5) sprite.position.x = -8.5;
      if (sprite.position.x < -8.5) sprite.position.x =  8.5;

      // Gentle vertical bob
      sprite.position.y = def.y + Math.sin(t * 0.12 + def.phase) * 0.22;

      // Opacity breathing
      const mat = sprite.material as SpriteMaterial;
      mat.opacity = def.baseOpacity * (0.48 + 0.52 * Math.sin(t * def.freqOp + def.phase));
    });
  });

  return <group ref={groupRef} />;
}
