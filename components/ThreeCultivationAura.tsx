"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ThreeCultivationAuraProps = {
  realm: string;
  level: number;
  progressPercent: number;
};

const REALM_COLORS: Record<string, [string, string]> = {
  foundation: ["#2dd4bf", "#0066cc"],
  core: ["#f5d75e", "#dd5b00"],
  soul: ["#a78bfa", "#ec4899"],
  spirit: ["#a78bfa", "#38bdf8"],
  void: ["#60a5fa", "#ffffff"],
  union: ["#60a5fa", "#f5d75e"],
  ascension: ["#ffffff", "#f5d75e"]
};

function colorsForRealm(realm: string) {
  return REALM_COLORS[realm] ?? ["#f5d75e", "#0066cc"];
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
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.domElement.className = "cultivation-aura-canvas";
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    const ringCount = Math.min(8, Math.max(3, Math.floor(level / 4) + 3));
    const rings = Array.from({ length: ringCount }).map((_, index) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.58 + index * 0.18, 0.006, 8, 96),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? primary : secondary,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      mesh.rotation.x = Math.PI / 2.6 + index * 0.08;
      mesh.rotation.y = index * 0.25;
      group.add(mesh);
      return mesh;
    });

    const spokes = Array.from({ length: 12 }).map((_, index) => {
      const spoke = new THREE.Mesh(
        new THREE.PlaneGeometry(0.018, 1.1, 1, 1),
        new THREE.MeshBasicMaterial({
          color: index % 3 === 0 ? secondary : primary,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      spoke.rotation.z = (index / 12) * Math.PI * 2;
      group.add(spoke);
      return spoke;
    });

    scene.add(group);

    let frameId = 0;
    let disposed = false;

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function render(now: number) {
      if (disposed) return;
      const time = now * 0.001;
      const progress = Math.min(1, Math.max(0, progressRef.current / 100));
      group.rotation.z = time * 0.12;
      rings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 0.006 : -0.004) * (1 + progress);
        ring.scale.setScalar(0.88 + progress * 0.22 + Math.sin(time * 1.3 + index) * 0.025);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.11 + progress * 0.1;
      });
      spokes.forEach((spoke, index) => {
        spoke.scale.y = 0.78 + progress * 0.52 + Math.sin(time * 1.8 + index) * 0.08;
      });
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
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
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
