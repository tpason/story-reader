"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, CatmullRomCurve3, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, Scene, ShaderMaterial, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3, WebGLRenderer } from "three";
import { canUseWebGL } from "@/lib/webgl-capability";
import { getSkillBloomConfig, getSkillWebglPalette, scaleSkillPalette, type SkillPalette } from "@/lib/skill-webgl-palettes";
import { seededNoise, getSoftParticleTexture } from "@/lib/skill-webgl-utils";
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

type BeanSoldierRig = {
  root: Group;
  body: Mesh<BufferGeometry, MeshStandardMaterial>;
  leftLeg: Mesh;
  rightLeg: Mesh;
  spear: Mesh;
  banner: Mesh;
  phase: number;
  lane: number;
};

type BeanSoldierParade = {
  group: Group;
  soldiers: BeanSoldierRig[];
};

type SwordFlightRig = {
  group: Group;
  blade: Mesh;
  trail: Mesh;
  aura: Mesh;
  afterimages: Mesh[];
};

type JianSwordParts = {
  group: Group;
  blade: Mesh;
  aura: Mesh;
};

/** Tapered jian blade — extruded profile instead of a 4-sided cone. */
function createJianBladeGeometry(length = 1.18, halfWidth = 0.058) {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(halfWidth * 0.42, 0);
  shape.lineTo(halfWidth, length * 0.14);
  shape.lineTo(halfWidth * 0.62, length);
  shape.lineTo(-halfWidth * 0.62, length);
  shape.lineTo(-halfWidth, length * 0.14);
  shape.lineTo(-halfWidth * 0.42, 0);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 3,
  });
  geometry.center();
  geometry.rotateZ(-Math.PI / 2);
  geometry.translate(length * 0.08, 0, 0);
  return geometry;
}

function buildJianSwordParts(palette: SkillPalette, scale = 1): JianSwordParts {
  const group = new Group();
  const bladeMat = new MeshStandardMaterial({
    color: "#f6f9ff",
    emissive: new Color(palette.secondary),
    emissiveIntensity: 0.62,
    roughness: 0.06,
    metalness: 0.94,
    transparent: true,
    opacity: 0.98,
  });
  const blade = new Mesh(createJianBladeGeometry(1.16 * scale, 0.056 * scale), bladeMat);

  const ridge = new Mesh(
    new BoxGeometry(1.02 * scale, 0.007 * scale, 0.007 * scale),
    new MeshBasicMaterial({
      color: palette.hot,
      transparent: true,
      opacity: 0.78,
      blending: AdditiveBlending,
      depthWrite: false,
    })
  );
  ridge.position.set(0.42 * scale, 0, 0.014 * scale);

  const guard = new Mesh(
    new BoxGeometry(0.055 * scale, 0.34 * scale, 0.038 * scale),
    new MeshStandardMaterial({
      color: palette.primary,
      emissive: new Color(palette.primary),
      emissiveIntensity: 0.28,
      roughness: 0.28,
      metalness: 0.72,
    })
  );
  guard.position.set(-0.74 * scale, 0, 0);

  const handle = new Mesh(
    new CylinderGeometry(0.03 * scale, 0.03 * scale, 0.46 * scale, 12),
    new MeshStandardMaterial({
      color: "#2a1438",
      emissive: new Color(palette.primary),
      emissiveIntensity: 0.14,
      roughness: 0.5,
      metalness: 0.12,
    })
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-1.02 * scale, 0, 0);

  const pommel = new Mesh(
    new SphereGeometry(0.04 * scale, 12, 10),
    new MeshStandardMaterial({
      color: palette.hot,
      emissive: new Color(palette.hot),
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.55,
    })
  );
  pommel.position.set(-1.28 * scale, 0, 0);

  const tassel = new Mesh(
    new PlaneGeometry(0.05 * scale, 0.22 * scale, 1, 1),
    new MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false,
    })
  );
  tassel.position.set(-1.34 * scale, -0.1 * scale, 0.02 * scale);
  tassel.rotation.z = 0.22;

  const aura = new Mesh(
    new PlaneGeometry(2.6 * scale, 0.56 * scale, 1, 1),
    new MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.32,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false,
    })
  );
  aura.position.set(0.12 * scale, 0, -0.04 * scale);

  group.add(aura, ridge, blade, guard, handle, pommel, tassel);
  return { group, blade, aura };
}

type WindBladeRig = {
  group: Group;
  blades: Mesh[];
  speedLines: Mesh[];
};

type RainRippleRig = {
  plane: Mesh<PlaneGeometry, ShaderMaterial>;
  drops: Points<BufferGeometry, PointsMaterial>;
  veils: Mesh[];
  runes: Mesh[];
};

type WaterDragonRig = {
  group: Group;
  body: Mesh;
  head: Mesh;
  pointCount: number;
  majestic: boolean;
  whiskers: LineSegments<BufferGeometry, LineBasicMaterial>[];
};

type LightningRig = {
  group: Group;
  branches: LineSegments<BufferGeometry, LineBasicMaterial>[];
  glows: Mesh[];
  flash: Mesh;
};

type LotusDomainRig = {
  group: Group;
  petals: Mesh[];
  rings: Mesh[];
  dome: Mesh<SphereGeometry, MeshBasicMaterial>;
};

type StarfallMeteor = {
  group: Group;
  head: Mesh;
  trail: Mesh;
};

type StarfallRig = {
  group: Group;
  meteors: StarfallMeteor[];
};

type FireDragonRig = {
  group: Group;
  body: Mesh;
  head: Mesh;
  pointCount: number;
  mane: Mesh[];
  fireParticles: Points;
};

type SwordRainRig = {
  group: Group;
  blades: InstancedMesh;
  glows: InstancedMesh;
  count: number;
  speeds: Float32Array;
  phases: Float32Array;
  dummy: Object3D;
};

type PetalCascadeRig = {
  group: Group;
  petals: Mesh[];
};

type DivineSealRig = {
  group: Group;
  rings: Mesh[];
  runes: Mesh[];
  beams: Mesh[];
  core: Mesh;
};

function isRainSkill(skillId: string) {
  return skillId === "summon_rain" || skillId === "celestial_rain";
}

function createParticleField(skillId: string, palette: SkillPalette) {
  const geometry = new BufferGeometry();
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

  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new BufferAttribute(seeds, 1));

  const softMap = getSoftParticleTexture();
  const material = new PointsMaterial({
    color: new Color(palette.primary),
    map: softMap ?? undefined,
    size: isRainSkill(skillId) ? 0.048 : 0.078,
    sizeAttenuation: true,
    transparent: true,
    opacity: skillId === "heaven_thunder" ? 0.92 : 0.72,
    blending: AdditiveBlending,
    depthWrite: false,
    alphaTest: softMap ? 0.01 : 0,
  });

  return new Points(geometry, material);
}

function createWindCrescentGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.55, 0.42, 1.35, 0.12);
  shape.quadraticCurveTo(0.95, 0.28, 0.42, 0.16);
  shape.quadraticCurveTo(0.18, 0.08, 0, 0);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geometry.center();
  return geometry;
}

function createPetalLeafGeometry() {
  const shape = new Shape();
  shape.moveTo(0, -0.48);
  shape.quadraticCurveTo(0.32, -0.08, 0.26, 0.4);
  shape.quadraticCurveTo(0, 0.58, -0.26, 0.4);
  shape.quadraticCurveTo(-0.32, -0.08, 0, -0.48);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.01,
    bevelEnabled: false,
  });
  geometry.center();
  return geometry;
}

function createSealRings(palette: SkillPalette) {
  return Array.from({ length: palette.ringCount }).map((_, index) => {
    const geometry = new TorusGeometry(0.72 + index * 0.38, 0.006 + index * 0.002, 8, 132);
    const material = new MeshBasicMaterial({
      color: new Color(index % 2 === 0 ? palette.primary : palette.secondary),
      transparent: true,
      opacity: 0.28 - index * 0.026,
      blending: AdditiveBlending,
      depthWrite: false
    });
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2.7 + index * 0.15;
    mesh.rotation.y = index * 0.42;
    return mesh;
  });
}

function createSkillBeam(skillId: string, palette: SkillPalette) {
  const color = new Color(
    skillId === "heaven_thunder" ? palette.hot :
    skillId === "hoa_long" ? palette.primary :
    skillId === "thien_dia_an" ? palette.hot :
    palette.secondary
  );
  const width = isRainSkill(skillId) ? (skillId === "celestial_rain" ? 5.2 : 4.4) : skillId === "lotus_domain" ? 2.8 : skillId === "heaven_thunder" ? 0.075 : skillId === "sword_flight" ? 0.045 : skillId === "hoa_long" ? 0.058 : skillId === "van_kiem" ? 2.0 : skillId === "dao_hoa_tan" ? 5.0 : skillId === "thien_dia_an" ? 5.8 : 0.025;
  const height = isRainSkill(skillId) ? 5.4 : skillId === "lotus_domain" ? 0.022 : skillId === "heaven_thunder" ? 4.4 : skillId === "van_kiem" ? 5.8 : skillId === "dao_hoa_tan" ? 5.8 : skillId === "thien_dia_an" ? 5.8 : 6.2;
  const geometry = new PlaneGeometry(height, width, 1, 1);
  const material = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: isRainSkill(skillId) ? 0.13 : skillId === "lotus_domain" ? 0.16 : skillId === "van_kiem" ? 0.18 : skillId === "dao_hoa_tan" ? 0.1 : skillId === "thien_dia_an" ? 0.22 : 0.48,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide
  });
  const beam = new Mesh(geometry, material);

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
  const group = new Group();
  group.position.set(-5.4, 0.12, 0.15);
  const crescentGeometry = createWindCrescentGeometry();

  const blades = Array.from({ length: 5 }).map((_, index) => {
    const blade = new Mesh(
      crescentGeometry,
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: 0.52 - index * 0.06,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      })
    );
    blade.position.set(-index * 0.32, -0.12 + index * 0.1, -0.12 - index * 0.06);
    blade.rotation.set(0.18, 0.35 + index * 0.08, -0.55 + index * 0.12);
    blade.scale.setScalar(1.15 + index * 0.12);
    group.add(blade);
    return blade;
  });

  const speedLines = Array.from({ length: 6 }).map((_, index) => {
    const line = new Mesh(
      new PlaneGeometry(1.4 + index * 0.22, 0.025, 1, 1),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.hot : palette.secondary,
        transparent: true,
        opacity: 0.28 - index * 0.03,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      })
    );
    line.position.set(-0.9 - index * 0.28, 0.08 + index * 0.05, -0.2);
    line.rotation.z = -0.12 + index * 0.03;
    group.add(line);
    return line;
  });

  return { group, blades, speedLines };
}

function createSwordFlightRig(palette: SkillPalette): SwordFlightRig {
  const group = new Group();
  group.position.set(-5.2, 0.72, 0.18);
  group.rotation.z = -0.1;

  const { group: sword, blade, aura } = buildJianSwordParts(palette, 1);

  const trail = new Mesh(
    new PlaneGeometry(3.1, 0.38, 1, 1),
    new MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.38,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false,
    })
  );
  trail.position.set(-1.82, 0, -0.06);
  trail.rotation.z = 0.05;

  const afterimages = Array.from({ length: 4 }).map((_, index) => {
    const image = new Mesh(
      new PlaneGeometry(2.0 + index * 0.38, 0.05, 1, 1),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: 0.26 - index * 0.05,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      })
    );
    image.position.set(-1.28 - index * 0.52, -0.12 + index * 0.07, -0.03 - index * 0.04);
    return image;
  });

  group.add(trail, sword, ...afterimages);
  return { group, blade, trail, aura, afterimages };
}

function sampleWaterDragonPoints(count: number, time: number, majestic: boolean): Vector3[] {
  const radius = majestic ? 1.42 : 1.02;
  const length = majestic ? 5.4 : 3.9;
  const points: Vector3[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / Math.max(1, count - 1);
    const angle = time * (majestic ? 2.4 : 1.75) + t * Math.PI * (majestic ? 4.8 : 3.6);
    const taper = 1 - Math.abs(t - 0.5) * 0.62;
    points.push(
      new Vector3(
        -length / 2 + t * length,
        -0.22 + Math.sin(angle) * radius * 0.34 * taper,
        Math.cos(angle) * radius * 0.42 * taper
      )
    );
  }
  return points;
}

function sampleFireDragonPoints(count: number, time: number, headX: number, pulse: number): Vector3[] {
  const points: Vector3[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / Math.max(1, count - 1);
    const tLocal = time * 2.4 - t * 1.2;
    points.push(
      new Vector3(
        headX - t * 3.8,
        Math.sin(tLocal) * 0.78 * pulse,
        Math.cos(tLocal * 0.7) * 0.28
      )
    );
  }
  return points;
}

function rebuildTubeMesh(
  mesh: Mesh,
  points: Vector3[],
  tubularSegments: number,
  radius: number,
  radialSegments: number
) {
  if (points.length < 2) return;
  const next = new TubeGeometry(new CatmullRomCurve3(points), tubularSegments, radius, radialSegments, false);
  mesh.geometry.dispose();
  mesh.geometry = next;
}

function createWaterDragonRig(palette: SkillPalette, majestic = false): WaterDragonRig {
  const group = new Group();
  const pointCount = majestic ? 24 : 16;
  const points = sampleWaterDragonPoints(pointCount, 0, majestic);
  const bodyRadius = majestic ? 0.09 : 0.062;
  const body = new Mesh(
    new TubeGeometry(new CatmullRomCurve3(points), majestic ? 72 : 52, bodyRadius, 8, false),
    new MeshBasicMaterial({
      color: palette.primary,
      transparent: true,
      opacity: majestic ? 0.42 : 0.32,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(body);

  const head = new Mesh(
    new SphereGeometry(majestic ? 0.14 : 0.1, 16, 12),
    new MeshBasicMaterial({
      color: palette.hot,
      transparent: true,
      opacity: majestic ? 0.72 : 0.58,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );
  const tip = points[points.length - 1];
  head.position.copy(tip);
  group.add(head);

  const whiskers = Array.from({ length: majestic ? 4 : 2 }).map((_, index) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(new Array(18).fill(0), 3));
    const line = new LineSegments(
      geometry,
      new LineBasicMaterial({
        color: index % 2 === 0 ? palette.hot : palette.secondary,
        transparent: true,
        opacity: 0.28,
        blending: AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(line);
    return line;
  });

  group.position.set(0, -0.28, 0.35);
  return { group, body, head, pointCount, majestic, whiskers };
}

function createRainRippleRig(palette: SkillPalette, majestic = false): RainRippleRig {
  const plane = new Mesh(
    new PlaneGeometry(9.2, 4.8, 1, 1),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new Color(palette.secondary) }
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
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const drops = new Points(
    geometry,
    new PointsMaterial({
      color: palette.primary,
      size: 0.032,
      transparent: true,
      opacity: 0.64,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );

  const veilCount = majestic ? 14 : 9;
  const veils = Array.from({ length: veilCount }).map((_, index) => {
    const width = 0.018 + seededNoise(index + 711) * 0.018;
    const height = 4.8 + seededNoise(index + 719) * 1.2;
    const veil = new Mesh(
      new PlaneGeometry(width, height, 1, 1),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: majestic ? 0.28 : 0.2,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide
      })
    );
    veil.position.set(-4.2 + (index / Math.max(1, veilCount - 1)) * 8.4, 0.1 + seededNoise(index + 727) * 0.8, -0.6 - seededNoise(index + 733) * 1.1);
    veil.rotation.z = (seededNoise(index + 739) - 0.5) * 0.08;
    return veil;
  });

  const runes = Array.from({ length: majestic ? 5 : 3 }).map((_, index) => {
    const rune = new Mesh(
      new TorusGeometry(0.38 + index * 0.18, 0.004, 8, 96),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.secondary : palette.hot,
        transparent: true,
        opacity: 0.22,
        blending: AdditiveBlending,
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

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(segments, 3));
  return geometry;
}

function createLightningRig(palette: SkillPalette): LightningRig {
  const group = new Group();
  const branches = Array.from({ length: 6 }).map((_, index) => {
    const line = new LineSegments(
      createLightningBranchGeometry(index),
      new LineBasicMaterial({
        color: index % 2 === 0 ? palette.secondary : palette.primary,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false
      })
    );
    line.position.x = -0.5 + index * 0.34;
    line.position.z = -0.1 - index * 0.08;
    line.scale.setScalar(0.94 + index * 0.08);
    group.add(line);
    return line;
  });

  const glows = Array.from({ length: 4 }).map((_, index) => {
    const glow = new Mesh(
      new PlaneGeometry(0.18 + index * 0.04, 3.6 + index * 0.3, 1, 1),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.hot : palette.secondary,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      })
    );
    glow.position.set(-0.35 + index * 0.42, 0.55, -0.2 - index * 0.05);
    glow.rotation.z = (seededNoise(index + 401) - 0.5) * 0.2;
    group.add(glow);
    return glow;
  });

  const flash = new Mesh(
    new PlaneGeometry(14, 8, 1, 1),
    new MeshBasicMaterial({
      color: palette.hot,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
  );
  flash.position.set(0, 0.4, -1.6);
  group.add(flash);

  return { group, branches, glows, flash };
}

function createLotusDomainRig(palette: SkillPalette): LotusDomainRig {
  const group = new Group();
  const dome = new Mesh(
    new SphereGeometry(1.64, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.08,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false,
      wireframe: true
    })
  );
  dome.position.y = -0.94;
  dome.rotation.x = Math.PI;

  const petals = Array.from({ length: 22 }).map((_, index) => {
    const petal = new Mesh(
      new PlaneGeometry(0.16, 0.38, 1, 1),
      new MeshBasicMaterial({
        color: index % 3 === 0 ? palette.hot : palette.primary,
        transparent: true,
        opacity: 0.42,
        blending: AdditiveBlending,
        side: DoubleSide,
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
    const ring = new Mesh(
      new TorusGeometry(0.74 + index * 0.28, 0.006, 8, 128),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.secondary,
        transparent: true,
        opacity: 0.22 - index * 0.025,
        blending: AdditiveBlending,
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
  const group = new Group();
  const meteors = Array.from({ length: 14 }).map((_, index) => {
    const meteorGroup = new Group();
    const head = new Mesh(
      new SphereGeometry(0.05 + seededNoise(index + 1201) * 0.03, 10, 8),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.hot : palette.secondary,
        transparent: true,
        opacity: 0.92,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    const trail = new Mesh(
      new PlaneGeometry(1.35 + seededNoise(index + 1205) * 0.7, 0.07, 1, 1),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? palette.primary : palette.hot,
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      })
    );
    trail.position.set(-0.72, 0, 0);
    trail.rotation.z = 0.05;
    meteorGroup.add(trail, head);
    meteorGroup.position.set(
      -3.8 + seededNoise(index + 1211) * 7.6,
      2.6 + seededNoise(index + 1223) * 2.4,
      -0.8 - seededNoise(index + 1231) * 1.6
    );
    meteorGroup.rotation.z = -0.72;
    group.add(meteorGroup);
    return { group: meteorGroup, head, trail };
  });
  return { group, meteors };
}

function createFireDragonRig(palette: SkillPalette): FireDragonRig {
  const group = new Group();
  const pointCount = 18;
  const points = sampleFireDragonPoints(pointCount, 0, -5.6, 1);
  const body = new Mesh(
    new TubeGeometry(new CatmullRomCurve3(points), 64, 0.11, 8, false),
    new MeshStandardMaterial({
      color: new Color(palette.primary),
      emissive: new Color("#ff4400"),
      emissiveIntensity: 0.78,
      roughness: 0.28,
      metalness: 0.12,
      transparent: true,
      opacity: 0.96
    })
  );
  group.add(body);

  const head = new Mesh(
    new SphereGeometry(0.18, 14, 10),
    new MeshStandardMaterial({
      color: new Color(palette.hot),
      emissive: new Color(palette.hot),
      emissiveIntensity: 0.9,
      roughness: 0.22,
      metalness: 0.18,
      transparent: true,
      opacity: 0.98
    })
  );
  head.position.copy(points[0]);
  group.add(head);

  const mane = Array.from({ length: 10 }).map((_, index) => {
    const m = new Mesh(
      new ConeGeometry(0.056, 0.28, 4),
      new MeshBasicMaterial({
        color: new Color(index % 2 === 0 ? palette.hot : palette.primary),
        transparent: true,
        opacity: 0.78,
        blending: AdditiveBlending,
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
  const softMap = getSoftParticleTexture();
  const fireParticles = new Points(
    new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3)),
    new PointsMaterial({
      color: new Color(palette.primary),
      map: softMap ?? undefined,
      size: 0.072,
      transparent: true,
      opacity: 0.82,
      blending: AdditiveBlending,
      depthWrite: false,
      ...(softMap ? { alphaTest: 0.01 } : {})
    })
  );
  group.add(fireParticles);
  return { group, body, head, pointCount, mane, fireParticles };
}

function createSwordRainRig(palette: SkillPalette): SwordRainRig {
  const group = new Group();
  const count = 28;
  const dummy = new Object3D();
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);

  const bladeGeo = createJianBladeGeometry(0.42, 0.022);
  const blades = new InstancedMesh(
    bladeGeo,
    new MeshStandardMaterial({
      color: "#f6f9ff",
      emissive: new Color(palette.secondary),
      emissiveIntensity: 0.58,
      roughness: 0.08,
      metalness: 0.92,
      transparent: true,
      opacity: 0.96
    }),
    count
  );
  blades.instanceMatrix.setUsage(DynamicDrawUsage);

  const glows = new InstancedMesh(
    new PlaneGeometry(0.95, 0.2, 1, 1),
    new MeshBasicMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.36,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false
    }),
    count
  );
  glows.instanceMatrix.setUsage(DynamicDrawUsage);

  for (let index = 0; index < count; index += 1) {
    speeds[index] = 1.5 + seededNoise(index + 901) * 0.9;
    phases[index] = seededNoise(index + 941) * Math.PI * 2;
    const xPos = -4.8 + (index / Math.max(1, count - 1)) * 9.6 + (seededNoise(index + 907) - 0.5) * 1.5;
    const yStart = 4.2 + seededNoise(index + 911) * 2.4;
    const z = -0.4 + seededNoise(index + 921) * 0.8;
    const rotZ = (seededNoise(index + 931) - 0.5) * 0.46;
    dummy.position.set(xPos, yStart, z);
    dummy.rotation.set(0, 0, rotZ - Math.PI / 2);
    dummy.scale.setScalar(0.9 + seededNoise(index + 880) * 0.28);
    dummy.updateMatrix();
    blades.setMatrixAt(index, dummy.matrix);
    dummy.scale.set(1.15, 1.15, 1.15);
    glows.setMatrixAt(index, dummy.matrix);
  }
  blades.instanceMatrix.needsUpdate = true;
  glows.instanceMatrix.needsUpdate = true;
  group.add(blades, glows);
  return { group, blades, glows, count, speeds, phases, dummy };
}

function createPetalCascadeRig(palette: SkillPalette): PetalCascadeRig {
  const group = new Group();
  const petalGeometry = createPetalLeafGeometry();

  const petals = Array.from({ length: 48 }).map((_, index) => {
    const scale = 0.55 + seededNoise(index + 1101) * 0.55;
    const petal = new Mesh(
      petalGeometry,
      new MeshBasicMaterial({
        color: new Color(index % 4 === 0 ? palette.hot : index % 3 === 0 ? "#fce7f3" : index % 2 === 0 ? palette.primary : palette.secondary),
        transparent: true,
        opacity: 0.62,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false
      })
    );
    petal.scale.setScalar(scale);
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
  const group = new Group();

  const core = new Mesh(
    new CircleGeometry(0.36, 48),
    new MeshBasicMaterial({
      color: new Color(palette.hot),
      transparent: true,
      opacity: 0.92,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );

  const rings = Array.from({ length: 6 }).map((_, index) => {
    const ring = new Mesh(
      new TorusGeometry(0.9 + index * 0.52, 0.013 + index * 0.004, 8, 200),
      new MeshBasicMaterial({
        color: new Color(index % 2 === 0 ? palette.hot : palette.primary),
        transparent: true,
        opacity: 0.44 - index * 0.032,
        blending: AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return ring;
  });

  const runes = Array.from({ length: 8 }).map((_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const rune = new Mesh(
      new PlaneGeometry(0.22, 0.44, 1, 1),
      new MeshBasicMaterial({
        color: new Color(index % 2 === 0 ? palette.secondary : palette.hot),
        transparent: true,
        opacity: 0.72,
        blending: AdditiveBlending,
        side: DoubleSide,
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
    const beam = new Mesh(
      new PlaneGeometry(0.034, 4.8, 1, 1),
      new MeshBasicMaterial({
        color: new Color(index % 2 === 0 ? palette.hot : palette.primary),
        transparent: true,
        opacity: 0.28,
        blending: AdditiveBlending,
        side: DoubleSide,
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
  const geometry = new SphereGeometry(0.24, 18, 14);
  const basePositions = geometry.attributes.position.array as Float32Array;
  const squashPositions = new Float32Array(basePositions.length);

  for (let index = 0; index < basePositions.length; index += 3) {
    squashPositions[index] = basePositions[index] * 1.1;
    squashPositions[index + 1] = basePositions[index + 1] * 0.78;
    squashPositions[index + 2] = basePositions[index + 2] * 1.08;
  }

  geometry.morphAttributes.position = [new Float32BufferAttribute(squashPositions, 3)];
  return geometry;
}

function createBeanSoldier(index: number, palette: SkillPalette): BeanSoldierRig {
  const root = new Group();
  const lane = index % 3;
  const phase = index * 0.72;
  root.position.set(-6.2 - index * 1.05, -1.88 + lane * 0.38, 1.0 - lane * 0.28);
  root.rotation.y = -0.1;

  const body = new Mesh(
    createMorphBeanBodyGeometry(),
    new MeshStandardMaterial({
      color: new Color(index % 2 === 0 ? palette.primary : "#f59e0b"),
      emissive: new Color(palette.primary),
      emissiveIntensity: 0.16,
      roughness: 0.48,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94
    })
  );
  body.scale.set(0.82, 1.18, 0.62);
  body.position.y = 0.38;

  const helmet = new Mesh(
    new ConeGeometry(0.23, 0.16, 5),
    new MeshStandardMaterial({
      color: "#7c2d12",
      emissive: "#f59e0b",
      emissiveIntensity: 0.08,
      roughness: 0.42
    })
  );
  helmet.position.y = 0.72;
  helmet.rotation.y = Math.PI / 5;

  const eyeMaterial = new MeshBasicMaterial({ color: "#2f1606" });
  const leftEye = new Mesh(new SphereGeometry(0.024, 8, 6), eyeMaterial);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.07, 0.48, 0.15);
  rightEye.position.set(0.07, 0.48, 0.15);

  const limbMaterial = new MeshStandardMaterial({
    color: "#7c2d12",
    emissive: "#f59e0b",
    emissiveIntensity: 0.06,
    roughness: 0.56
  });
  const legGeometry = new CapsuleGeometry(0.03, 0.18, 5, 8);
  const leftLeg = new Mesh(legGeometry, limbMaterial);
  const rightLeg = new Mesh(legGeometry, limbMaterial);
  leftLeg.position.set(-0.08, 0.02, 0.02);
  rightLeg.position.set(0.08, 0.02, 0.02);

  const spear = new Mesh(
    new CylinderGeometry(0.012, 0.012, 0.92, 8),
    new MeshStandardMaterial({
      color: "#fef3c7",
      emissive: "#fde047",
      emissiveIntensity: 0.2,
      roughness: 0.34
    })
  );
  spear.position.set(0.25, 0.45, 0);
  spear.rotation.z = -0.1;

  const blade = new Mesh(
    new ConeGeometry(0.045, 0.14, 4),
    new MeshBasicMaterial({ color: "#fff7ed", transparent: true, opacity: 0.9 })
  );
  blade.position.set(0.25, 0.98, 0);
  blade.rotation.y = Math.PI / 4;

  const banner = new Mesh(
    new PlaneGeometry(0.26, 0.18, 4, 1),
    new MeshBasicMaterial({
      color: new Color(index % 2 === 0 ? palette.secondary : palette.hot),
      transparent: true,
      opacity: 0.78,
      blending: AdditiveBlending,
      side: DoubleSide,
      depthWrite: false
    })
  );
  banner.position.set(0.38, 0.86, 0.02);
  banner.rotation.y = -0.24;

  root.add(body, helmet, leftEye, rightEye, leftLeg, rightLeg, spear, blade, banner);
  return { root, body, leftLeg, rightLeg, spear, banner, phase, lane };
}

function createBeanSoldierParade(palette: SkillPalette): BeanSoldierParade {
  const group = new Group();
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
    if (!host || !canUseWebGL()) return;
    const container = host;

    const palette = scaleSkillPalette(getSkillWebglPalette(skillId));
    const effectPower = Math.max(1, Math.min(3.4, 0.95 + intensity * 0.42));
    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.4);

    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.domElement.className = "skill-webgl-canvas";
    container.appendChild(renderer.domElement);

    const bloomCfg = getSkillBloomConfig(skillId, effectPower);
    const bloomPass = new UnrealBloomPass(
      new Vector2(container.clientWidth, container.clientHeight),
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
    const ambientLight = new AmbientLight(0xffffff, 1.5 + effectPower * 0.28);
    const keyLight = new DirectionalLight(new Color(palette.hot), 1.75 + effectPower * 0.35);
    const glow = new PointLight(new Color(palette.hot), 1.1 + effectPower * 0.5, 6 + effectPower * 1.6);
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

    const particlePositions = particleField.geometry.getAttribute("position") as BufferAttribute;
    const originalPositions = new Float32Array(particlePositions.array as Float32Array);
    const startedAt = performance.now();
    let frameId = 0;
    let disposed = false;
    let lastFrameAt = 0;
    let longFrameCount = 0;
    let qualityTier = 0; // 0 full → 1 no afterimage → 2 lower pixelRatio → 3 dispose
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);

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
        if (longFrameCount >= 3 && qualityTier === 0) {
          qualityTier = 1;
          if (afterimagePass) afterimagePass.enabled = false;
          longFrameCount = 0;
        } else if (longFrameCount >= 4 && qualityTier === 1) {
          qualityTier = 2;
          renderer.setPixelRatio(Math.min(1, basePixelRatio));
          const width = Math.max(1, container.clientWidth);
          const height = Math.max(1, container.clientHeight);
          composer.setSize(width, height);
          longFrameCount = 0;
        } else if (longFrameCount >= 5 && qualityTier >= 2) {
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
      (particleField.material as PointsMaterial).opacity = Math.min(0.96, (skillId === "heaven_thunder" ? 0.86 : 0.58 + effectPower * 0.08) * pulse);

      rings.forEach((ring, index) => {
        ring.rotation.z += (0.004 + index * 0.002) * palette.speed;
        ring.rotation.x += index % 2 === 0 ? 0.0018 : -0.0016;
        ring.scale.setScalar(0.78 + pulse * (0.28 + effectPower * 0.12) + index * 0.08);
        (ring.material as MeshBasicMaterial).opacity = Math.max(0, (0.2 + effectPower * 0.04 - index * 0.026) * pulse);
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
      (beam.material as MeshBasicMaterial).opacity = Math.min(0.9, beamBaseOpacity * pulse * effectPower);
      glow.intensity = 0.45 + pulse * 1.42 * effectPower;

      if (windBladeRig) {
        const slash = Math.min(1, progress * 1.08);
        windBladeRig.group.position.x = -5.6 + slash * 11.2;
        windBladeRig.group.position.y = 0.04 + Math.sin(time * 3.2) * 0.2;
        windBladeRig.group.rotation.z = -0.1 + Math.sin(time * 4.4) * 0.08;
        windBladeRig.blades.forEach((blade, index) => {
          blade.rotation.z += (0.04 + index * 0.008) * effectPower;
          blade.rotation.y = 0.28 + Math.sin(time * 2.2 + index) * 0.18;
          blade.scale.setScalar(1.05 + pulse * 0.35 + index * 0.08);
          (blade.material as MeshBasicMaterial).opacity = Math.max(0, (0.42 + effectPower * 0.1 - index * 0.05) * pulse);
        });
        windBladeRig.speedLines.forEach((line, index) => {
          line.position.x = -0.9 - index * 0.28 - Math.sin(time * 5 + index) * 0.12;
          (line.material as MeshBasicMaterial).opacity = Math.max(0, (0.3 - index * 0.035) * pulse);
        });
      }

      if (beanParade) {
        beanParade.group.position.x = progress * 3.2;
        beanParade.group.rotation.y = Math.sin(time * 0.65) * 0.08;
        beanParade.soldiers.forEach((soldier, soldierIndex) => {
          const stride = time * 8.2 + soldier.phase;
          const bob = Math.abs(Math.sin(stride)) * 0.13;
          const laneOffset = (soldier.lane - 1) * 0.38;
          soldier.root.position.x = -6.2 - soldierIndex * 1.05 + progress * 10.4;
          soldier.root.position.y = -1.88 + laneOffset + bob;
          soldier.root.position.z = 1.0 - soldier.lane * 0.28;
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
        swordRig.blade.rotation.y = Math.sin(time * 2.4) * 0.12;
        (swordRig.trail.material as MeshBasicMaterial).opacity = 0.48 * pulse;
        (swordRig.aura.material as MeshBasicMaterial).opacity = 0.24 + pulse * 0.22;
        swordRig.afterimages.forEach((image, index) => {
          image.position.x = -1.28 - index * 0.58 - Math.sin(time * 3 + index) * 0.2;
          (image.material as MeshBasicMaterial).opacity = Math.max(0, (0.3 - index * 0.055) * pulse);
        });
      }

      if (rainRipple) {
        rainRipple.plane.material.uniforms.uTime.value = time;
        rainRipple.plane.material.uniforms.uProgress.value = progress;
        rainRipple.drops.rotation.z = Math.sin(time * 0.2) * (skillId === "celestial_rain" ? 0.08 : 0.04);
        const dropPositions = rainRipple.drops.geometry.getAttribute("position") as BufferAttribute;
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
          (veil.material as MeshBasicMaterial).opacity = Math.min(0.58, (skillId === "celestial_rain" ? 0.2 : 0.14) * pulse * effectPower * (0.72 + seededNoise(index + 751) * 0.32));
        });
        rainRipple.runes.forEach((rune, index) => {
          rune.rotation.z += (index % 2 === 0 ? 0.006 : -0.005) * (skillId === "celestial_rain" ? 1.8 : 1);
          rune.scale.setScalar(0.78 + pulse * (skillId === "celestial_rain" ? 0.38 : 0.24) * effectPower + index * 0.05);
          (rune.material as MeshBasicMaterial).opacity = Math.max(0, (skillId === "celestial_rain" ? 0.26 : 0.18) * pulse * effectPower - index * 0.018);
        });
      }

      if (waterDragonRig) {
        const majestic = waterDragonRig.majestic;
        const points = sampleWaterDragonPoints(waterDragonRig.pointCount, time, majestic);
        const bodyRadius = (majestic ? 0.09 : 0.062) * (0.92 + pulse * (majestic ? 0.28 : 0.18));
        rebuildTubeMesh(waterDragonRig.body, points, majestic ? 72 : 52, bodyRadius, 8);
        waterDragonRig.group.rotation.y = Math.sin(time * 0.35) * 0.32;
        waterDragonRig.group.rotation.z = Math.sin(time * 0.26) * 0.08;
        (waterDragonRig.body.material as MeshBasicMaterial).opacity = Math.min(
          0.78,
          (majestic ? 0.42 : 0.3) * effectPower * pulse
        );

        const tip = points[points.length - 1];
        waterDragonRig.head.position.copy(tip);
        waterDragonRig.head.scale.setScalar((majestic ? 1 : 0.86) + pulse * (majestic ? 0.35 : 0.22));
        (waterDragonRig.head.material as MeshBasicMaterial).opacity = Math.min(
          0.9,
          (majestic ? 0.68 : 0.52) * effectPower * pulse
        );

        waterDragonRig.whiskers.forEach((whisker, index) => {
          const positions = whisker.geometry.getAttribute("position") as BufferAttribute;
          const array = positions.array as Float32Array;
          for (let segment = 0; segment < 3; segment += 1) {
            const offset = segment * 6;
            const side = index % 2 === 0 ? 1 : -1;
            const curl = Math.sin(time * 3 + segment + index) * 0.1;
            array[offset] = tip.x;
            array[offset + 1] = tip.y + side * 0.04;
            array[offset + 2] = tip.z;
            array[offset + 3] = tip.x + 0.35 + segment * 0.28;
            array[offset + 4] = tip.y + side * (0.12 + segment * 0.08) + curl;
            array[offset + 5] = tip.z + side * (0.08 + segment * 0.04);
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
          (petal.material as MeshBasicMaterial).opacity = (0.22 + pulse * 0.34) * (index % 2 === 0 ? 1 : 0.76);
        });
        lotusDomain.rings.forEach((ring, index) => {
          ring.rotation.z += (index % 2 === 0 ? 0.006 : -0.005);
          ring.scale.setScalar(0.88 + pulse * 0.32 + index * 0.08);
          (ring.material as MeshBasicMaterial).opacity = Math.max(0, (0.2 - index * 0.025) * pulse);
        });
      }

      if (lightningRig) {
        let peakStrobe = 0;
        lightningRig.branches.forEach((branch, index) => {
          const strobe = Math.max(0, Math.sin(time * (8.4 + index * 1.8) + index) - 0.22);
          peakStrobe = Math.max(peakStrobe, strobe);
          branch.material.opacity = Math.min(1, strobe * pulse * (index === 0 ? 1 : 0.64));
          branch.scale.x = 0.86 + strobe * 0.28;
          branch.position.x = -0.5 + index * 0.34 + Math.sin(time * 18 + index) * 0.025;
        });
        lightningRig.glows.forEach((glow, index) => {
          const strobe = Math.max(0, Math.sin(time * (7.2 + index * 1.4) + index * 0.7) - 0.18);
          (glow.material as MeshBasicMaterial).opacity = Math.min(0.55, strobe * pulse * 0.42 * effectPower);
          glow.scale.y = 0.9 + strobe * 0.35;
        });
        (lightningRig.flash.material as MeshBasicMaterial).opacity = Math.min(0.28, peakStrobe * pulse * 0.22 * effectPower);
      }

      if (starfallRig) {
        starfallRig.group.rotation.z = Math.sin(time * 0.2) * 0.03;
        starfallRig.meteors.forEach((meteor, index) => {
          const speed = 1.6 + seededNoise(index + 1301) * 0.9;
          meteor.group.position.x += speed * 0.035;
          meteor.group.position.y -= speed * 0.03;
          if (meteor.group.position.y < -2.8 || meteor.group.position.x > 4.8) {
            meteor.group.position.x = -4.8 - seededNoise(index + 1311) * 1.8;
            meteor.group.position.y = 2.2 + seededNoise(index + 1321) * 2.2;
          }
          meteor.trail.scale.x = 0.85 + pulse * 0.55 + Math.sin(time * 3 + index) * 0.08;
          (meteor.head.material as MeshBasicMaterial).opacity = Math.min(1, (0.55 + pulse * 0.4 * effectPower));
          (meteor.trail.material as MeshBasicMaterial).opacity = Math.min(0.85, (0.18 + pulse * 0.34 * effectPower) * (0.75 + seededNoise(index + 1331) * 0.25));
        });
      }

      if (fireDragonRig) {
        const headX = -5.6 + progress * 12.4;
        const points = sampleFireDragonPoints(fireDragonRig.pointCount, time, headX, pulse);
        const bodyRadius = 0.11 * (0.72 + pulse * 0.42);
        rebuildTubeMesh(fireDragonRig.body, points, 64, bodyRadius, 8);
        (fireDragonRig.body.material as MeshStandardMaterial).emissiveIntensity = 0.55 + pulse * 0.55;
        (fireDragonRig.body.material as MeshStandardMaterial).opacity = Math.min(0.98, 0.72 + pulse * 0.26);

        const headPos = points[0];
        fireDragonRig.head.position.copy(headPos);
        fireDragonRig.head.scale.setScalar(0.85 + pulse * 0.4);
        (fireDragonRig.head.material as MeshStandardMaterial).emissiveIntensity = 0.7 + pulse * 0.45;

        fireDragonRig.mane.forEach((m, index) => {
          const mAngle = (index / fireDragonRig.mane.length) * Math.PI * 2 + time * 3.2;
          m.position.x = headPos.x + Math.cos(mAngle) * 0.22;
          m.position.y = headPos.y + Math.sin(mAngle) * 0.2;
          m.position.z = headPos.z + 0.08;
          m.rotation.z = mAngle + Math.PI;
          m.scale.setScalar(0.48 + pulse * 0.82);
          (m.material as MeshBasicMaterial).opacity = 0.52 + pulse * 0.48;
        });
        const fPos = fireDragonRig.fireParticles.geometry.getAttribute("position") as BufferAttribute;
        const fArr = fPos.array as Float32Array;
        for (let i = 0; i < fArr.length; i += 3) {
          fArr[i + 1] += 0.022 + seededNoise(i + 503) * 0.016;
          if (Math.abs(fArr[i] - headX) > 4.4 || fArr[i + 1] > 2.6) {
            fArr[i] = headX + (seededNoise(i + 521) - 0.5) * 2.4;
            fArr[i + 1] = headPos.y + (seededNoise(i + 527) - 0.5) * 0.8;
          }
        }
        fPos.needsUpdate = true;
        (fireDragonRig.fireParticles.material as PointsMaterial).opacity = 0.68 * pulse * effectPower;
      }

      if (swordRainRig) {
        const { blades, glows, dummy, count, speeds, phases } = swordRainRig;
        for (let index = 0; index < count; index += 1) {
          blades.getMatrixAt(index, dummy.matrix);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          dummy.position.y -= speeds[index] * 0.022;
          dummy.position.x += Math.sin(time * 1.4 + phases[index]) * 0.007;
          if (dummy.position.y < -3.6) {
            dummy.position.y = 4.2 + seededNoise(Math.floor(phases[index] * 100)) * 1.8;
          }
          dummy.updateMatrix();
          blades.setMatrixAt(index, dummy.matrix);
          glows.setMatrixAt(index, dummy.matrix);
        }
        blades.instanceMatrix.needsUpdate = true;
        glows.instanceMatrix.needsUpdate = true;
        const bladeMat = blades.material as MeshStandardMaterial;
        const glowMat = glows.material as MeshBasicMaterial;
        bladeMat.opacity = Math.min(0.96, (0.62 + pulse * 0.28) * pulse);
        glowMat.opacity = (0.32 + pulse * 0.28) * pulse;
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
          (petal.material as MeshBasicMaterial).opacity = (0.3 + pulse * 0.3) * (0.68 + seed * 0.32);
        });
      }

      if (divineSealRig) {
        const t = progress;
        const sealPulse = t < 0.14 ? t / 0.14 : t > 0.86 ? (1 - t) / 0.14 : 1.0;
        const sealScale = 0.18 + sealPulse * (1.62 + effectPower * 0.44);
        divineSealRig.group.scale.setScalar(sealScale);
        divineSealRig.group.rotation.z = time * 0.18;
        (divineSealRig.core.material as MeshBasicMaterial).opacity = Math.min(0.96, sealPulse * effectPower * 0.88);
        divineSealRig.core.scale.setScalar(1 + Math.sin(time * 3.6) * 0.14 * sealPulse);
        divineSealRig.rings.forEach((ring, index) => {
          ring.rotation.z += (0.01 + index * 0.003) * (index % 2 === 0 ? 1 : -1) * effectPower;
          ring.scale.setScalar(0.88 + sealPulse * (0.26 + index * 0.04));
          (ring.material as MeshBasicMaterial).opacity = Math.max(0, (0.38 - index * 0.03) * sealPulse * effectPower);
        });
        divineSealRig.runes.forEach((rune, index) => {
          const angle = (index / 8) * Math.PI * 2 + time * 0.38;
          const radius = 1.56 + sealPulse * 0.22;
          rune.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
          rune.rotation.z = angle + Math.PI / 2 + time * 0.2;
          (rune.material as MeshBasicMaterial).opacity = (0.52 + sealPulse * 0.48) * (0.7 + seededNoise(index + 1401) * 0.3);
        });
        divineSealRig.beams.forEach((beam, index) => {
          const angle = (index / 8) * Math.PI * 2 + time * 0.18;
          beam.position.set(Math.cos(angle) * 2.4, Math.sin(angle) * 2.4, -0.1);
          beam.rotation.z = angle + Math.PI / 2;
          beam.scale.y = 0.72 + sealPulse * (0.52 + effectPower * 0.22) + Math.sin(time * 2.8 + index) * 0.06;
          (beam.material as MeshBasicMaterial).opacity = Math.min(0.54, (0.22 + sealPulse * 0.34 * effectPower) * (0.6 + seededNoise(index + 1411) * 0.4));
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
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh || object instanceof Points || object instanceof LineSegments) {
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
