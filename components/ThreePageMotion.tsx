"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Material, Mesh, MeshBasicMaterial, NormalBlending, Object3D, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, Scene, Sprite, SpriteMaterial, SRGBColorSpace, WebGLRenderer } from "three";

type ThreePageMotionProps = {
  variant: "library" | "reader" | "error";
};

type FloatingPanel = {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  phase: number;
};

const VARIANT_CONFIG = {
  library: {
    count: 16,
    gold: "#f0d06a",
    jade: "#26a882",
    opacity: 0.13,
    cameraZ: 7.2
  },
  reader: {
    count: 11,
    gold: "#f0d06a",
    jade: "#1a6b5a",
    opacity: 0.1,
    cameraZ: 7.8
  },
  error: {
    count: 7,
    gold: "#c8962e",
    jade: "#26a882",
    opacity: 0.08,
    cameraZ: 7.4
  }
} satisfies Record<ThreePageMotionProps["variant"], { count: number; gold: string; jade: string; opacity: number; cameraZ: number }>;

function seededNoise(seed: number) {
  const x = Math.sin(seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function createScrollPanelTexture(gold: string, jade: string, variant: ThreePageMotionProps["variant"]) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 192, 256);

  // Parchment background
  const bgAlpha = variant === "reader" ? 0.68 : 0.38;
  ctx.fillStyle = variant === "error"
    ? `rgba(80, 20, 15, ${bgAlpha})`
    : `rgba(248, 238, 210, ${bgAlpha})`;
  ctx.fillRect(0, 0, 192, 256);

  // Gold outer border
  ctx.strokeStyle = gold;
  ctx.globalAlpha = 0.52;
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 182, 246);

  // Jade inner accent lines (top & bottom)
  ctx.strokeStyle = jade;
  ctx.globalAlpha = 0.36;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(14, 20); ctx.lineTo(178, 20);
  ctx.moveTo(14, 236); ctx.lineTo(178, 236);
  ctx.stroke();

  // Corner ornaments (small gold squares)
  ctx.fillStyle = gold;
  ctx.globalAlpha = 0.54;
  for (const [cx, cy] of [[14, 14], [178, 14], [14, 242], [178, 242]] as [number, number][]) {
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
  }

  // Simulated text lines (jade tint)
  ctx.strokeStyle = jade;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const y = 40 + i * 24;
    const w = 60 + seededNoise(i + 12) * 80;
    ctx.globalAlpha = 0.18 + seededNoise(i + 20) * 0.12;
    ctx.beginPath();
    ctx.moveTo(24, y); ctx.lineTo(24 + w, y);
    ctx.stroke();
  }

  // Center divider line
  ctx.strokeStyle = gold;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(96, 28); ctx.lineTo(96, 228);
  ctx.stroke();
  ctx.setLineDash([]);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createAmbientDust(gold: string, jade: string) {
  const count = 80;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const goldColor = new Color(gold);
  const jadeColor = new Color(jade);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seededNoise(i * 3 + 1) - 0.5) * 10;
    positions[i * 3 + 1] = (seededNoise(i * 3 + 2) - 0.5) * 7;
    positions[i * 3 + 2] = -1 - seededNoise(i * 3 + 3) * 3;
    const col = seededNoise(i + 400) < 0.4 ? jadeColor : goldColor;
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
        size: 0.022,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.32,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    ),
    originalPositions: positions.slice()
  };
}

function makeMistTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  for (const [x, y, r, a] of [
    [256, 220, 200, 0.15],
    [160, 280, 155, 0.10],
    [360, 245, 165, 0.12],
    [270, 265, 125, 0.08],
  ] as [number, number, number, number][]) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(230,220,200,${a})`);
    grad.addColorStop(1, "rgba(200,200,190,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  return new CanvasTexture(canvas);
}

function createPanels(variant: ThreePageMotionProps["variant"]) {
  const config = VARIANT_CONFIG[variant];
  const texture = createScrollPanelTexture(config.gold, config.jade, variant);
  const panels: FloatingPanel[] = [];

  for (let i = 0; i < config.count; i++) {
    const width = variant === "reader" ? 0.58 : 0.5 + seededNoise(i + 2) * 0.22;
    const height = variant === "reader" ? 0.82 : 0.66 + seededNoise(i + 7) * 0.26;
    const geo = new PlaneGeometry(width, height, 8, 8);
    const isAccent = i % 5 === 0;
    const mat = new MeshBasicMaterial({
      color: new Color(isAccent ? config.jade : "#f8eed2"),
      map: texture,
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
      side: DoubleSide
    });
    const mesh = new Mesh(geo, mat);
    const column = i % 6;
    const row = Math.floor(i / 6);
    const baseX = -4.8 + column * 1.92 + seededNoise(i + 13) * 0.48;
    const baseY = variant === "reader" ? -2.8 + row * 1.22 : -2.2 + row * 1.12;
    const baseZ = -1.2 - seededNoise(i + 19) * 2.4;
    mesh.position.set(baseX, baseY, baseZ);
    mesh.rotation.set(
      -0.2 + seededNoise(i + 29) * 0.38,
      -0.54 + seededNoise(i + 31) * 1.08,
      -0.18 + seededNoise(i + 37) * 0.36
    );
    panels.push({ mesh, baseX, baseY, baseZ, speed: 0.22 + seededNoise(i + 41) * 0.38, phase: seededNoise(i + 47) * Math.PI * 2 });
  }

  return panels;
}

export function ThreePageMotion({ variant }: ThreePageMotionProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el: HTMLDivElement = host;
    const config = VARIANT_CONFIG[variant];
    const scene = new Scene();
    const camera = new PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, config.cameraZ);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.domElement.className = "page-webgl-canvas";
    el.appendChild(renderer.domElement);

    const mistTexture = makeMistTexture();
    const dust = createAmbientDust(config.gold, config.jade);
    const panels = createPanels(variant);

    // 3 drifting mist sprites
    const mistSprites: { sprite: Sprite; dx: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const mat = new SpriteMaterial({
        map: mistTexture,
        transparent: true,
        opacity: 0.04 + seededNoise(i + 300) * 0.03,
        blending: NormalBlending,
        depthWrite: false,
      });
      const sprite = new Sprite(mat);
      sprite.scale.set(6 + seededNoise(i + 301) * 4, 1.6 + seededNoise(i + 302) * 1.4, 1);
      sprite.position.set(
        (seededNoise(i + 303) - 0.5) * 12,
        (seededNoise(i + 304) - 0.5) * 4,
        -1.5 - seededNoise(i + 305) * 2
      );
      scene.add(sprite);
      mistSprites.push({ sprite, dx: (seededNoise(i + 306) - 0.5) * 0.003 });
    }

    panels.forEach((p) => scene.add(p.mesh));
    scene.add(dust.points);

    const pointer = { x: 0, y: 0 };
    let frameId = 0;
    let disposed = false;
    let t = 0;

    function resize() {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function onPointerMove(e: PointerEvent) {
      pointer.x = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointer.y = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    }

    function render(now: number) {
      if (disposed) return;
      t = now * 0.001;

      panels.forEach((p, i) => {
        const drift = t * p.speed + p.phase;
        const scroll = variant === "reader" ? (window.scrollY || 0) * 0.0005 : 0;
        p.mesh.position.x = p.baseX + Math.sin(drift) * 0.15 + pointer.x * 0.07;
        p.mesh.position.y = p.baseY + Math.cos(drift * 0.7) * 0.11 + scroll;
        p.mesh.position.z = p.baseZ + Math.sin(drift * 0.36) * 0.16;
        p.mesh.rotation.x += Math.sin(drift + i) * 0.0007;
        p.mesh.rotation.y = -0.42 + Math.sin(drift * 0.56) * 0.22 + pointer.x * 0.035;
        p.mesh.rotation.z = Math.cos(drift * 0.48) * 0.07;
      });

      // Dust particles drift upward slowly
      const posAttr = dust.points.geometry.getAttribute("position") as BufferAttribute;
      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        const pi = i / 3;
        pos[i + 1] += 0.0003 + seededNoise(pi + 900) * 0.0003;
        if (pos[i + 1] > 3.6) pos[i + 1] = dust.originalPositions[i + 1];
        pos[i] = dust.originalPositions[i] + Math.sin(t * 0.18 + pi) * 0.06;
      }
      posAttr.needsUpdate = true;

      for (const { sprite, dx } of mistSprites) {
        sprite.position.x += dx;
        if (Math.abs(sprite.position.x) > 7) sprite.position.x *= -1;
      }

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      mistTexture.dispose();
      scene.traverse((obj: Object3D) => {
        if (obj instanceof Mesh || obj instanceof Points) {
          obj.geometry.dispose();
          const mat = obj.material;
          if ((mat as MeshBasicMaterial).map) (mat as MeshBasicMaterial).map!.dispose();
          (mat as Material).dispose();
        }
        if (obj instanceof Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  return <div className={`page-webgl-scene page-webgl-scene-${variant}`} ref={hostRef} />;
}
