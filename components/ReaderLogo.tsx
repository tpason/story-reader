"use client";

import { BookOpenText, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type * as ThreeNamespace from "three";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

export function ReaderLogo() {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const decorativeWebglEnabled = useDecorativeWebglEnabled();

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !decorativeWebglEnabled) {
      setWebglReady(false);
      return;
    }
    const container = host;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    async function mountLogo() {
      const THREE = (await import("three")) as typeof ThreeNamespace;
      if (cancelled) return;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.15, -1.15, 0.1, 10);
      camera.position.z = 4;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(32, 32, false);
      renderer.domElement.className = "brand-mark-canvas";
      container.appendChild(renderer.domElement);

      const pageMaterial = new THREE.MeshStandardMaterial({
        color: "#fff4d8",
        emissive: "#6d4e1f",
        emissiveIntensity: 0.08,
        roughness: 0.72,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const edgeMaterial = new THREE.MeshStandardMaterial({
        color: "#d9a441",
        emissive: "#8f5b13",
        emissiveIntensity: 0.22,
        roughness: 0.48,
        metalness: 0.18
      });
      const jadeMaterial = new THREE.MeshStandardMaterial({
        color: "#2fb7a5",
        emissive: "#0f766e",
        emissiveIntensity: 0.26,
        roughness: 0.36,
        metalness: 0.16
      });

      const leftPage = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 1.04, 6, 4), pageMaterial);
      leftPage.position.set(-0.28, -0.03, 0);
      leftPage.rotation.y = 0.34;
      leftPage.rotation.z = -0.08;
      scene.add(leftPage);

      const rightPage = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 1.04, 6, 4), pageMaterial);
      rightPage.position.set(0.28, -0.03, 0);
      rightPage.rotation.y = -0.34;
      rightPage.rotation.z = 0.08;
      scene.add(rightPage);

      const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.98, 5, 10), edgeMaterial);
      spine.position.set(0, -0.04, 0.04);
      scene.add(spine);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.025, 8, 48), jadeMaterial);
      ring.position.set(0, 0, -0.08);
      ring.rotation.x = 0.22;
      scene.add(ring);

      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: "#f5d75e",
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sparks = Array.from({ length: 6 }).map((_, index) => {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.032 + (index % 3) * 0.006, 10, 10), sparkMaterial.clone());
        spark.position.set(Math.cos(index * 1.047) * 0.72, Math.sin(index * 1.047) * 0.62, 0.18);
        scene.add(spark);
        return spark;
      });

      const ambient = new THREE.AmbientLight(0xffffff, 1.4);
      const key = new THREE.DirectionalLight(0xffedbd, 1.8);
      key.position.set(1.4, 1.8, 2.4);
      scene.add(ambient, key);

      let frameId = 0;
      let disposed = false;
      setWebglReady(true);

      function render(now: number) {
        if (disposed) return;
        const time = now * 0.001;
        ring.rotation.z = time * 0.38;
        leftPage.rotation.y = 0.32 + Math.sin(time * 1.4) * 0.035;
        rightPage.rotation.y = -0.32 - Math.sin(time * 1.4) * 0.035;
        spine.scale.y = 1 + Math.sin(time * 1.3) * 0.025;
        sparks.forEach((spark, index) => {
          const angle = time * (0.52 + index * 0.025) + index * 1.047;
          spark.position.x = Math.cos(angle) * (0.66 + (index % 2) * 0.08);
          spark.position.y = Math.sin(angle) * (0.58 + (index % 3) * 0.04);
          spark.scale.setScalar(0.78 + Math.sin(time * 2.2 + index) * 0.28);
        });
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(render);
      }

      frameId = window.requestAnimationFrame(render);

      cleanup = () => {
        disposed = true;
        window.cancelAnimationFrame(frameId);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
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
        renderer.domElement.remove();
      };
    }

    void mountLogo();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [decorativeWebglEnabled]);

  return (
    <span className="brand-mark" ref={hostRef} data-webgl-ready={webglReady ? "true" : "false"} aria-hidden="true">
      <span className="brand-mark-fallback">
        <BookOpenText className="brand-book" size={18} strokeWidth={2.2} />
        <Sparkles className="brand-spark" size={9} strokeWidth={2.4} />
      </span>
    </span>
  );
}
