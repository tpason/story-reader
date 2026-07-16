"use client";

/**
 * Decorative butterflies for the xianxia desktop scene.
 *
 * Wing-flap shader + texture: Yoichi Kobayashi (ykob/sketch-threejs, MIT).
 * Motion: independent mid-air wanderers — stay above ground, gentle pitch.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import {
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";

const TEXTURE_URL = "/xianxia/butterflies/tex.png";

/** Habitat: side corridors; y kept clearly above water/ground. */
const WORLD = { halfW: 6.8, yMin: 0.72, yMax: 1.95, zMin: -2.2, zMax: -0.95 };
const SIDE_GAP = 2.85;
const COUNT = 4;
const MIN_SEP = 1.05;
const MAX_SPEED = 0.62;

const COLOR_HUES = [0.12, 0.08, 0.38, 0.02] as const;

const VS = /* glsl */ `
  uniform float index;
  uniform float time;
  uniform float size;

  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vOpacity;

  void main() {
    float flapTime = radians(
      sin(time * 5.2 - length(position.xy) / size * 2.0 + index * 2.4) * 48.0 + 28.0
    );
    float hovering = cos(time * 2.2 + index * 2.7) * size / 18.0;
    vec3 updatePosition = vec3(
      cos(flapTime) * position.x,
      position.y + hovering,
      sin(flapTime) * abs(position.x) + hovering
    );

    vPosition = position;
    vUv = uv;
    vOpacity = 0.84;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(updatePosition, 1.0);
  }
`;

const FS = /* glsl */ `
  uniform float time;
  uniform float size;
  uniform sampler2D butterflyMap;
  uniform float colorH;

  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vOpacity;

  vec3 convertHsvToRgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  float hashNoise(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453) * 2.0 - 1.0;
  }

  void main() {
    vec4 texColor = texture2D(butterflyMap, vUv);
    if (texColor.a < 0.5) discard;

    float noise = hashNoise(vPosition / vec3(size * 0.25) + vec3(0.0, 0.0, time));
    vec3 hsv = vec3(colorH + noise * 0.12, 0.42, 1.0);
    vec3 rgb = convertHsvToRgb(hsv);

    gl_FragColor = vec4(rgb, vOpacity) * texColor;
  }
`;

type Wanderer = {
  mesh: Mesh;
  mat: ShaderMaterial;
  pos: Vector3;
  prev: Vector3;
  home: Vector3;
  side: -1 | 1;
  size: number;
  phase: number;
  fx: number;
  fy: number;
  fz: number;
  ax: number;
  ay: number;
  az: number;
  drift: number;
};

const _sep = new Vector3();
const _desired = new Vector3();
const _facing = new Vector3();

function clampXToSide(x: number, side: -1 | 1) {
  if (side < 0) return Math.max(-WORLD.halfW + 0.15, Math.min(-SIDE_GAP - 0.1, x));
  return Math.max(SIDE_GAP + 0.1, Math.min(WORLD.halfW - 0.15, x));
}

function homeForIndex(i: number, side: -1 | 1): Vector3 {
  const onSide = Math.floor(i / 2);
  const slots = Math.ceil(COUNT / 2);
  const t = slots <= 1 ? 0.5 : onSide / (slots - 1);
  const span = WORLD.halfW - SIDE_GAP - 0.35;
  const x = side * (SIDE_GAP + 0.25 + t * span);
  // Bias homes toward upper half of the fly band
  const yBand = WORLD.yMax - WORLD.yMin;
  const y = WORLD.yMin + 0.28 + ((onSide * 0.41 + (side > 0 ? 0.22 : 0.08)) % 1) * (yBand * 0.55);
  const z =
    WORLD.zMin +
    0.25 +
    ((onSide * 0.41 + (i % 2) * 0.22) % 1) * (WORLD.zMax - WORLD.zMin - 0.45);
  return new Vector3(x, y, z);
}

export function FlyingButterflies() {
  const texture = useLoader(TextureLoader, TEXTURE_URL);
  const groupRef = useRef<Group>(null);
  const listRef = useRef<Wanderer[]>([]);

  const sharedGeo = useMemo(() => new PlaneGeometry(1, 0.5, 20, 10), []);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const list: Wanderer[] = Array.from({ length: COUNT }, (_, i) => {
      const size = 0.16 + (i % 3) * 0.035;
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const home = homeForIndex(i, side);
      const mat = new ShaderMaterial({
        uniforms: {
          index: { value: i * 1.7 },
          time: { value: 0 },
          size: { value: 1 },
          butterflyMap: { value: texture },
          colorH: { value: COLOR_HUES[i % COLOR_HUES.length] },
        },
        vertexShader: VS,
        fragmentShader: FS,
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
      });

      const mesh = new Mesh(sharedGeo, mat);
      mesh.scale.setScalar(size);
      mesh.renderOrder = 12;
      group.add(mesh);
      mesh.position.copy(home);

      return {
        mesh,
        mat,
        pos: home.clone(),
        prev: home.clone(),
        home,
        side,
        size,
        phase: i * 1.37 + 0.4,
        fx: 0.2 + i * 0.065,
        fy: 0.28 + i * 0.08,
        fz: 0.16 + i * 0.055,
        ax: 0.48 + (i % 3) * 0.14,
        // Small vertical amp — flutter, not dive
        ay: 0.12 + (i % 2) * 0.06,
        az: 0.28 + ((i + 1) % 3) * 0.12,
        drift: 0.07 + (i % 4) * 0.025,
      };
    });

    listRef.current = list;

    return () => {
      list.forEach(({ mesh, mat }) => {
        group.remove(mesh);
        mat.dispose();
      });
      listRef.current = [];
    };
  }, [texture, sharedGeo]);

  useEffect(() => () => sharedGeo.dispose(), [sharedGeo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const list = listRef.current;

    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b.mat.uniforms.time.value = t;
      b.prev.copy(b.pos);

      const p = b.phase + t;
      // Vertical: mostly soft bob around home (lift-biased), not deep sine dives
      const bob =
        Math.sin(p * b.fy + 0.8) * b.ay * 0.55 +
        Math.abs(Math.sin(p * b.fy * 0.85)) * b.ay * 0.45;

      _desired.set(
        b.home.x + Math.sin(p * b.fx) * b.ax + Math.sin(p * b.fx * 0.37 + 1.2) * b.ax * 0.28,
        b.home.y + bob,
        b.home.z + Math.cos(p * b.fz + 0.3) * b.az + Math.sin(p * b.fz * 0.7) * b.az * 0.3,
      );

      _desired.x += Math.sin(t * b.drift + b.phase) * 0.28 * b.side;
      _desired.y += Math.sin(t * (b.drift + 0.04) + 2.1) * 0.05;

      _desired.x = clampXToSide(_desired.x, b.side);
      _desired.y = Math.max(WORLD.yMin, Math.min(WORLD.yMax, _desired.y));
      _desired.z = Math.max(WORLD.zMin, Math.min(WORLD.zMax, _desired.z));

      b.pos.lerp(_desired, 1 - Math.exp(-2.1 * dt));

      // Separation — prefer horizontal push so we don't shove them into the ground
      for (let j = 0; j < list.length; j++) {
        if (j === i) continue;
        const other = list[j];
        if (other.side !== b.side) continue;
        const dist = b.pos.distanceTo(other.pos);
        if (dist >= MIN_SEP || dist < 1e-4) continue;
        _sep.subVectors(b.pos, other.pos);
        _sep.y *= 0.25;
        const len = _sep.length();
        if (len < 1e-4) continue;
        _sep.multiplyScalar(1 / len);
        const push = (MIN_SEP - dist) * 0.5;
        b.pos.addScaledVector(_sep, push * 0.55);
        other.pos.addScaledVector(_sep, -push * 0.45);
      }

      b.pos.x = clampXToSide(b.pos.x, b.side);
      b.pos.y = Math.max(WORLD.yMin, Math.min(WORLD.yMax, b.pos.y));
      b.pos.z = Math.max(WORLD.zMin, Math.min(WORLD.zMax, b.pos.z));

      b.mesh.position.copy(b.pos);

      _facing.subVectors(b.pos, b.prev);
      const move = _facing.length();
      if (move > 1e-5) {
        _facing.multiplyScalar(1 / move);
        const yaw = Math.atan2(-_facing.z, _facing.x);
        // Soft bank — never nose-dive toward ground
        const pitch = Math.max(-0.22, Math.min(0.28, _facing.y * 0.55));
        b.mesh.rotation.y += (yaw - b.mesh.rotation.y) * Math.min(1, 5.5 * dt);
        b.mesh.rotation.z += (pitch - b.mesh.rotation.z) * Math.min(1, 4.5 * dt);
        b.mesh.rotation.x = -0.42 + b.mesh.rotation.z * 0.15;
      }

      const flapBoost = Math.min(1.1, move / (MAX_SPEED * dt + 1e-4));
      b.mat.uniforms.index.value = i * 1.7 + t * (1.1 + flapBoost * 0.3) + b.phase;
    }
  });

  return <group ref={groupRef} />;
}

useLoader.preload(TextureLoader, TEXTURE_URL);
