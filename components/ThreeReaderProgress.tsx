"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CircleGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Points, PointsMaterial, Scene, TorusGeometry, WebGLRenderer } from "three";

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
    renderer.domElement.className = "reader-progress-webgl-canvas";
    container.appendChild(renderer.domElement);

    const scrollGroup = new Group();

    const parchment = new Mesh(
      new BoxGeometry(5.6, 0.052, 0.035),
      new MeshBasicMaterial({ color: "#f5d75e", transparent: true, opacity: 0.22 })
    );

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

    // ── 20-particle linh-qi burst system ────────────────────────────────
    const BURST_COUNT = 20;
    const burstPositions = new Float32Array(BURST_COUNT * 3);
    const burstGeo = new BufferGeometry();
    const burstPosAttr = new BufferAttribute(burstPositions, 3);
    burstPosAttr.usage = DynamicDrawUsage;
    burstGeo.setAttribute("position", burstPosAttr);

    const burstMat = new PointsMaterial({
      color: "#f0d06a",
      size: 0.065,
      transparent: true,
      opacity: 0.0,
      blending: AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const burstMesh = new Points(burstGeo, burstMat);
    scene.add(burstMesh);

    const burstParticles = Array.from({ length: BURST_COUNT }, (_, i) => ({
      life: i / BURST_COUNT,
      speed: 0.5 + Math.random() * 0.8,
      angle: (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.4,
      spiralFactor: 0.8 + Math.random() * 0.5,
    }));

    // ── Completion ring pulse ─────────────────────────────────────────
    const completionRing = new Mesh(
      new TorusGeometry(0.28, 0.012, 8, 64),
      new MeshBasicMaterial({
        color: "#f5d75e",
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      })
    );
    completionRing.position.x = 2.8;
    scene.add(completionRing);

    let completionPulseStart = -9999;
    let lastProgress = 0;

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
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (!disposed && frameId === 0) {
        frameId = window.requestAnimationFrame(render);
      }
    }

    function render(now: number) {
      if (disposed) return;
      frameId = window.requestAnimationFrame(render);
      if (now - lastRender < FRAME_MS) return;
      lastRender = now;
      const t = now * 0.001;
      const target = Math.min(1, Math.max(0.001, progressRef.current / 100));

      // Detect progress jump for burst trigger
      if (target - lastProgress > 0.005) {
        burstParticles.forEach((p, i) => {
          p.life = i / BURST_COUNT * 0.5;
        });
      }
      // Detect 100% completion
      if (target >= 0.999 && lastProgress < 0.999) {
        completionPulseStart = now;
      }
      lastProgress = target;

      fill.scale.x += (target - fill.scale.x) * 0.14;
      fill.position.x = -2.8 + (fill.scale.x * 5.6) / 2;
      glow.scale.x = fill.scale.x;
      glow.position.x = fill.position.x;
      const pulse = 0.10 + Math.sin(t * 2.4) * 0.052;
      (glow.material as MeshBasicMaterial).opacity = pulse * Math.min(1, fill.scale.x * 5);

      rightRoll.position.x = -2.92 + fill.scale.x * 5.84;
      rightRoll.rotation.z = now * 0.0028;
      leftRoll.rotation.z = -now * 0.0018;
      scrollGroup.rotation.x = Math.sin(now * 0.0014) * 0.03;

      // Burst particles spiral outward from fill tip
      const emitX = rightRoll.position.x;
      const emitY = 0;
      for (let i = 0; i < BURST_COUNT; i++) {
        const p = burstParticles[i];
        p.life += 0.011 * p.speed;
        if (p.life > 1) {
          p.life = 0;
          p.angle = (i / BURST_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        }
        const age = p.life;
        const radius = age * 0.62 * p.spiralFactor;
        const spiralAngle = p.angle + age * 1.8;
        burstPosAttr.array[i * 3] = emitX + Math.cos(spiralAngle) * radius;
        burstPosAttr.array[i * 3 + 1] = emitY + Math.sin(spiralAngle) * radius * 0.5 + age * 0.22;
        burstPosAttr.array[i * 3 + 2] = 0.05;
      }
      burstPosAttr.needsUpdate = true;
      // Opacity fades: gold at start → transparent at end
      burstMat.opacity = 0.85 * Math.min(1, fill.scale.x * 4);
      // Tint from gold → near-white as age increases (handled by particle age fade)

      // Completion ring pulse: scale 0→2, opacity 1→0 over 800ms
      if (completionPulseStart > 0) {
        const age = Math.min(1, (now - completionPulseStart) / 800);
        completionRing.scale.setScalar(0.4 + age * 2.2);
        (completionRing.material as MeshBasicMaterial).opacity = Math.max(0, (1 - age) * 0.55);
      }

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
      burstGeo.dispose();
      burstMat.dispose();
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh || object instanceof Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="reader-progress-webgl" ref={hostRef} />;
}
