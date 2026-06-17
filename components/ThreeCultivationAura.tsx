"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, DynamicDrawUsage, Group, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Points, PointsMaterial, Scene, Shape, ShapeGeometry, SRGBColorSpace, TorusGeometry, WebGLRenderer } from "three";

type ThreeCultivationAuraProps = {
  realm: string;
  level: number;
  progressPercent: number;
};

const REALM_COLORS: Record<string, [string, string]> = {
  foundation: ["#2dd4bf", "#1a6b5a"],
  core: ["#f5d75e", "#c8962e"],
  soul: ["#a78bfa", "#ec4899"],
  spirit: ["#a78bfa", "#38bdf8"],
  void: ["#60a5fa", "#ffffff"],
  union: ["#60a5fa", "#f5d75e"],
  ascension: ["#ffffff", "#f5d75e"]
};

function colorsForRealm(realm: string): [string, string] {
  return REALM_COLORS[realm] ?? ["#f5d75e", "#1a6b5a"];
}

function makeDiamondSpoke() {
  const shape = new Shape();
  const w = 0.009;
  const h = 0.55;
  shape.moveTo(0, h);
  shape.lineTo(w, h * 0.35);
  shape.lineTo(w * 0.6, 0);
  shape.lineTo(w, -h * 0.35);
  shape.lineTo(0, -h);
  shape.lineTo(-w, -h * 0.35);
  shape.lineTo(-w * 0.6, 0);
  shape.lineTo(-w, h * 0.35);
  shape.closePath();
  return new ShapeGeometry(shape);
}

function makeGlowDiscTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const [r, g, b] = hexToRgb(color);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.72)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.38)`);
  grad.addColorStop(0.70, `rgba(${r},${g},${b},0.12)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ThreeCultivationAura({ realm, level, progressPercent }: ThreeCultivationAuraProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progressPercent);

  useEffect(() => {
    progressRef.current = progressPercent;
  }, [progressPercent]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;
    const [primary, secondary] = colorsForRealm(realm);
    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0, 5.2);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
    renderer.domElement.className = "cultivation-aura-canvas";
    container.appendChild(renderer.domElement);

    const group = new Group();

    // Inner glow disc
    const glowTex = makeGlowDiscTexture(primary);
    const glowDisc = new Mesh(
      new CircleGeometry(0.42, 48),
      new MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.15,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      })
    );
    group.add(glowDisc);

    const ringCount = Math.min(8, Math.max(3, Math.floor(level / 4) + 3));
    const rings = Array.from({ length: ringCount }).map((_, index) => {
      const mesh = new Mesh(
        new TorusGeometry(0.58 + index * 0.18, 0.006, 8, 96),
        new MeshBasicMaterial({
          color: index % 2 === 0 ? primary : secondary,
          transparent: true,
          opacity: 0.16,
          blending: AdditiveBlending,
          depthWrite: false,
        })
      );
      mesh.rotation.x = Math.PI / 2.6 + index * 0.08;
      mesh.rotation.y = index * 0.25;
      group.add(mesh);
      return mesh;
    });

    // Diamond spokes (tapered ShapeGeometry instead of flat PlaneGeometry)
    const diamondGeo = makeDiamondSpoke();
    const spokes = Array.from({ length: 12 }).map((_, index) => {
      const spoke = new Mesh(
        diamondGeo,
        new MeshBasicMaterial({
          color: index % 3 === 0 ? secondary : primary,
          transparent: true,
          opacity: 0.12,
          blending: AdditiveBlending,
          side: DoubleSide,
          depthWrite: false,
        })
      );
      spoke.rotation.z = (index / 12) * Math.PI * 2;
      group.add(spoke);
      return spoke;
    });

    // Orbital qi motes — 3 groups × 8 particles, each orbiting one ring level
    const orbitGroups = [0, 1, 2].map((level) => {
      const count = 8;
      const orbitR = 0.58 + level * 0.18;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        positions[i * 3] = Math.cos(a) * orbitR;
        positions[i * 3 + 1] = Math.sin(a) * orbitR * 0.5;
        positions[i * 3 + 2] = 0;
      }
      const geo = new BufferGeometry();
      const posAttr = new BufferAttribute(positions, 3);
      posAttr.usage = DynamicDrawUsage;
      geo.setAttribute("position", posAttr);
      const mat = new PointsMaterial({
        size: 0.028 + level * 0.008,
        color: level % 2 === 0 ? primary : secondary,
        transparent: true,
        opacity: 0.65,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const pts = new Points(geo, mat);
      group.add(pts);
      return { pts, posAttr, orbitR, speed: 0.28 - level * 0.06, count };
    });

    scene.add(group);
    let frameId = 0;
    let disposed = false;
    let lastRender = 0;
    const FRAME_MS = 1000 / 30;

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function handleVisibility() {
      if (document.hidden) { window.cancelAnimationFrame(frameId); frameId = 0; }
      else if (!disposed && frameId === 0) frameId = window.requestAnimationFrame(render);
    }

    function render(now: number) {
      if (disposed) return;
      frameId = window.requestAnimationFrame(render);
      if (now - lastRender < FRAME_MS) return;
      lastRender = now;
      const time = now * 0.001;
      const progress = Math.min(1, Math.max(0, progressRef.current / 100));
      group.rotation.z = time * 0.12;

      // Inner glow pulses with progress
      glowDisc.scale.setScalar(0.8 + progress * 0.55 + Math.sin(time * 1.2) * 0.06);
      (glowDisc.material as MeshBasicMaterial).opacity = 0.12 + progress * 0.14 + Math.sin(time * 0.8) * 0.04;

      rings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 0.006 : -0.004) * (1 + progress);
        ring.scale.setScalar(0.88 + progress * 0.22 + Math.sin(time * 1.3 + index) * 0.025);
        (ring.material as MeshBasicMaterial).opacity = 0.11 + progress * 0.1;
      });

      spokes.forEach((spoke, index) => {
        spoke.scale.y = 0.78 + progress * 0.52 + Math.sin(time * 1.8 + index) * 0.08;
        (spoke.material as MeshBasicMaterial).opacity = 0.08 + progress * 0.08;
      });

      // Orbit qi motes around their ring radius
      orbitGroups.forEach((og) => {
        const posArr = og.posAttr.array as Float32Array;
        for (let i = 0; i < og.count; i++) {
          const a = (i / og.count) * Math.PI * 2 + time * og.speed;
          const pulse = og.orbitR + Math.sin(time * 0.4 + i) * 0.04;
          posArr[i * 3] = Math.cos(a) * pulse;
          posArr[i * 3 + 1] = Math.sin(a) * pulse * 0.5;
        }
        og.posAttr.needsUpdate = true;
        (og.pts.material as PointsMaterial).opacity = 0.45 + progress * 0.28;
      });

      renderer.render(scene, camera);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    frameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      glowTex.dispose();
      diamondGeo.dispose();
      orbitGroups.forEach((og) => { og.pts.geometry.dispose(); (og.pts.material as PointsMaterial).dispose(); });
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [level, realm]);

  return <div className="cultivation-aura" ref={hostRef} aria-hidden="true" />;
}
