"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";

type ThreeSkillEffectCanvasProps = {
  skillId: string;
  durationMs: number;
  intensity?: number;
};

type SkillPalette = {
  primary: string;
  secondary: string;
  hot: string;
  particleCount: number;
  ringCount: number;
  speed: number;
};

type BeanSoldierRig = {
  root: THREE.Group;
  body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  spear: THREE.Mesh;
  banner: THREE.Mesh;
  phase: number;
  lane: number;
};

type BeanSoldierParade = {
  group: THREE.Group;
  soldiers: BeanSoldierRig[];
};

type SwordFlightRig = {
  group: THREE.Group;
  blade: THREE.Mesh;
  trail: THREE.Mesh;
  afterimages: THREE.Mesh[];
};

type WindBladeRig = {
  group: THREE.Group;
  blades: THREE.Mesh[];
};

type RainRippleRig = {
  plane: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  drops: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  veils: THREE.Mesh[];
  runes: THREE.Mesh[];
};

type WaterDragonRig = {
  group: THREE.Group;
  beads: THREE.Mesh[];
  whiskers: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>[];
};

type LightningRig = {
  group: THREE.Group;
  branches: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>[];
};

type LotusDomainRig = {
  group: THREE.Group;
  petals: THREE.Mesh[];
  rings: THREE.Mesh[];
  dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
};

type StarfallRig = {
  group: THREE.Group;
  meteors: THREE.Mesh[];
};

type FireDragonRig = {
  group: THREE.Group;
  bodyBeads: THREE.Mesh[];
  mane: THREE.Mesh[];
  fireParticles: THREE.Points;
};

type SwordRainRig = {
  group: THREE.Group;
  swords: Array<{
    group: THREE.Group;
    blade: THREE.Mesh;
    guard: THREE.Mesh;
    glow: THREE.Mesh;
    speed: number;
    phase: number;
  }>;
};

type PetalCascadeRig = {
  group: THREE.Group;
  petals: THREE.Mesh[];
};

type DivineSealRig = {
  group: THREE.Group;
  rings: THREE.Mesh[];
  runes: THREE.Mesh[];
  beams: THREE.Mesh[];
  core: THREE.Mesh;
};

const SKILL_PALETTES: Record<string, SkillPalette> = {
  wind_blade: {
    primary: "#5eead4",
    secondary: "#38bdf8",
    hot: "#fef08a",
    particleCount: 110,
    ringCount: 3,
    speed: 1.18
  },
  summon_rain: {
    primary: "#bfdbfe",
    secondary: "#22d3ee",
    hot: "#e0f2fe",
    particleCount: 210,
    ringCount: 5,
    speed: 0.9
  },
  bean_soldiers: {
    primary: "#facc15",
    secondary: "#fb7185",
    hot: "#22c55e",
    particleCount: 92,
    ringCount: 3,
    speed: 0.92
  },
  sword_flight: {
    primary: "#c4b5fd",
    secondary: "#38bdf8",
    hot: "#ffffff",
    particleCount: 118,
    ringCount: 4,
    speed: 1.36
  },
  lotus_domain: {
    primary: "#f9a8d4",
    secondary: "#2dd4bf",
    hot: "#fef9c3",
    particleCount: 128,
    ringCount: 5,
    speed: 0.78
  },
  celestial_rain: {
    primary: "#e0f2fe",
    secondary: "#67e8f9",
    hot: "#ffffff",
    particleCount: 260,
    ringCount: 6,
    speed: 1.06
  },
  heaven_thunder: {
    primary: "#fde047",
    secondary: "#ffffff",
    hot: "#fb923c",
    particleCount: 86,
    ringCount: 5,
    speed: 1.52
  },
  starfall: {
    primary: "#bae6fd",
    secondary: "#c4b5fd",
    hot: "#ffffff",
    particleCount: 132,
    ringCount: 4,
    speed: 1.28
  },
  hoa_long: {
    primary: "#ff7722",
    secondary: "#ffd700",
    hot: "#ffffff",
    particleCount: 140,
    ringCount: 4,
    speed: 1.44
  },
  van_kiem: {
    primary: "#a855f7",
    secondary: "#e0c8ff",
    hot: "#ffffff",
    particleCount: 100,
    ringCount: 4,
    speed: 1.32
  },
  dao_hoa_tan: {
    primary: "#f9a8d4",
    secondary: "#fce7f3",
    hot: "#fff1f2",
    particleCount: 148,
    ringCount: 5,
    speed: 0.72
  },
  thien_dia_an: {
    primary: "#fbbf24",
    secondary: "#dc2626",
    hot: "#ffffff",
    particleCount: 180,
    ringCount: 7,
    speed: 0.88
  }
};

const DEFAULT_PALETTE: SkillPalette = {
  primary: "#f5d75e",
  secondary: "#60a5fa",
  hot: "#ffffff",
  particleCount: 96,
  ringCount: 3,
  speed: 1
};

type BloomConfig = { strength: number; radius: number; threshold: number; afterimage?: number };

function getBloomConfig(skillId: string, effectPower: number): BloomConfig {
  switch (skillId) {
    case "heaven_thunder": return { strength: 2.2 * effectPower, radius: 0.52, threshold: 0 };
    case "sword_flight":   return { strength: 1.8 * effectPower, radius: 0.28, threshold: 0, afterimage: 0.88 };
    case "wind_blade":     return { strength: 1.6 * effectPower, radius: 0.34, threshold: 0, afterimage: 0.80 };
    case "starfall":       return { strength: 2.0 * effectPower, radius: 0.40, threshold: 0, afterimage: 0.74 };
    case "celestial_rain": return { strength: 1.4 * effectPower, radius: 0.58, threshold: 0 };
    case "lotus_domain":   return { strength: 1.2 * effectPower, radius: 0.50, threshold: 0 };
    case "bean_soldiers":  return { strength: 1.0 * effectPower, radius: 0.44, threshold: 0 };
    case "hoa_long":       return { strength: 2.4 * effectPower, radius: 0.46, threshold: 0, afterimage: 0.82 };
    case "van_kiem":       return { strength: 2.2 * effectPower, radius: 0.32, threshold: 0, afterimage: 0.78 };
    case "dao_hoa_tan":    return { strength: 1.4 * effectPower, radius: 0.54, threshold: 0 };
    case "thien_dia_an":   return { strength: 2.8 * effectPower, radius: 0.62, threshold: 0 };
    default:               return { strength: 1.2 * effectPower, radius: 0.42, threshold: 0 };
  }
}

function getPalette(skillId: string) {
  return SKILL_PALETTES[skillId] ?? DEFAULT_PALETTE;
}

function isRainSkill(skillId: string) {
  return skillId === "summon_rain" || skillId === "celestial_rain";
}

function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function createParticleField(skillId: string, palette: SkillPalette) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(palette.particleCount * 3);
  const seeds = new Float32Array(palette.particleCount);

  for (let index = 0; index < palette.particleCount; index += 1) {
    const offset = index * 3;
    const a = seededNoise(index + 1);
    const b = seededNoise(index + 19);
    const c = seededNoise(index + 43);
    positions[offset] = (a - 0.5) * 8.4;
    positions[offset + 1] = (b - 0.5) * 4.8;
    positions[offset + 2] = (c - 0.5) * 3.8;
    seeds[index] = c;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(palette.primary),
    size: isRainSkill(skillId) ? 0.034 : 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: skillId === "heaven_thunder" ? 0.92 : 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

function createSealRings(palette: SkillPalette) {
  return Array.from({ length: palette.ringCount }).map((_, index) => {
    const geometry = new THREE.TorusGeometry(0.72 + index * 0.38, 0.006 + index * 0.002, 8, 132);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(index % 2 === 0 ? palette.primary : palette.secondary),
      transparent: true,
      opacity: 0.28 - index * 0.026,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2.7 + index * 0.15;
    mesh.rotation.y = index * 0.42;
    return mesh;
  });
}

function createSkillBeam(skillId: string, palette: SkillPalette) {
  const color = new THREE.Color(
    skillId === "heaven_thunder" ? palette.hot :
    skillId === "hoa_long" ? palette.primary :
    skillId === "thien_dia_an" ? palette.hot :
    palette.secondary
  );
  const width = isRainSkill(skillId) ? (skillId === "celestial_rain" ? 5.2 : 4.4) : skillId === "lotus_domain" ? 2.8 : skillId === "heaven_thunder" ? 0.075 : skillId === "sword_flight" ? 0.045 : skillId === "hoa_long" ? 0.058 : skillId === "van_kiem" ? 2.0 : skillId === "dao_hoa_tan" ? 5.0 : skillId === "thien_dia_an" ? 5.8 : 0.025;
  const height = isRainSkill(skillId) ? 5.4 : skillId === "lotus_domain" ? 0.022 : skillId === "heaven_thunder" ? 4.4 : skillId === "van_kiem" ? 5.8 : skillId === "dao_hoa_tan" ? 5.8 : skillId === "thien_dia_an" ? 5.8 : 6.2;
  const geometry = new THREE.PlaneGeometry(height, width, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: isRainSkill(skillId) ? 0.13 : skillId === "lotus_domain" ? 0.16 : skillId === "van_kiem" ? 0.18 : skillId === "dao_hoa_tan" ? 0.1 : skillId === "thien_dia_an" ? 0.22 : 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(geometry, material);

  if (isRainSkill(skillId)) {
    beam.position.set(0, 0.12, -0.7);
    beam.rotation.z = 0;
  } else if (skillId === "lotus_domain") {
    beam.position.set(0, -1.2, -0.1);
    beam.rotation.z = 0;
  } else if (skillId === "heaven_thunder") {
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 0.7;
  } else if (skillId === "van_kiem") {
    beam.position.set(0, 2.8, -0.4);
    beam.rotation.z = 0;
  } else if (skillId === "dao_hoa_tan" || skillId === "thien_dia_an") {
    beam.position.set(0, 0, -1.0);
    beam.rotation.z = 0;
  } else {
    beam.rotation.z = skillId === "wind_blade" ? -0.18 : skillId === "hoa_long" ? -0.14 : 0.08;
    beam.position.x = -4.8;
    beam.position.y = skillId === "sword_flight" ? 0.72 : skillId === "hoa_long" ? 0.22 : 0.08;
  }

  return beam;
}

function createWindBladeRig(palette: SkillPalette): WindBladeRig {
  const group = new THREE.Group();
  group.position.set(-5.4, 0.12, 0.15);

  const blades = Array.from({ length: 5 }).map((_, index) => {
    const blade = new THREE.Mesh(
      new THREE.TorusGeometry(0.42 + index * 0.055, 0.012 + index * 0.002, 8, 72, Math.PI * 0.86),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: 0.4 - index * 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    blade.position.set(-index * 0.28, -0.22 + index * 0.11, -0.16 - index * 0.08);
    blade.rotation.set(Math.PI / 2.5, 0.2 + index * 0.1, -0.42 + index * 0.16);
    blade.scale.set(1.55 + index * 0.16, 0.42 + index * 0.06, 1);
    group.add(blade);
    return blade;
  });

  return { group, blades };
}

function createSwordFlightRig(palette: SkillPalette): SwordFlightRig {
  const group = new THREE.Group();
  group.position.set(-5.2, 0.72, 0.18);
  group.rotation.z = -0.1;

  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 1.42, 4, 1),
    new THREE.MeshStandardMaterial({
      color: "#f8fbff",
      emissive: new THREE.Color(palette.secondary),
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.96
    })
  );
  blade.rotation.z = -Math.PI / 2;
  blade.scale.x = 1.8;

  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.026, 0.026),
    new THREE.MeshBasicMaterial({
      color: palette.hot,
      transparent: true,
      opacity: 0.84,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  spine.position.x = -0.1;

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.34, 0.035),
    new THREE.MeshStandardMaterial({
      color: palette.primary,
      emissive: palette.primary,
      emissiveIntensity: 0.2,
      roughness: 0.36,
      metalness: 0.3
    })
  );
  guard.position.x = -0.78;

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.48, 10),
    new THREE.MeshStandardMaterial({
      color: "#3b1d63",
      emissive: palette.primary,
      emissiveIntensity: 0.12,
      roughness: 0.46
    })
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.x = -1.06;

  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.34, 1, 1),
    new THREE.MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  trail.position.x = -1.72;
  trail.rotation.z = 0.04;

  const afterimages = Array.from({ length: 3 }).map((_, index) => {
    const image = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8 + index * 0.42, 0.045, 1, 1),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: 0.24 - index * 0.045,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    image.position.set(-1.18 - index * 0.48, -0.14 + index * 0.08, -0.02 - index * 0.04);
    return image;
  });

  group.add(trail, blade, spine, guard, handle, ...afterimages);
  return { group, blade, trail, afterimages };
}

function createWaterDragonRig(palette: SkillPalette, majestic = false): WaterDragonRig {
  const group = new THREE.Group();
  const count = majestic ? 36 : 22;
  const beadGeometry = new THREE.SphereGeometry(majestic ? 0.07 : 0.048, 14, 10);
  const beads = Array.from({ length: count }).map((_, index) => {
    const bead = new THREE.Mesh(
      beadGeometry,
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? palette.hot : index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: majestic ? 0.46 : 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(bead);
    return bead;
  });

  const whiskers = Array.from({ length: majestic ? 4 : 2 }).map((_, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Array(18).fill(0), 3));
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: index % 2 === 0 ? palette.hot : palette.secondary,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(line);
    return line;
  });

  group.position.set(0, -0.28, 0.35);
  return { group, beads, whiskers };
}

function createRainRippleRig(palette: SkillPalette, majestic = false): RainRippleRig {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 4.8, 1, 1),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(palette.secondary) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec2 vUv;

        float ring(vec2 point, vec2 center, float radius) {
          float distanceToCenter = distance(point, center);
          return smoothstep(0.022, 0.0, abs(distanceToCenter - radius));
        }

        void main() {
          vec2 uv = vUv;
          float pulse = sin(uProgress * 3.14159265);
          float value = 0.0;
          value += ring(uv, vec2(0.22, 0.28), fract(uTime * 0.18) * 0.42);
          value += ring(uv, vec2(0.50, 0.22), fract(uTime * 0.15 + 0.33) * 0.36);
          value += ring(uv, vec2(0.76, 0.32), fract(uTime * 0.2 + 0.66) * 0.38);
          value += ring(uv, vec2(0.36, 0.44), fract(uTime * 0.16 + 0.12) * 0.3);
          float waterline = smoothstep(0.72, 0.0, abs(uv.y - 0.24)) * 0.08;
          float curtain = smoothstep(0.9, 0.18, uv.y) * smoothstep(0.0, 0.28, uv.y) * 0.035;
          float shimmer = pow(max(0.0, sin((uv.x + uTime * 0.08) * 54.0) * 0.5 + 0.5), 8.0) * curtain;
          gl_FragColor = vec4(uColor, (value * 0.5 + waterline + shimmer) * pulse);
        }
      `
    })
  );
  plane.position.y = -1.6;
  plane.position.z = -0.3;

  const count = majestic ? 260 : 190;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = -4.4 + seededNoise(index + 301) * 8.8;
    positions[offset + 1] = -2.2 + seededNoise(index + 307) * 4.8;
    positions[offset + 2] = -0.8 + seededNoise(index + 313) * 1.2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const drops = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: palette.primary,
      size: 0.032,
      transparent: true,
      opacity: 0.64,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const veilCount = majestic ? 14 : 9;
  const veils = Array.from({ length: veilCount }).map((_, index) => {
    const width = 0.018 + seededNoise(index + 711) * 0.018;
    const height = 4.8 + seededNoise(index + 719) * 1.2;
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height, 1, 1),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: majestic ? 0.28 : 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    veil.position.set(-4.2 + (index / Math.max(1, veilCount - 1)) * 8.4, 0.1 + seededNoise(index + 727) * 0.8, -0.6 - seededNoise(index + 733) * 1.1);
    veil.rotation.z = (seededNoise(index + 739) - 0.5) * 0.08;
    return veil;
  });

  const runes = Array.from({ length: majestic ? 5 : 3 }).map((_, index) => {
    const rune = new THREE.Mesh(
      new THREE.TorusGeometry(0.38 + index * 0.18, 0.004, 8, 96),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? palette.secondary : palette.hot,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    rune.position.set(-1.8 + index * 0.9, -1.3 + Math.sin(index) * 0.12, -0.2 - index * 0.08);
    rune.rotation.x = Math.PI / 2.4;
    rune.rotation.y = index * 0.32;
    return rune;
  });

  return { plane, drops, veils, runes };
}

function createLightningBranchGeometry(branchIndex: number) {
  const segments: number[] = [];
  let x = -0.18 + seededNoise(branchIndex + 401) * 0.36;
  let y = 2.8;
  for (let index = 0; index < 10; index += 1) {
    const nextX = x + (seededNoise(branchIndex * 31 + index) - 0.5) * (index % 3 === 0 ? 0.72 : 0.38);
    const nextY = y - 0.42 - seededNoise(branchIndex * 37 + index) * 0.22;
    segments.push(x, y, 0, nextX, nextY, 0);

    if (index > 2 && index % 3 === 0) {
      const forkX = nextX + (seededNoise(branchIndex * 43 + index) - 0.5) * 1.1;
      const forkY = nextY - 0.42;
      segments.push(nextX, nextY, 0, forkX, forkY, 0);
    }

    x = nextX;
    y = nextY;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(segments, 3));
  return geometry;
}

function createLightningRig(palette: SkillPalette): LightningRig {
  const group = new THREE.Group();
  const branches = Array.from({ length: 4 }).map((_, index) => {
    const line = new THREE.LineSegments(
      createLightningBranchGeometry(index),
      new THREE.LineBasicMaterial({
        color: index % 2 === 0 ? palette.secondary : palette.primary,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    line.position.x = -0.5 + index * 0.34;
    line.position.z = -0.1 - index * 0.08;
    line.scale.setScalar(0.94 + index * 0.08);
    group.add(line);
    return line;
  });
  return { group, branches };
}

function createLotusDomainRig(palette: SkillPalette): LotusDomainRig {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.64, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: true
    })
  );
  dome.position.y = -0.94;
  dome.rotation.x = Math.PI;

  const petals = Array.from({ length: 18 }).map((_, index) => {
    const petal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.38, 1, 1),
      new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? palette.hot : palette.primary,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    const angle = (index / 18) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 1.2, -1.08 + Math.sin(index * 1.7) * 0.06, Math.sin(angle) * 0.62);
    petal.rotation.set(Math.PI / 2.7, 0, angle);
    group.add(petal);
    return petal;
  });

  const rings = Array.from({ length: 4 }).map((_, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.74 + index * 0.28, 0.006, 8, 128),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: 0.22 - index * 0.025,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.position.y = -1.1 + index * 0.06;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return ring;
  });

  group.add(dome);
  return { group, petals, rings, dome };
}

function createStarfallRig(palette: SkillPalette): StarfallRig {
  const group = new THREE.Group();
  const meteors = Array.from({ length: 11 }).map((_, index) => {
    const meteor = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15 + seededNoise(index + 1201) * 0.9, 0.035, 1, 1),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? palette.hot : palette.secondary,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    meteor.position.set(-3.8 + seededNoise(index + 1211) * 7.6, 2.6 + seededNoise(index + 1223) * 2.4, -0.8 - seededNoise(index + 1231) * 1.6);
    meteor.rotation.z = -0.72;
    group.add(meteor);
    return meteor;
  });
  return { group, meteors };
}

function createFireDragonRig(palette: SkillPalette): FireDragonRig {
  const group = new THREE.Group();

  const bodyBeads = Array.from({ length: 22 }).map((_, index) => {
    const radius = Math.max(0.042, 0.16 - index * 0.005);
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 8),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(index < 4 ? palette.hot : index < 10 ? palette.primary : palette.secondary),
        emissive: new THREE.Color(index < 8 ? "#ff4400" : palette.primary),
        emissiveIntensity: 0.72 - index * 0.024,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.96
      })
    );
    group.add(bead);
    return bead;
  });

  const mane = Array.from({ length: 8 }).map((_, index) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.28, 4),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(index % 2 === 0 ? palette.hot : palette.primary),
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(m);
    return m;
  });

  const count = 160;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seededNoise(i + 501) - 0.5) * 9.6;
    positions[i * 3 + 1] = (seededNoise(i + 509) - 0.5) * 4.8;
    positions[i * 3 + 2] = (seededNoise(i + 513) - 0.5) * 2.4;
  }
  const fireParticles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color: new THREE.Color(palette.primary),
      size: 0.072,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(fireParticles);
  return { group, bodyBeads, mane, fireParticles };
}

function createSwordRainRig(palette: SkillPalette): SwordRainRig {
  const group = new THREE.Group();

  const swords = Array.from({ length: 18 }).map((_, index) => {
    const sg = new THREE.Group();

    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.036, 1.0, 4),
      new THREE.MeshStandardMaterial({
        color: "#f0f8ff",
        emissive: new THREE.Color(palette.secondary),
        emissiveIntensity: 0.5,
        roughness: 0.12,
        metalness: 0.82,
        transparent: true,
        opacity: 0.94
      })
    );
    blade.position.y = 0.12;

    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.024, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.primary),
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    guard.position.y = -0.38;

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 1.4, 1, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.secondary),
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    glow.position.y = 0.12;

    sg.add(blade, guard, glow);

    const xPos = -4.5 + (index / 17) * 9.0 + (seededNoise(index + 907) - 0.5) * 1.2;
    const yStart = 4.0 + seededNoise(index + 911) * 2.2;
    sg.position.set(xPos, yStart, -0.4 + seededNoise(index + 921) * 0.8);
    sg.rotation.z = (seededNoise(index + 931) - 0.5) * 0.28;

    group.add(sg);
    return {
      group: sg,
      blade,
      guard,
      glow,
      speed: 1.6 + seededNoise(index + 901) * 0.8,
      phase: seededNoise(index + 941) * Math.PI * 2
    };
  });

  return { group, swords };
}

function createPetalCascadeRig(palette: SkillPalette): PetalCascadeRig {
  const group = new THREE.Group();

  const petals = Array.from({ length: 42 }).map((_, index) => {
    const w = 0.13 + seededNoise(index + 1101) * 0.11;
    const h = 0.19 + seededNoise(index + 1107) * 0.09;
    const petal = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h, 1, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(index % 4 === 0 ? palette.hot : index % 3 === 0 ? "#fce7f3" : index % 2 === 0 ? palette.primary : palette.secondary),
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    petal.position.set(
      -4.8 + seededNoise(index + 1113) * 9.6,
      2.5 + seededNoise(index + 1119) * 3.0,
      -1.4 + seededNoise(index + 1127) * 2.8
    );
    petal.rotation.set(
      seededNoise(index + 1131) * Math.PI * 2,
      seededNoise(index + 1137) * Math.PI * 2,
      seededNoise(index + 1141) * Math.PI * 2
    );
    group.add(petal);
    return petal;
  });

  return { group, petals };
}

function createDivineSealRig(palette: SkillPalette): DivineSealRig {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.hot),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const rings = Array.from({ length: 6 }).map((_, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9 + index * 0.52, 0.013 + index * 0.004, 8, 200),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(index % 2 === 0 ? palette.hot : palette.primary),
        transparent: true,
        opacity: 0.44 - index * 0.032,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return ring;
  });

  const runes = Array.from({ length: 8 }).map((_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const rune = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.44, 1, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(index % 2 === 0 ? palette.secondary : palette.hot),
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    rune.position.set(Math.cos(angle) * 1.6, Math.sin(angle) * 1.6, 0);
    rune.rotation.z = angle + Math.PI / 2;
    group.add(rune);
    return rune;
  });

  const beams = Array.from({ length: 8 }).map((_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.034, 4.8, 1, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(index % 2 === 0 ? palette.hot : palette.primary),
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    beam.position.set(Math.cos(angle) * 2.4, Math.sin(angle) * 2.4, -0.1);
    beam.rotation.z = angle + Math.PI / 2;
    group.add(beam);
    return beam;
  });

  group.add(core);
  group.position.z = -0.3;
  return { group, rings, runes, beams, core };
}

function createMorphBeanBodyGeometry() {
  const geometry = new THREE.SphereGeometry(0.24, 18, 14);
  const basePositions = geometry.attributes.position.array as Float32Array;
  const squashPositions = new Float32Array(basePositions.length);

  for (let index = 0; index < basePositions.length; index += 3) {
    squashPositions[index] = basePositions[index] * 1.1;
    squashPositions[index + 1] = basePositions[index + 1] * 0.78;
    squashPositions[index + 2] = basePositions[index + 2] * 1.08;
  }

  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(squashPositions, 3)];
  return geometry;
}

function createBeanSoldier(index: number, palette: SkillPalette): BeanSoldierRig {
  const root = new THREE.Group();
  const lane = index % 3;
  const phase = index * 0.72;
  root.position.set(-5.8 - index * 0.72, -1.95 + lane * 0.18, 0.9 - lane * 0.22);
  root.rotation.y = -0.1;

  const body = new THREE.Mesh(
    createMorphBeanBodyGeometry(),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(index % 2 === 0 ? palette.primary : "#f59e0b"),
      emissive: new THREE.Color(palette.primary),
      emissiveIntensity: 0.16,
      roughness: 0.48,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94
    })
  );
  body.scale.set(0.82, 1.18, 0.62);
  body.position.y = 0.38;

  const helmet = new THREE.Mesh(
    new THREE.ConeGeometry(0.23, 0.16, 5),
    new THREE.MeshStandardMaterial({
      color: "#7c2d12",
      emissive: "#f59e0b",
      emissiveIntensity: 0.08,
      roughness: 0.42
    })
  );
  helmet.position.y = 0.72;
  helmet.rotation.y = Math.PI / 5;

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: "#2f1606" });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), eyeMaterial);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.07, 0.48, 0.15);
  rightEye.position.set(0.07, 0.48, 0.15);

  const limbMaterial = new THREE.MeshStandardMaterial({
    color: "#7c2d12",
    emissive: "#f59e0b",
    emissiveIntensity: 0.06,
    roughness: 0.56
  });
  const legGeometry = new THREE.CapsuleGeometry(0.03, 0.18, 5, 8);
  const leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
  const rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
  leftLeg.position.set(-0.08, 0.02, 0.02);
  rightLeg.position.set(0.08, 0.02, 0.02);

  const spear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.92, 8),
    new THREE.MeshStandardMaterial({
      color: "#fef3c7",
      emissive: "#fde047",
      emissiveIntensity: 0.2,
      roughness: 0.34
    })
  );
  spear.position.set(0.25, 0.45, 0);
  spear.rotation.z = -0.1;

  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.14, 4),
    new THREE.MeshBasicMaterial({ color: "#fff7ed", transparent: true, opacity: 0.9 })
  );
  blade.position.set(0.25, 0.98, 0);
  blade.rotation.y = Math.PI / 4;

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.18, 4, 1),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(index % 2 === 0 ? palette.secondary : palette.hot),
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  banner.position.set(0.38, 0.86, 0.02);
  banner.rotation.y = -0.24;

  root.add(body, helmet, leftEye, rightEye, leftLeg, rightLeg, spear, blade, banner);
  return { root, body, leftLeg, rightLeg, spear, banner, phase, lane };
}

function createBeanSoldierParade(palette: SkillPalette): BeanSoldierParade {
  const group = new THREE.Group();
  group.position.set(0, -0.15, 0);
  group.rotation.x = -0.08;
  const soldiers = Array.from({ length: 8 }).map((_, index) => createBeanSoldier(index, palette));
  soldiers.forEach((soldier) => group.add(soldier.root));
  return { group, soldiers };
}

export function ThreeSkillEffectCanvas({ skillId, durationMs, intensity = 1 }: ThreeSkillEffectCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;

    const palette = getPalette(skillId);
    const effectPower = Math.max(1, Math.min(2.6, 0.78 + intensity * 0.32));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.domElement.className = "skill-webgl-canvas";
    container.appendChild(renderer.domElement);

    const bloomCfg = getBloomConfig(skillId, effectPower);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      bloomCfg.strength,
      bloomCfg.radius,
      bloomCfg.threshold
    );
    const afterimagePass = bloomCfg.afterimage != null ? new AfterimagePass(bloomCfg.afterimage) : null;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    if (afterimagePass) composer.addPass(afterimagePass);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const particleField = createParticleField(skillId, palette);
    const rings = createSealRings(palette);
    const beam = createSkillBeam(skillId, palette);
    const windBladeRig = skillId === "wind_blade" ? createWindBladeRig(palette) : null;
    const beanParade = skillId === "bean_soldiers" ? createBeanSoldierParade(palette) : null;
    const swordRig = skillId === "sword_flight" ? createSwordFlightRig(palette) : null;
    const rainRipple = isRainSkill(skillId) ? createRainRippleRig(palette, skillId === "celestial_rain") : null;
    const waterDragonRig = isRainSkill(skillId) ? createWaterDragonRig(palette, skillId === "celestial_rain") : null;
    const lotusDomain = skillId === "lotus_domain" ? createLotusDomainRig(palette) : null;
    const lightningRig = skillId === "heaven_thunder" ? createLightningRig(palette) : null;
    const starfallRig = skillId === "starfall" ? createStarfallRig(palette) : null;
    const fireDragonRig = skillId === "hoa_long" ? createFireDragonRig(palette) : null;
    const swordRainRig = skillId === "van_kiem" ? createSwordRainRig(palette) : null;
    const petalRig = skillId === "dao_hoa_tan" ? createPetalCascadeRig(palette) : null;
    const divineSealRig = skillId === "thien_dia_an" ? createDivineSealRig(palette) : null;
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5 + effectPower * 0.28);
    const keyLight = new THREE.DirectionalLight(new THREE.Color(palette.hot), 1.75 + effectPower * 0.35);
    const glow = new THREE.PointLight(new THREE.Color(palette.hot), 1.1 + effectPower * 0.5, 6 + effectPower * 1.6);
    keyLight.position.set(2.8, 4.2, 3.8);
    glow.position.set(0, 0.2, 2);

    scene.add(particleField, beam, ambientLight, keyLight, glow, ...rings);
    if (windBladeRig) scene.add(windBladeRig.group);
    if (beanParade) scene.add(beanParade.group);
    if (swordRig) scene.add(swordRig.group);
    if (rainRipple) scene.add(rainRipple.plane, rainRipple.drops, ...rainRipple.veils, ...rainRipple.runes);
    if (waterDragonRig) scene.add(waterDragonRig.group);
    if (lotusDomain) scene.add(lotusDomain.group);
    if (lightningRig) scene.add(lightningRig.group);
    if (starfallRig) scene.add(starfallRig.group);
    if (fireDragonRig) scene.add(fireDragonRig.group);
    if (swordRainRig) scene.add(swordRainRig.group);
    if (petalRig) scene.add(petalRig.group);
    if (divineSealRig) scene.add(divineSealRig.group);

    const particlePositions = particleField.geometry.getAttribute("position") as THREE.BufferAttribute;
    const originalPositions = new Float32Array(particlePositions.array as Float32Array);
    const startedAt = performance.now();
    let frameId = 0;
    let disposed = false;
    let lastFrameAt = 0;
    let longFrameCount = 0;

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      bloomPass.setSize(width, height);
    }

    function render(now: number) {
      if (disposed) return;
      if (document.visibilityState === "hidden") {
        dispose();
        return;
      }

      if (lastFrameAt > 0) {
        const frameDelta = now - lastFrameAt;
        longFrameCount = frameDelta > 84 ? longFrameCount + 1 : Math.max(0, longFrameCount - 1);
        if (longFrameCount >= 5) {
          dispose();
          return;
        }
      }
      lastFrameAt = now;

      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const pulse = Math.sin(progress * Math.PI);
      const time = elapsed * 0.001 * palette.speed;
      const positions = particlePositions.array as Float32Array;
      const shake =
        skillId === "sword_flight"     ? Math.sin(time * 18) * pulse * 0.022 * effectPower :
        skillId === "heaven_thunder"   ? Math.sin(time * 42) * pulse * 0.032 * effectPower :
        skillId === "celestial_rain" || skillId === "starfall" ? Math.sin(time * 12) * pulse * 0.01 * effectPower :
        skillId === "hoa_long"         ? Math.sin(time * 22) * pulse * 0.018 * effectPower :
        skillId === "van_kiem"         ? Math.sin(time * 14) * pulse * 0.012 * effectPower :
        skillId === "thien_dia_an"     ? Math.sin(time * 5.5) * pulse * 0.024 * effectPower :
        0;
      camera.position.x = shake;
      camera.position.y =
        skillId === "heaven_thunder" ? Math.cos(time * 37) * pulse * 0.022 * effectPower :
        skillId === "thien_dia_an"   ? Math.sin(time * 4.8) * pulse * 0.014 * effectPower :
        0;

      for (let index = 0; index < palette.particleCount; index += 1) {
        const offset = index * 3;
        const seed = seededNoise(index + 101);
        const wave = Math.sin(time * (1.4 + seed) + index * 0.31);
        const rain = isRainSkill(skillId);
        const rainSpeed = skillId === "celestial_rain" ? 1.95 : 1.42;
        const lane = rain ? -((time * (rainSpeed + seed * 0.85)) % 5.8) + 2.95 : wave * 0.16;
        positions[offset] = originalPositions[offset] + Math.cos(time + seed * 8) * (rain ? 0.08 : 0.22) + (skillId === "wind_blade" ? progress * 1.5 : 0);
        positions[offset + 1] = rain ? lane : originalPositions[offset + 1] + progress * 0.7 + wave * 0.1;
        positions[offset + 2] = originalPositions[offset + 2] + Math.sin(time * 0.8 + seed * 12) * 0.3;
      }
      particlePositions.needsUpdate = true;

      particleField.rotation.z = time * 0.08;
      particleField.rotation.y = Math.sin(time * 0.32) * 0.12;
      (particleField.material as THREE.PointsMaterial).opacity = Math.min(0.96, (skillId === "heaven_thunder" ? 0.86 : 0.58 + effectPower * 0.08) * pulse);

      rings.forEach((ring, index) => {
        ring.rotation.z += (0.004 + index * 0.002) * palette.speed;
        ring.rotation.x += index % 2 === 0 ? 0.0018 : -0.0016;
        ring.scale.setScalar(0.78 + pulse * (0.28 + effectPower * 0.12) + index * 0.08);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.2 + effectPower * 0.04 - index * 0.026) * pulse);
      });

      if (isRainSkill(skillId)) {
        beam.scale.set(1 + pulse * 0.04 * effectPower, 1 + pulse * 0.1 * effectPower, 1);
        beam.position.y = 0.12 + Math.sin(time * 0.8) * (skillId === "celestial_rain" ? 0.08 : 0.04);
      } else if (skillId === "lotus_domain") {
        beam.scale.set(1 + pulse * 0.5 * effectPower, 1 + pulse * 0.86 * effectPower, 1);
        beam.position.y = -1.2 + Math.sin(time * 1.2) * 0.04;
      } else if (skillId === "heaven_thunder") {
        beam.scale.set(0.68 + pulse * 0.38 * effectPower, 1.08 + pulse * 0.82 * effectPower, 1);
        beam.rotation.z = Math.PI / 2 + Math.sin(time * 10) * 0.08;
      } else if (skillId === "van_kiem") {
        beam.position.y = 2.8 + Math.sin(time * 0.7) * 0.06;
        beam.scale.set(1 + pulse * 0.04 * effectPower, 1 + pulse * 0.1 * effectPower, 1);
      } else if (skillId === "dao_hoa_tan" || skillId === "thien_dia_an") {
        beam.scale.set(1 + pulse * 0.14 * effectPower, 1 + pulse * 0.14 * effectPower, 1);
        beam.position.z = -1.0 + Math.sin(time * 1.2) * 0.04;
      } else {
        beam.position.x = -4.8 + progress * 9.8;
        beam.scale.set(1 + pulse * 0.45 * effectPower, 1 + pulse * 0.9 * effectPower, 1);
      }
      const beamBaseOpacity =
        isRainSkill(skillId) ? (skillId === "celestial_rain" ? 0.18 : 0.12) :
        skillId === "lotus_domain" ? 0.16 :
        skillId === "van_kiem" ? 0.18 :
        skillId === "dao_hoa_tan" ? 0.1 :
        skillId === "thien_dia_an" ? 0.22 :
        0.38;
      (beam.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, beamBaseOpacity * pulse * effectPower);
      glow.intensity = 0.45 + pulse * 1.42 * effectPower;

      if (windBladeRig) {
        const slash = Math.min(1, progress * 1.08);
        windBladeRig.group.position.x = -5.6 + slash * 11.2;
        windBladeRig.group.position.y = 0.04 + Math.sin(time * 3.2) * 0.2;
        windBladeRig.group.rotation.z = -0.1 + Math.sin(time * 4.4) * 0.08;
        windBladeRig.blades.forEach((blade, index) => {
          blade.rotation.z += (0.055 + index * 0.01) * effectPower;
          blade.rotation.y = 0.24 + Math.sin(time * 2 + index) * 0.22;
          blade.scale.x = 1.4 + pulse * 0.7 + index * 0.13;
          (blade.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.28 + effectPower * 0.08 - index * 0.032) * pulse);
        });
      }

      if (beanParade) {
        beanParade.group.position.x = progress * 3.8;
        beanParade.group.rotation.y = Math.sin(time * 0.65) * 0.08;
        beanParade.soldiers.forEach((soldier) => {
          const stride = time * 8.2 + soldier.phase;
          const bob = Math.abs(Math.sin(stride)) * 0.13;
          soldier.root.position.x = -5.8 - soldier.phase * 0.9 + progress * 10.8;
          soldier.root.position.y = -1.95 + soldier.lane * 0.18 + bob;
          soldier.root.rotation.z = Math.sin(stride) * 0.08;
          if (soldier.body.morphTargetInfluences) {
            soldier.body.morphTargetInfluences[0] = 0.18 + Math.abs(Math.sin(stride)) * 0.64;
          }
          soldier.leftLeg.rotation.x = Math.sin(stride) * 0.78;
          soldier.rightLeg.rotation.x = -Math.sin(stride) * 0.78;
          soldier.spear.rotation.z = -0.1 + Math.sin(stride + 0.4) * 0.1;
          soldier.banner.rotation.y = -0.25 + Math.sin(stride * 1.3) * 0.34;
          soldier.banner.scale.x = 0.9 + Math.sin(stride * 1.6) * 0.12;
        });
      }

      if (swordRig) {
        const flight = Math.min(1, progress * 1.08);
        swordRig.group.position.x = -5.4 + flight * 11.4;
        swordRig.group.position.y = 0.68 + Math.sin(time * 4.2) * 0.18;
        swordRig.group.rotation.z = -0.14 + Math.sin(time * 5.2) * 0.08;
        swordRig.blade.rotation.x = time * 1.8;
        (swordRig.trail.material as THREE.MeshBasicMaterial).opacity = 0.44 * pulse;
        swordRig.afterimages.forEach((image, index) => {
          image.position.x = -1.2 - index * 0.55 - Math.sin(time * 3 + index) * 0.18;
          (image.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.28 - index * 0.06) * pulse);
        });
      }

      if (rainRipple) {
        rainRipple.plane.material.uniforms.uTime.value = time;
        rainRipple.plane.material.uniforms.uProgress.value = progress;
        rainRipple.drops.rotation.z = Math.sin(time * 0.2) * (skillId === "celestial_rain" ? 0.08 : 0.04);
        const dropPositions = rainRipple.drops.geometry.getAttribute("position") as THREE.BufferAttribute;
        const dropArray = dropPositions.array as Float32Array;
        for (let index = 0; index < dropArray.length; index += 3) {
          dropArray[index + 1] -= (skillId === "celestial_rain" ? 0.07 : 0.048) + seededNoise(index + 613) * 0.026;
          if (dropArray[index + 1] < -2.45) dropArray[index + 1] = 2.5;
        }
        dropPositions.needsUpdate = true;
        rainRipple.drops.material.opacity = (skillId === "celestial_rain" ? 0.84 : 0.66) * pulse;
        rainRipple.veils.forEach((veil, index) => {
          veil.position.y = 0.1 + Math.sin(time * (0.7 + index * 0.04) + index) * 0.18;
          veil.scale.y = 0.86 + pulse * 0.24 + Math.sin(time * 1.8 + index) * 0.04;
          (veil.material as THREE.MeshBasicMaterial).opacity = Math.min(0.58, (skillId === "celestial_rain" ? 0.2 : 0.14) * pulse * effectPower * (0.72 + seededNoise(index + 751) * 0.32));
        });
        rainRipple.runes.forEach((rune, index) => {
          rune.rotation.z += (index % 2 === 0 ? 0.006 : -0.005) * (skillId === "celestial_rain" ? 1.8 : 1);
          rune.scale.setScalar(0.78 + pulse * (skillId === "celestial_rain" ? 0.38 : 0.24) * effectPower + index * 0.05);
          (rune.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (skillId === "celestial_rain" ? 0.26 : 0.18) * pulse * effectPower - index * 0.018);
        });
      }

      if (waterDragonRig) {
        const majestic = skillId === "celestial_rain";
        const radius = majestic ? 1.42 : 1.02;
        const length = majestic ? 5.4 : 3.9;
        waterDragonRig.group.rotation.y = Math.sin(time * 0.35) * 0.32;
        waterDragonRig.group.rotation.z = Math.sin(time * 0.26) * 0.08;
        waterDragonRig.beads.forEach((bead, index) => {
          const t = index / Math.max(1, waterDragonRig.beads.length - 1);
          const angle = time * (majestic ? 2.4 : 1.75) + t * Math.PI * (majestic ? 4.8 : 3.6);
          const taper = 1 - Math.abs(t - 0.5) * 0.62;
          bead.position.x = -length / 2 + t * length;
          bead.position.y = -0.22 + Math.sin(angle) * radius * 0.34 * taper;
          bead.position.z = Math.cos(angle) * radius * 0.42 * taper;
          bead.scale.setScalar((majestic ? 0.92 : 0.74) + pulse * (majestic ? 0.72 : 0.42) + Math.sin(angle) * 0.08);
          (bead.material as THREE.MeshBasicMaterial).opacity = Math.min(0.82, (majestic ? 0.34 : 0.24) * effectPower * pulse * (0.78 + taper * 0.24));
        });

        const head = waterDragonRig.beads[waterDragonRig.beads.length - 1];
        waterDragonRig.whiskers.forEach((whisker, index) => {
          const positions = whisker.geometry.getAttribute("position") as THREE.BufferAttribute;
          const array = positions.array as Float32Array;
          for (let segment = 0; segment < 3; segment += 1) {
            const offset = segment * 6;
            const side = index % 2 === 0 ? 1 : -1;
            const curl = Math.sin(time * 3 + segment + index) * 0.1;
            array[offset] = head.position.x;
            array[offset + 1] = head.position.y + side * 0.04;
            array[offset + 2] = head.position.z;
            array[offset + 3] = head.position.x + 0.35 + segment * 0.28;
            array[offset + 4] = head.position.y + side * (0.12 + segment * 0.08) + curl;
            array[offset + 5] = head.position.z + side * (0.08 + segment * 0.04);
          }
          positions.needsUpdate = true;
          whisker.material.opacity = Math.min(0.7, (majestic ? 0.3 : 0.18) * effectPower * pulse);
        });
      }

      if (lotusDomain) {
        lotusDomain.group.rotation.y = Math.sin(time * 0.22) * 0.12;
        lotusDomain.dome.rotation.z = time * 0.08;
        lotusDomain.dome.material.opacity = 0.06 + pulse * 0.09;
        lotusDomain.petals.forEach((petal, index) => {
          const angle = (index / lotusDomain.petals.length) * Math.PI * 2 + time * 0.42;
          petal.position.x = Math.cos(angle) * (1.12 + pulse * 0.18);
          petal.position.z = Math.sin(angle) * (0.58 + pulse * 0.12);
          petal.position.y = -1.04 + Math.sin(time * 1.8 + index) * 0.08;
          petal.rotation.z = angle + Math.sin(time + index) * 0.12;
          (petal.material as THREE.MeshBasicMaterial).opacity = (0.22 + pulse * 0.34) * (index % 2 === 0 ? 1 : 0.76);
        });
        lotusDomain.rings.forEach((ring, index) => {
          ring.rotation.z += (index % 2 === 0 ? 0.006 : -0.005);
          ring.scale.setScalar(0.88 + pulse * 0.32 + index * 0.08);
          (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.2 - index * 0.025) * pulse);
        });
      }

      if (lightningRig) {
        lightningRig.branches.forEach((branch, index) => {
          const strobe = Math.max(0, Math.sin(time * (8.4 + index * 1.8) + index) - 0.22);
          branch.material.opacity = Math.min(1, strobe * pulse * (index === 0 ? 1 : 0.64));
          branch.scale.x = 0.86 + strobe * 0.28;
          branch.position.x = -0.5 + index * 0.34 + Math.sin(time * 18 + index) * 0.025;
        });
      }

      if (starfallRig) {
        starfallRig.group.rotation.z = Math.sin(time * 0.2) * 0.03;
        starfallRig.meteors.forEach((meteor, index) => {
          const speed = 1.6 + seededNoise(index + 1301) * 0.9;
          meteor.position.x += speed * 0.035;
          meteor.position.y -= speed * 0.03;
          if (meteor.position.y < -2.8 || meteor.position.x > 4.8) {
            meteor.position.x = -4.8 - seededNoise(index + 1311) * 1.8;
            meteor.position.y = 2.2 + seededNoise(index + 1321) * 2.2;
          }
          meteor.scale.x = 0.8 + pulse * 0.6 + Math.sin(time * 3 + index) * 0.08;
          (meteor.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, (0.16 + pulse * 0.32 * effectPower) * (0.75 + seededNoise(index + 1331) * 0.25));
        });
      }

      if (fireDragonRig) {
        const totalBeads = fireDragonRig.bodyBeads.length;
        const headX = -5.6 + progress * 12.4;
        fireDragonRig.bodyBeads.forEach((bead, index) => {
          const t = index / (totalBeads - 1);
          const tLocal = time * 2.4 - t * 1.2;
          bead.position.x = headX - t * 3.8;
          bead.position.y = Math.sin(tLocal) * 0.78 * pulse;
          bead.position.z = Math.cos(tLocal * 0.7) * 0.28;
          const sc = Math.max(0.1, (1 - t * 0.6) * (0.6 + pulse * 0.58));
          bead.scale.setScalar(sc);
          (bead.material as THREE.MeshStandardMaterial).emissiveIntensity = (0.7 - t * 0.02) * (0.5 + pulse * 0.9);
          (bead.material as THREE.MeshStandardMaterial).opacity = Math.min(0.98, (1 - t * 0.42) * pulse);
        });
        const headBead = fireDragonRig.bodyBeads[0];
        fireDragonRig.mane.forEach((m, index) => {
          const mAngle = (index / fireDragonRig.mane.length) * Math.PI * 2 + time * 3.2;
          m.position.x = headBead.position.x + Math.cos(mAngle) * 0.22;
          m.position.y = headBead.position.y + Math.sin(mAngle) * 0.2;
          m.position.z = headBead.position.z + 0.08;
          m.rotation.z = mAngle + Math.PI;
          m.scale.setScalar(0.48 + pulse * 0.82);
          (m.material as THREE.MeshBasicMaterial).opacity = 0.52 + pulse * 0.48;
        });
        const fPos = fireDragonRig.fireParticles.geometry.getAttribute("position") as THREE.BufferAttribute;
        const fArr = fPos.array as Float32Array;
        for (let i = 0; i < fArr.length; i += 3) {
          fArr[i + 1] += 0.022 + seededNoise(i + 503) * 0.016;
          if (Math.abs(fArr[i] - headX) > 4.4 || fArr[i + 1] > 2.6) {
            fArr[i] = headX + (seededNoise(i + 521) - 0.5) * 2.4;
            fArr[i + 1] = headBead.position.y + (seededNoise(i + 527) - 0.5) * 0.8;
          }
        }
        fPos.needsUpdate = true;
        (fireDragonRig.fireParticles.material as THREE.PointsMaterial).opacity = 0.68 * pulse * effectPower;
      }

      if (swordRainRig) {
        swordRainRig.swords.forEach((sword) => {
          sword.group.position.y -= sword.speed * 0.022;
          sword.group.position.x += Math.sin(time * 1.4 + sword.phase) * 0.007;
          if (sword.group.position.y < -3.6) {
            sword.group.position.y = 4.2 + seededNoise(Math.floor(sword.phase * 100)) * 1.8;
          }
          const impactGlow = sword.group.position.y < -1.8 ? Math.max(0, 1 - (sword.group.position.y + 3.6) / 1.8) * 0.6 : 0;
          (sword.blade.material as THREE.MeshStandardMaterial).opacity = Math.min(0.96, (0.58 + impactGlow) * pulse);
          (sword.glow.material as THREE.MeshBasicMaterial).opacity = (0.44 + impactGlow * 0.5) * pulse;
          (sword.guard.material as THREE.MeshBasicMaterial).opacity = (0.7 + impactGlow) * pulse;
        });
      }

      if (petalRig) {
        petalRig.petals.forEach((petal, index) => {
          const seed = seededNoise(index + 1101);
          const speed = 0.016 + seed * 0.011;
          const drift = Math.sin(time * (0.7 + seed * 0.5) + index * 1.1) * 0.007;
          petal.position.y -= speed;
          petal.position.x += drift;
          if (petal.position.y < -2.9) {
            petal.position.y = 2.8 + seededNoise(index + 1201) * 1.5;
            petal.position.x = -4.8 + seededNoise(index + 1207) * 9.6;
          }
          petal.rotation.x += (0.006 + seed * 0.004) * (index % 2 === 0 ? 1 : -1);
          petal.rotation.y += 0.009 + seed * 0.005;
          petal.rotation.z += 0.004 + seed * 0.003;
          (petal.material as THREE.MeshBasicMaterial).opacity = (0.3 + pulse * 0.3) * (0.68 + seed * 0.32);
        });
      }

      if (divineSealRig) {
        const t = progress;
        const sealPulse = t < 0.14 ? t / 0.14 : t > 0.86 ? (1 - t) / 0.14 : 1.0;
        const sealScale = 0.18 + sealPulse * (1.62 + effectPower * 0.44);
        divineSealRig.group.scale.setScalar(sealScale);
        divineSealRig.group.rotation.z = time * 0.18;
        (divineSealRig.core.material as THREE.MeshBasicMaterial).opacity = Math.min(0.96, sealPulse * effectPower * 0.88);
        divineSealRig.core.scale.setScalar(1 + Math.sin(time * 3.6) * 0.14 * sealPulse);
        divineSealRig.rings.forEach((ring, index) => {
          ring.rotation.z += (0.01 + index * 0.003) * (index % 2 === 0 ? 1 : -1) * effectPower;
          ring.scale.setScalar(0.88 + sealPulse * (0.26 + index * 0.04));
          (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (0.38 - index * 0.03) * sealPulse * effectPower);
        });
        divineSealRig.runes.forEach((rune, index) => {
          const angle = (index / 8) * Math.PI * 2 + time * 0.38;
          const radius = 1.56 + sealPulse * 0.22;
          rune.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
          rune.rotation.z = angle + Math.PI / 2 + time * 0.2;
          (rune.material as THREE.MeshBasicMaterial).opacity = (0.52 + sealPulse * 0.48) * (0.7 + seededNoise(index + 1401) * 0.3);
        });
        divineSealRig.beams.forEach((beam, index) => {
          const angle = (index / 8) * Math.PI * 2 + time * 0.18;
          beam.position.set(Math.cos(angle) * 2.4, Math.sin(angle) * 2.4, -0.1);
          beam.rotation.z = angle + Math.PI / 2;
          beam.scale.y = 0.72 + sealPulse * (0.52 + effectPower * 0.22) + Math.sin(time * 2.8 + index) * 0.06;
          (beam.material as THREE.MeshBasicMaterial).opacity = Math.min(0.54, (0.22 + sealPulse * 0.34 * effectPower) * (0.6 + seededNoise(index + 1411) * 0.4));
        });
      }

      composer.render();
      if (progress >= 1) {
        // Render loop ends here; GPU cleanup deferred to component unmount
        // so the canvas stays in DOM while the CSS lifecycle fade-out completes.
        return;
      }
      frameId = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize);
    frameId = window.requestAnimationFrame(render);

    function dispose() {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      composer.dispose();
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.isConnected) renderer.domElement.remove();
    }

    return () => {
      dispose();
    };
  }, [durationMs, intensity, skillId]);

  return <div className={`skill-webgl-scene skill-webgl-scene-${skillId}`} ref={hostRef} />;
}
