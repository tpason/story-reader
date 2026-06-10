"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Points, PointsMaterial, Scene, WebGLRenderer } from "three";

type ThreeReaderProgressProps = {
  progress: number;
};

export function ThreeReaderProgress({ progress }: ThreeReaderProgressProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0, 4.2);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.domElement.className = "reader-progress-webgl-canvas";
    container.appendChild(renderer.domElement);

    const scrollGroup = new Group();

    // Parchment track
    const parchment = new Mesh(
      new BoxGeometry(5.6, 0.052, 0.035),
      new MeshBasicMaterial({ color: "#f5d75e", transparent: true, opacity: 0.22 })
    );

    // Gold linh-qi fill
    const fill = new Mesh(
      new BoxGeometry(5.6, 0.07, 0.04),
      new MeshBasicMaterial({
        color: "#f0d06a",
        transparent: true,
        opacity: 0.88,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    fill.position.x = -2.8;
    fill.scale.x = 0.001;

    // Pulsing glow halo behind fill
    const glow = new Mesh(
      new BoxGeometry(5.6, 0.22, 0.04),
      new MeshBasicMaterial({
        color: "#c8962e",
        transparent: true,
        opacity: 0.0,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.x = -2.8;
    glow.scale.x = 0.001;

    // Scroll ends — dark ink-wood
    const leftRoll = new Mesh(
      new CylinderGeometry(0.07, 0.07, 0.22, 24),
      new MeshBasicMaterial({ color: "#5c3a1e", transparent: true, opacity: 0.52 })
    );
    leftRoll.rotation.x = Math.PI / 2;
    leftRoll.position.x = -2.92;

    const rightRoll = leftRoll.clone();
    rightRoll.position.x = -2.92;

    scrollGroup.add(parchment, glow, fill, leftRoll, rightRoll);
    scene.add(scrollGroup);

    // Spirit sparkle particles emitting from right scroll end
    const sparkleCount = 10;
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleGeom = new BufferGeometry();
    sparkleGeom.setAttribute("position", new BufferAttribute(sparklePositions, 3));
    const sparkleMat = new PointsMaterial({
      color: "#f0d06a",
      size: 0.055,
      transparent: true,
      opacity: 0.0,
      blending: AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const sparkleMesh = new Points(sparkleGeom, sparkleMat);
    scene.add(sparkleMesh);

    const sparkleLife = Array.from({ length: sparkleCount }, (_, i) => ({
      life: i / sparkleCount,
      speed: 0.4 + Math.random() * 0.6,
      offsetX: (Math.random() - 0.5) * 0.28,
      offsetY: Math.random() * 0.1,
    }));

    let frameId = 0;
    let disposed = false;

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function handleVisibility() {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (!disposed && frameId === 0) {
        frameId = window.requestAnimationFrame(render);
      }
    }

    function render(now: number) {
      if (disposed) return;
      const t = now * 0.001;
      const target = Math.min(1, Math.max(0.001, progressRef.current / 100));
      fill.scale.x += (target - fill.scale.x) * 0.14;
      fill.position.x = -2.8 + (fill.scale.x * 5.6) / 2;

      // Sync glow with fill
      glow.scale.x = fill.scale.x;
      glow.position.x = fill.position.x;
      const pulse = 0.10 + Math.sin(t * 2.4) * 0.052;
      (glow.material as MeshBasicMaterial).opacity = pulse * Math.min(1, fill.scale.x * 5);

      rightRoll.position.x = -2.92 + fill.scale.x * 5.84;
      rightRoll.rotation.z = now * 0.0028;
      leftRoll.rotation.z = -now * 0.0018;
      scrollGroup.rotation.x = Math.sin(now * 0.0014) * 0.03;

      // Sparkles rising from right scroll end
      const emitX = rightRoll.position.x;
      const posAttr = sparkleGeom.attributes.position as BufferAttribute;
      for (let i = 0; i < sparkleCount; i++) {
        const s = sparkleLife[i];
        s.life += 0.009 * s.speed;
        if (s.life > 1) {
          s.life = 0;
          s.offsetX = (Math.random() - 0.5) * 0.28;
          s.offsetY = Math.random() * 0.1;
        }
        posAttr.setXYZ(i, emitX + s.offsetX, s.life * 0.42 - 0.05 + s.offsetY, 0.05);
      }
      posAttr.needsUpdate = true;
      sparkleMat.opacity = 0.72 * Math.min(1, fill.scale.x * 4);

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
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
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      sparkleGeom.dispose();
      sparkleMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="reader-progress-webgl" ref={hostRef} />;
}
