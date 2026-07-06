"use client";

/**
 * App-wide mist / cloud / qi aura (all story_reader pages).
 * Reference: ~/Desktop/three.js/examples/ — see skill threejs-local-examples.
 */
import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Material,
  Mesh,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  WebGLRenderer
} from "three";
import { makeFluffyCloudTexture, makeMistBandTexture, makeVolumeCloudTexture } from "@/lib/three-cloud-utils";

export type AppAuraVariant = "global" | "readers" | "stories";

type AuraConfig = {
  gold: string;
  jade: string;
  cloudTint: [number, number, number];
  mistTint: [number, number, number];
  cloudOpacity: number;
  mistOpacity: number;
  particleCount: number;
  cloudCount: number;
  mistCount: number;
};

const VARIANT_CONFIG = {
  global: {
    gold: "#f0d06a",
    jade: "#26a882",
    cloudTint: [255, 250, 240],
    mistTint: [210, 222, 216],
    cloudOpacity: 0.075,
    mistOpacity: 0.068,
    particleCount: 52,
    cloudCount: 4,
    mistCount: 3
  },
  readers: {
    gold: "#f0d06a",
    jade: "#26a882",
    cloudTint: [255, 246, 228],
    mistTint: [196, 218, 210],
    cloudOpacity: 0.12,
    mistOpacity: 0.1,
    particleCount: 72,
    cloudCount: 5,
    mistCount: 4
  },
  stories: {
    gold: "#e8c050",
    jade: "#1a6b5a",
    cloudTint: [255, 252, 242],
    mistTint: [220, 225, 218],
    cloudOpacity: 0.1,
    mistOpacity: 0.085,
    particleCount: 58,
    cloudCount: 5,
    mistCount: 4
  }
} satisfies Record<AppAuraVariant, AuraConfig>;

function seeded(seed: number) {
  const x = Math.sin(seed * 91.17) * 43758.5453;
  return x - Math.floor(x);
}

function makeGlowTexture(r: number, g: number, b: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.5)`);
  grad.addColorStop(0.72, `rgba(${r},${g},${b},0.12)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function createQiParticles(config: AuraConfig) {
  const count = config.particleCount;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const gold = new Color(config.gold);
  const jade = new Color(config.jade);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seeded(i * 3 + 1) - 0.5) * 9;
    positions[i * 3 + 1] = (seeded(i * 3 + 2) - 0.5) * 5.5;
    positions[i * 3 + 2] = -0.8 - seeded(i * 3 + 3) * 2.2;
    const col = seeded(i + 50) < 0.42 ? jade : gold;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return {
    points: new Points(
      geo,
      new PointsMaterial({
        size: 0.028,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.38,
        blending: AdditiveBlending,
        depthWrite: false
      })
    ),
    basePositions: positions.slice()
  };
}

type DriftSprite = {
  sprite: Sprite;
  speedX: number;
  baseY: number;
  phase: number;
};

type GlowSprite = {
  sprite: Sprite;
  baseScale: number;
  phase: number;
};

export function ThreeAppAura({ variant }: { variant: AppAuraVariant }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(true);
  const intersectingRef = useRef(true);

  const syncActive = () => {
    setActive(intersectingRef.current && !document.hidden);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = Boolean(entry?.isIntersecting);
        syncActive();
      },
      { threshold: 0.02 },
    );
    observer.observe(host);

    const onVisibility = () => syncActive();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !active) return;
    const el = host;
    const config = VARIANT_CONFIG[variant];

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0.1, 6.8);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.domElement.className = "app-aura-webgl-canvas";
    el.appendChild(renderer.domElement);

    const texturesToDispose: CanvasTexture[] = [];
    const clouds: DriftSprite[] = [];
    const mists: DriftSprite[] = [];
    const glows: GlowSprite[] = [];

    for (let i = 0; i < config.cloudCount; i++) {
      const tex =
        i % 2 === 0
          ? makeFluffyCloudTexture(i + 11, config.cloudTint, 512)
          : makeVolumeCloudTexture(i + 17, config.cloudTint, 480);
      texturesToDispose.push(tex);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: config.cloudOpacity * (0.75 + seeded(i + 90) * 0.5),
        blending: NormalBlending,
        depthWrite: false
      });
      const sprite = new Sprite(mat);
      const scaleX = 4.8 + seeded(i + 100) * 3.6;
      sprite.scale.set(scaleX, scaleX * 0.38, 1);
      const baseY = -1.2 + seeded(i + 110) * 2.8;
      sprite.position.set((seeded(i + 120) - 0.5) * 10, baseY, -1.4 - seeded(i + 130) * 1.6);
      scene.add(sprite);
      clouds.push({
        sprite,
        speedX: (seeded(i + 140) - 0.5) * 0.0022,
        baseY,
        phase: seeded(i + 160) * Math.PI * 2
      });
    }

    for (let i = 0; i < config.mistCount; i++) {
      const tex = makeMistBandTexture(config.mistTint, 512);
      texturesToDispose.push(tex);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: config.mistOpacity * (0.8 + seeded(i + 200) * 0.4),
        blending: NormalBlending,
        depthWrite: false
      });
      const sprite = new Sprite(mat);
      sprite.scale.set(9 + seeded(i + 210) * 4, 1.2 + seeded(i + 220) * 0.8, 1);
      const baseY = -2 + seeded(i + 230) * 3.6;
      sprite.position.set((seeded(i + 240) - 0.5) * 8, baseY, -0.6 - seeded(i + 250) * 0.8);
      scene.add(sprite);
      mists.push({
        sprite,
        speedX: (seeded(i + 260) - 0.5) * 0.0016,
        baseY,
        phase: seeded(i + 270) * Math.PI * 2
      });
    }

    const goldGlowTex = makeGlowTexture(240, 196, 90);
    const jadeGlowTex = makeGlowTexture(38, 168, 130);
    texturesToDispose.push(goldGlowTex, jadeGlowTex);

    for (const [i, tex, baseScale] of [
      [0, goldGlowTex, 3.2],
      [1, jadeGlowTex, 2.6],
      [2, goldGlowTex, 2.2]
    ] as const) {
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.16,
        blending: AdditiveBlending,
        depthWrite: false
      });
      const sprite = new Sprite(mat);
      sprite.scale.setScalar(baseScale);
      sprite.position.set((seeded(i + 320) - 0.5) * 5, 0.4 + seeded(i + 310) * 1.6, -0.3);
      scene.add(sprite);
      glows.push({ sprite, baseScale, phase: seeded(i + 330) * Math.PI * 2 });
    }

    const qi = createQiParticles(config);
    scene.add(qi.points);

    let frameId = 0;
    let disposed = false;

    function resize() {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function render(now: number) {
      if (disposed) return;
      const t = now * 0.001;

      for (const cloud of clouds) {
        cloud.sprite.position.x += cloud.speedX;
        cloud.sprite.position.y = cloud.baseY + Math.sin(t * 0.28 + cloud.phase) * 0.22;
        if (cloud.sprite.position.x > 7.5) cloud.sprite.position.x = -7.5;
        if (cloud.sprite.position.x < -7.5) cloud.sprite.position.x = 7.5;
      }

      for (const mist of mists) {
        mist.sprite.position.x += mist.speedX;
        mist.sprite.position.y = mist.baseY + Math.sin(t * 0.2 + mist.phase) * 0.14;
        if (Math.abs(mist.sprite.position.x) > 8) mist.sprite.position.x *= -0.92;
      }

      for (const glow of glows) {
        const pulse = 0.9 + Math.sin(t * 0.9 + glow.phase) * 0.1;
        glow.sprite.scale.setScalar(glow.baseScale * pulse);
        glow.sprite.material.opacity = 0.1 + Math.sin(t * 1.1 + glow.phase) * 0.05;
      }

      const posAttr = qi.points.geometry.getAttribute("position") as BufferAttribute;
      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        const pi = i / 3;
        pos[i + 1] += 0.00022 + seeded(pi + 700) * 0.00018;
        if (pos[i + 1] > 3.2) pos[i + 1] = qi.basePositions[i + 1];
        pos[i] = qi.basePositions[i] + Math.sin(t * 0.24 + pi) * 0.08;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize);
    frameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      texturesToDispose.forEach((tex) => tex.dispose());
      scene.traverse((obj: Object3D) => {
        if (obj instanceof Points || obj instanceof Mesh) {
          obj.geometry.dispose();
          (obj.material as Material).dispose();
        }
        if (obj instanceof Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant, active]);

  return <div className="app-aura-webgl-scene" ref={hostRef} />;
}
