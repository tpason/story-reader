"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, AmbientLight, BoxGeometry, CanvasTexture, DirectionalLight, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PointLight, Scene, SRGBColorSpace, TextureLoader, TorusGeometry, WebGLRenderer } from "three";

type ThreeStoryStageProps = {
  coverImageUrl?: string | null;
  title: string;
  progressPercent?: number;
};

function createTitleTexture(title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#f6f0dd";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(0, 102, 204, 0.16)";
  context.fillRect(28, 28, canvas.width - 56, canvas.height - 56);
  context.strokeStyle = "rgba(221, 91, 0, 0.38)";
  context.lineWidth = 6;
  context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  context.fillStyle = "#26231f";
  context.font = "700 42px serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const words = title.split(/\s+/).slice(0, 12);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > 360 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, 5).forEach((text, index) => {
    context.fillText(text, canvas.width / 2, 280 + index * 56);
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createPageFan() {
  const group = new Group();
  for (let index = 0; index < 9; index += 1) {
    const page = new Mesh(
      new PlaneGeometry(1.15, 1.72, 6, 8),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? "#fffefa" : "#f2ead8",
        transparent: true,
        opacity: 0.22 - index * 0.012,
        side: DoubleSide,
        depthWrite: false
      })
    );
    page.position.set(0.18 + index * 0.045, -0.02 + index * 0.01, -0.08 - index * 0.045);
    page.rotation.y = -0.22 - index * 0.035;
    page.rotation.z = 0.06 + index * 0.018;
    group.add(page);
  }
  return group;
}

function createMandala() {
  const group = new Group();
  for (let index = 0; index < 5; index += 1) {
    const ring = new Mesh(
      new TorusGeometry(0.86 + index * 0.22, 0.006, 8, 128),
      new MeshBasicMaterial({
        color: index % 2 === 0 ? "#f5d75e" : "#0066cc",
        transparent: true,
        opacity: 0.15,
        blending: AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = Math.PI / 2.8 + index * 0.08;
    ring.rotation.y = index * 0.2;
    group.add(ring);
  }
  return group;
}

export function ThreeStoryStage({ coverImageUrl, title, progressPercent = 0 }: ThreeStoryStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progressPercent);

  useEffect(() => {
    progressRef.current = progressPercent;
  }, [progressPercent]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = host;
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0, 5.8);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "story-stage-canvas";
    container.appendChild(renderer.domElement);

    const texture = createTitleTexture(title);
    const coverMaterial = new MeshStandardMaterial({
      color: "#ffffff",
      map: texture,
      roughness: 0.42,
      metalness: 0.06
    });

    if (coverImageUrl) {
      new TextureLoader().load(
        coverImageUrl,
        (loadedTexture) => {
          loadedTexture.colorSpace = SRGBColorSpace;
          coverMaterial.map?.dispose();
          coverMaterial.map = loadedTexture;
          coverMaterial.needsUpdate = true;
        },
        undefined,
        () => undefined
      );
    }

    const bookGroup = new Group();
    const cover = new Mesh(new BoxGeometry(1.26, 1.84, 0.11), coverMaterial);
    const spine = new Mesh(
      new BoxGeometry(0.12, 1.86, 0.18),
      new MeshStandardMaterial({
        color: "#dd5b00",
        emissive: "#f5d75e",
        emissiveIntensity: 0.08,
        roughness: 0.5
      })
    );
    spine.position.x = -0.69;
    const pages = createPageFan();
    const mandala = createMandala();
    mandala.position.z = -0.42;

    bookGroup.add(pages, cover, spine);
    bookGroup.rotation.y = -0.35;
    bookGroup.rotation.x = 0.08;
    scene.add(bookGroup, mandala);

    const ambient = new AmbientLight(0xffffff, 1.7);
    const key = new DirectionalLight(0xffffff, 2.4);
    const glow = new PointLight(0xf5d75e, 1.7, 6);
    key.position.set(2, 3, 4);
    glow.position.set(-1.6, 1.2, 2.4);
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
      const progress = Math.min(1, Math.max(0, progressRef.current / 100));
      bookGroup.rotation.y = -0.35 + pointer.x * 0.22 + Math.sin(time * 0.7) * 0.035;
      bookGroup.rotation.x = 0.08 - pointer.y * 0.08 + Math.cos(time * 0.6) * 0.018;
      bookGroup.position.y = Math.sin(time * 0.9) * 0.045;
      mandala.rotation.z = time * (0.12 + progress * 0.18);
      mandala.scale.setScalar(0.92 + progress * 0.16 + Math.sin(time * 1.3) * 0.025);
      glow.intensity = 1.1 + progress * 1.3 + Math.sin(time * 2) * 0.18;
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
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh) {
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
  }, [coverImageUrl, title]);

  return <div className="story-stage" ref={hostRef} aria-hidden="true" />;
}
