"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, DirectionalLight, DoubleSide, DynamicDrawUsage, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, NormalBlending, Object3D, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, Scene, SRGBColorSpace, TorusGeometry, WebGLRenderer } from "three";
import { makeMistBandTexture } from "@/lib/three-cloud-utils";

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

  // Fixed palette: xi-jade / xi-gold / natural tones — no `#0066cc` blue or `#dd5b00` orange
  const colors: [string, string][] = [
    ["#fffefa", "#1a6b5a"],   // cream + xi-jade
    ["#f6f5f2", "#c8962e"],   // parchment + xi-gold
    ["#f5d75e", "#26231f"],   // gold + ink
    ["#e8f4ee", "#1a6b5a"],   // pale green + xi-jade
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

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createFloatingBook(index: number) {
  const texture = createBookTexture(index);
  const book = new Group();
  const cover = new Mesh(
    new BoxGeometry(0.42, 0.74, 0.08),
    new MeshStandardMaterial({ color: "#ffffff", map: texture, roughness: 0.48, metalness: 0.04 })
  );
  const pages = new Mesh(
    new BoxGeometry(0.38, 0.7, 0.05),
    new MeshStandardMaterial({ color: "#fffefa", roughness: 0.62 })
  );
  pages.position.z = -0.05;
  pages.position.x = 0.02;
  book.add(pages, cover);
  return { book, texture };
}

function createShelfLine(mistBandTexture: CanvasTexture) {
  const group = new Group();

  // Subtle shelf lines — xi-jade/xi-gold only
  for (let index = 0; index < 3; index += 1) {
    const line = new Mesh(
      new PlaneGeometry(5.6 - index * 0.64, 0.018, 1, 1),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? "#1a6b5a" : "#f5d75e",
        transparent: true,
        opacity: 0.2 - index * 0.04,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      })
    );
    line.position.y = -1.1 - index * 0.24;
    line.position.z = -0.22 - index * 0.1;
    group.add(line);
  }

  // 2 horizontal mist bands behind books
  [-0.5, 0.4].forEach((y, i) => {
    const band = new Mesh(
      new PlaneGeometry(6.8, 0.52, 1, 1),
      new MeshBasicMaterial({
        map: mistBandTexture,
        transparent: true,
        opacity: 0.04,
        blending: NormalBlending,
        depthWrite: false,
        side: DoubleSide,
      })
    );
    band.position.set(0, y, -1.4 - i * 0.3);
    group.add(band);
  });

  return group;
}

function createGoldMotes() {
  const count = 32;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seededNoise(i + 1) - 0.5) * 6.4;
    positions[i * 3 + 1] = (seededNoise(i + 2) - 0.5) * 3.2;
    positions[i * 3 + 2] = (seededNoise(i + 3) - 0.5) * 1.6;
    phases[i] = seededNoise(i + 4) * Math.PI * 2;
    speeds[i] = 0.12 + seededNoise(i + 5) * 0.22;
  }

  const geo = new BufferGeometry();
  const posAttr = new BufferAttribute(positions, 3);
  posAttr.usage = DynamicDrawUsage;
  geo.setAttribute("position", posAttr);

  const mat = new PointsMaterial({
    size: 0.042,
    color: "#f0d06a",
    transparent: true,
    opacity: 0.60,
    blending: AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  return { points: new Points(geo, mat), posAttr, phases, speeds, count };
}

export function ThreeHomeLibraryStage({ storyCount, categoryCount }: ThreeHomeLibraryStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;
    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0, 6.8);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "home-library-stage-canvas";
    container.appendChild(renderer.domElement);

    const mistBandTexture = makeMistBandTexture([200, 210, 200], 256);
    const bookCount = Math.min(18, Math.max(8, Math.ceil(storyCount / 6)));
    const bookTextures: (CanvasTexture | null)[] = [];

    const books = Array.from({ length: bookCount }).map((_, index) => {
      const { book, texture } = createFloatingBook(index);
      bookTextures.push(texture);
      const column = index % 6;
      const row = Math.floor(index / 6);
      book.position.set(
        -2.7 + column * 0.78 + seededNoise(index + 3) * 0.18,
        0.78 - row * 0.72 + seededNoise(index + 7) * 0.16,
        -0.3 - seededNoise(index + 11) * 1.1
      );
      book.rotation.set(
        -0.18 + seededNoise(index + 17) * 0.28,
        -0.42 + seededNoise(index + 23) * 0.84,
        -0.16 + seededNoise(index + 31) * 0.32
      );
      scene.add(book);
      return { book, phase: seededNoise(index + 41) * Math.PI * 2, speed: 0.35 + seededNoise(index + 47) * 0.4 };
    });

    const categoryRings = new Group();
    const ringCount = Math.min(8, Math.max(3, categoryCount));
    for (let index = 0; index < ringCount; index += 1) {
      const ring = new Mesh(
        new TorusGeometry(0.54 + index * 0.18, 0.005, 8, 96),
        new MeshBasicMaterial({
          // Fixed: was #0066cc/#dd5b00 → xi-jade/xi-gold
          color: index % 2 === 0 ? "#1a6b5a" : "#c8962e",
          transparent: true,
          opacity: 0.16,
          blending: AdditiveBlending,
          depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2.9 + index * 0.08;
      ring.rotation.y = index * 0.18;
      categoryRings.add(ring);
    }
    categoryRings.position.set(1.9, 0.2, -0.9);

    const shelf = createShelfLine(mistBandTexture);
    const motes = createGoldMotes();
    scene.add(categoryRings, shelf, motes.points);

    const ambient = new AmbientLight(0xffffff, 1.5);
    const key = new DirectionalLight(0xffffff, 2);
    const glow = new PointLight(0xf5d75e, 1.3, 7);
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
      // Vary each ring's rotation speed for more life
      categoryRings.children.forEach((ring, i) => {
        (ring as Mesh).rotation.z += (i % 2 === 0 ? 0.005 : -0.003);
      });

      shelf.rotation.y = pointer.x * 0.035;

      // Gold motes drift upward gently
      const posArr = motes.posAttr.array as Float32Array;
      for (let i = 0; i < motes.count; i++) {
        posArr[i * 3 + 1] += motes.speeds[i] * 0.0008;
        posArr[i * 3] += Math.sin(time * 0.3 + motes.phases[i]) * 0.0006;
        if (posArr[i * 3 + 1] > 1.8) posArr[i * 3 + 1] = -1.8;
      }
      motes.posAttr.needsUpdate = true;

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
      mistBandTexture.dispose();
      bookTextures.forEach((t) => t?.dispose());
      motes.points.geometry.dispose();
      (motes.points.material as PointsMaterial).dispose();
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh || object instanceof Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => { (item as MeshBasicMaterial).map?.dispose(); item.dispose(); });
          } else {
            (material as MeshBasicMaterial).map?.dispose();
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
