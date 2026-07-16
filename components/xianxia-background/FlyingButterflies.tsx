"use client";

/**
 * Decorative butterflies for the xianxia desktop scene.
 *
 * Wing-flap shader + texture: Yoichi Kobayashi (ykob/sketch-threejs, MIT).
 * Flocking / facing motion: lean adaptation of Joshua Koo (@BlurSpline) boids
 * as used in Brannon Dorsey’s “Butterfly Habitat” gist
 * https://gist.github.com/brannondorsey/a80f7b673a924ef8d297
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

/** Habitat: left/right corridors only — center |x| < SIDE_GAP is covered by page body. */
const WORLD = { halfW: 6.8, yMin: 0.35, yMax: 1.55, zMin: -1.85, zMax: -1.15 };
/** Keep butterflies outside the frosted content column. */
const SIDE_GAP = 2.75;
const NEIGHBOR_R = 2.2;
const MAX_SPEED = 0.55;
const MAX_STEER = 0.09;
/** 2 left + 2 right — enough motion without mixer/boid overload. */
const COUNT = 4;

// Warm xianxia HSV hues (H 0–1): gold / amber / jade / crimson / soft gold / peach
const COLOR_HUES = [0.12, 0.08, 0.38, 0.02, 0.15, 0.06] as const;

const VS = /* glsl */ `
  uniform float index;
  uniform float time;
  uniform float size;

  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vOpacity;

  void main() {
    float flapTime = radians(
      sin(time * 4.0 - length(position.xy) / size * 2.0 + index * 2.0) * 45.0 + 30.0
    );
    float hovering = cos(time * 2.0 + index * 3.0) * size / 16.0;
    vec3 updatePosition = vec3(
      cos(flapTime) * position.x,
      position.y + hovering,
      sin(flapTime) * abs(position.x) + hovering
    );

    vPosition = position;
    vUv = uv;
    vOpacity = 0.82;

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

type BoidState = {
  mesh: Mesh;
  mat: ShaderMaterial;
  pos: Vector3;
  vel: Vector3;
  acc: Vector3;
  size: number;
  phase: number;
  /** -1 = left corridor, +1 = right corridor */
  side: -1 | 1;
};

const _steer = new Vector3();
const _tmp = new Vector3();
const _wall = new Vector3();
const _sep = new Vector3();

function clampSteer(v: Vector3, max: number) {
  const len = v.length();
  if (len > max) v.multiplyScalar(max / len);
  return v;
}

function avoidWall(b: BoidState, wallPoint: Vector3, strength: number) {
  _steer.copy(b.pos).sub(wallPoint);
  const d2 = Math.max(b.pos.distanceToSquared(wallPoint), 0.08);
  _steer.multiplyScalar(strength / d2);
  b.acc.add(_steer);
}

function clampXToSide(x: number, side: -1 | 1) {
  if (side < 0) return Math.max(-WORLD.halfW, Math.min(-SIDE_GAP, x));
  return Math.max(SIDE_GAP, Math.min(WORLD.halfW, x));
}

function spawnX(side: -1 | 1) {
  const span = WORLD.halfW - SIDE_GAP;
  return side * (SIDE_GAP + Math.random() * span);
}

export function FlyingButterflies() {
  const texture = useLoader(TextureLoader, TEXTURE_URL);
  const groupRef = useRef<Group>(null);
  const boidsRef = useRef<BoidState[]>([]);

  const sharedGeo = useMemo(() => new PlaneGeometry(1, 0.5, 24, 12), []);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const boids: BoidState[] = Array.from({ length: COUNT }, (_, i) => {
      const size = 0.18 + (i % 3) * 0.03;
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const mat = new ShaderMaterial({
        uniforms: {
          index: { value: i },
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

      const pos = new Vector3(
        spawnX(side),
        WORLD.yMin + Math.random() * (WORLD.yMax - WORLD.yMin),
        WORLD.zMin + Math.random() * (WORLD.zMax - WORLD.zMin),
      );
      // Prefer vertical/depth drift along the margin; soft X so they stay in corridor
      const vel = new Vector3(
        side * (0.08 + Math.random() * 0.18),
        (Math.random() * 2 - 1) * 0.16,
        (Math.random() * 2 - 1) * 0.1,
      );

      mesh.position.copy(pos);

      return {
        mesh,
        mat,
        pos,
        vel,
        acc: new Vector3(),
        size,
        phase: Math.random() * Math.PI * 2,
        side,
      };
    });

    boidsRef.current = boids;

    return () => {
      boids.forEach(({ mesh, mat }) => {
        group.remove(mesh);
        mat.dispose();
      });
      boidsRef.current = [];
    };
  }, [texture, sharedGeo]);

  useEffect(() => () => sharedGeo.dispose(), [sharedGeo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const boids = boidsRef.current;

    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      b.mat.uniforms.time.value = t;
      b.acc.set(0, 0, 0);

      // Soft habitat walls — outer + inner corridor edge (keep out of page body)
      avoidWall(b, _wall.set(-WORLD.halfW, b.pos.y, b.pos.z), 2.2);
      avoidWall(b, _wall.set(WORLD.halfW, b.pos.y, b.pos.z), 2.2);
      avoidWall(b, _wall.set(b.side < 0 ? -SIDE_GAP : SIDE_GAP, b.pos.y, b.pos.z), 3.4);
      avoidWall(b, _wall.set(b.pos.x, WORLD.yMin, b.pos.z), 2.8);
      avoidWall(b, _wall.set(b.pos.x, WORLD.yMax, b.pos.z), 2.8);
      avoidWall(b, _wall.set(b.pos.x, b.pos.y, WORLD.zMin), 2.0);
      avoidWall(b, _wall.set(b.pos.x, b.pos.y, WORLD.zMax), 2.0);

      // Alignment / cohesion / separation — deterministic cadence (no Math.random/frame)
      if (((Math.floor(t * 8) + i) % 2) === 0) {
        let alignCount = 0;
        let coCount = 0;
        _steer.set(0, 0, 0);
        _tmp.set(0, 0, 0);
        _sep.set(0, 0, 0);

        for (let j = 0; j < boids.length; j++) {
          if (j === i) continue;
          // Skip every other neighbor by index parity — cheaper than random
          if (((i + j) & 1) === 1) continue;
          const other = boids[j];
          if (other.side !== b.side) continue;
          const dist = b.pos.distanceTo(other.pos);
          if (dist <= 0 || dist > NEIGHBOR_R) continue;

          _steer.add(other.vel);
          alignCount++;
          _tmp.add(other.pos);
          coCount++;

          _wall.subVectors(b.pos, other.pos).normalize().divideScalar(Math.max(dist, 0.05));
          _sep.add(_wall);
        }

        if (alignCount > 0) {
          _steer.divideScalar(alignCount);
          clampSteer(_steer, MAX_STEER);
          b.acc.add(_steer);
        }
        if (coCount > 0) {
          _tmp.divideScalar(coCount).sub(b.pos);
          clampSteer(_tmp, MAX_STEER);
          b.acc.add(_tmp);
        }
        clampSteer(_sep, MAX_STEER * 1.4);
        b.acc.add(_sep);
      }

      b.vel.addScaledVector(b.acc, dt);
      const speed = b.vel.length();
      if (speed > MAX_SPEED) b.vel.multiplyScalar(MAX_SPEED / speed);
      b.pos.addScaledVector(b.vel, dt);

      b.pos.x = clampXToSide(b.pos.x, b.side);
      b.pos.y = Math.max(WORLD.yMin, Math.min(WORLD.yMax, b.pos.y));
      b.pos.z = Math.max(WORLD.zMin, Math.min(WORLD.zMax, b.pos.z));

      b.mesh.position.copy(b.pos);

      // Face travel direction (gist atan2 / asin)
      const vLen = Math.max(b.vel.length(), 1e-4);
      b.mesh.rotation.y = Math.atan2(-b.vel.z, b.vel.x);
      b.mesh.rotation.z = Math.asin(Math.max(-1, Math.min(1, b.vel.y / vLen)));
      b.mesh.rotation.x = -0.55 + b.mesh.rotation.z * 0.25;

      // Climb → slightly faster flap phase (feeds shader index offset)
      b.phase = (b.phase + (Math.max(0, b.mesh.rotation.z) + 0.25) * dt * 6) % (Math.PI * 2);
      b.mat.uniforms.index.value = i + b.phase * 0.15;
    }
  });

  return <group ref={groupRef} />;
}

useLoader.preload(TextureLoader, TEXTURE_URL);
