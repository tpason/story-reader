"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ThreeHomeLibraryStageProps = {
  storyCount: number;
  categoryCount: number;
};

function seededNoise(seed: number) {
  const x = Math.sin(seed * 91.17) * 43758.5453;
  return x - Math.floor(x);
}

function createBookTexture(index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const colors = [
    ["#fffefa", "#0066cc"],
    ["#f6f5f2", "#dd5b00"],
    ["#f5d75e", "#26231f"],
    ["#e8f4ff", "#2a9d99"]
  ];
  const [base, accent] = colors[index % colors.length];
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accent;
  context.globalAlpha = 0.78;
  context.fillRect(0, 0, 18, canvas.height);
  context.globalAlpha = 0.32;
  context.fillRect(30, 38, 68, 8);
  context.fillRect(30, 58, 54, 6);
  context.fillRect(30, 182, 76, 5);
  context.strokeStyle = accent;
  context.globalAlpha = 0.28;
  context.lineWidth = 3;
  context.strokeRect(11, 12, canvas.width - 22, canvas.height - 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFloatingBook(index: number) {
  const texture = createBookTexture(index);
  const book = new THREE.Group();
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.74, 0.08),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: texture,
      roughness: 0.48,
      metalness: 0.04
    })
  );
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.7, 0.05),
    new THREE.MeshStandardMaterial({
      color: "#fffefa",
      roughness: 0.62
    })
  );
  pages.position.z = -0.05;
  pages.position.x = 0.02;
  book.add(pages, cover);
  return book;
}

function createShelfLine() {
  const group = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6 - index * 0.64, 0.018, 1, 1),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? "#0066cc" : "#f5d75e",
        transparent: true,
        opacity: 0.2 - index * 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    line.position.y = -1.1 - index * 0.24;
    line.position.z = -0.22 - index * 0.1;
    group.add(line);
  }
  return group;
}

export function ThreeHomeLibraryStage({ storyCount, categoryCount }: ThreeHomeLibraryStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0, 6.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "home-library-stage-canvas";
    container.appendChild(renderer.domElement);

    const bookCount = Math.min(18, Math.max(8, Math.ceil(storyCount / 6)));
    const books = Array.from({ length: bookCount }).map((_, index) => {
      const book = createFloatingBook(index);
      const column = index % 6;
      const row = Math.floor(index / 6);
      book.position.set(-2.7 + column * 0.78 + seededNoise(index + 3) * 0.18, 0.78 - row * 0.72 + seededNoise(index + 7) * 0.16, -0.3 - seededNoise(index + 11) * 1.1);
      book.rotation.set(-0.18 + seededNoise(index + 17) * 0.28, -0.42 + seededNoise(index + 23) * 0.84, -0.16 + seededNoise(index + 31) * 0.32);
      scene.add(book);
      return { book, phase: seededNoise(index + 41) * Math.PI * 2, speed: 0.35 + seededNoise(index + 47) * 0.4 };
    });

    const categoryRings = new THREE.Group();
    const ringCount = Math.min(8, Math.max(3, categoryCount));
    for (let index = 0; index < ringCount; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.54 + index * 0.18, 0.005, 8, 96),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? "#0066cc" : "#dd5b00",
          transparent: true,
          opacity: 0.09,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      ring.rotation.x = Math.PI / 2.9 + index * 0.08;
      ring.rotation.y = index * 0.18;
      categoryRings.add(ring);
    }
    categoryRings.position.set(1.9, 0.2, -0.9);

    const shelf = createShelfLine();
    scene.add(categoryRings, shelf);

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    const key = new THREE.DirectionalLight(0xffffff, 2);
    const glow = new THREE.PointLight(0xf5d75e, 1.3, 7);
    key.position.set(2.2, 3.4, 4);
    glow.position.set(1.4, 0.8, 2.2);
    scene.add(ambient, key, glow);

    const pointer = { x: 0, y: 0 };
    let frameId = 0;
    let disposed = false;

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function onPointerMove(event: PointerEvent) {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    }

    function render(now: number) {
      if (disposed) return;
      const time = now * 0.001;
      books.forEach(({ book, phase, speed }, index) => {
        book.position.y += Math.sin(time * speed + phase) * 0.0009;
        book.rotation.y += Math.sin(time * speed + phase) * 0.0015;
        book.rotation.x = -0.08 + pointer.y * 0.05 + Math.sin(time * 0.8 + index) * 0.035;
      });
      categoryRings.rotation.z = time * 0.12;
      categoryRings.rotation.y = pointer.x * 0.06;
      shelf.rotation.y = pointer.x * 0.035;
      glow.intensity = 1.1 + Math.sin(time * 1.8) * 0.18;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    resize();
    container.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", resize);
    frameId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      container.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => {
              item.map?.dispose();
              item.dispose();
            });
          } else {
            material.map?.dispose();
            material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [categoryCount, storyCount]);

  return <div className="home-library-stage" ref={hostRef} aria-hidden="true" />;
}
