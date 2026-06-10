"use client";

import { useEffect, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, DoubleSide, DynamicDrawUsage, Group, Material, Mesh, MeshBasicMaterial, NormalBlending, Object3D, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, Scene, ShaderMaterial, Shape, ShapeGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Texture, TorusGeometry, WebGLRenderer } from "three";

type ThreeReaderAtmosphereProps = {
  chapterNumber: number;
  progress: number;
  autoScrollEnabled: boolean;
  theme: "light" | "sepia" | "dark";
};

type XianxiaSkyRig = {
  group: Group;
  sky: Mesh<PlaneGeometry, ShaderMaterial>;
  sun: Mesh<CircleGeometry, MeshBasicMaterial>;
  sunGlow: Sprite;
  mountains: Mesh[];
  clouds: Mesh[];
};

const THEME_COLORS = {
  light: {
    primary: "#c8962e",
    secondary: "#f0d06a",
    paper: "#fffefa",
    opacity: 0.72
  },
  sepia: {
    primary: "#c07320",
    secondary: "#f0d06a",
    paper: "#f3ead8",
    opacity: 0.68
  },
  dark: {
    primary: "#26a882",
    secondary: "#f0d06a",
    paper: "#1e1a16",
    opacity: 0.58
  }
} satisfies Record<ThreeReaderAtmosphereProps["theme"], { primary: string; secondary: string; paper: string; opacity: number }>;

function seededNoise(seed: number) {
  const x = Math.sin(seed * 42.123) * 43758.5453;
  return x - Math.floor(x);
}

function makeDiscTexture(size = 128): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.75)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.2)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

function makeMistTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const blobs: [number, number, number, number][] = [
    [256, 220, 200, 0.18],
    [160, 280, 160, 0.12],
    [360, 245, 170, 0.14],
    [270, 265, 130, 0.09],
    [200, 190, 140, 0.10],
  ];
  for (const [x, y, r, a] of blobs) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(230,220,200,${a})`);
    grad.addColorStop(1, "rgba(200,200,190,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  return new CanvasTexture(canvas);
}

function makeGlowSprite(r: number, g: number, b: number, worldSize: number, opacity: number): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.3, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(0.7, `rgba(${r},${g},${b},0.15)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const mat = new SpriteMaterial({
    map: new CanvasTexture(canvas),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new Sprite(mat);
  sprite.scale.setScalar(worldSize);
  return sprite;
}

function createSealTexture(chapterNumber: number, primary: string, secondary: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.translate(128, 128);

  // Outer glow ring
  const grad = context.createRadialGradient(0, 0, 60, 0, 0, 110);
  grad.addColorStop(0, "rgba(255,220,80,0.0)");
  grad.addColorStop(0.7, "rgba(255,220,80,0.06)");
  grad.addColorStop(1, "rgba(255,220,80,0)");
  context.fillStyle = grad;
  context.fillRect(-128, -128, 256, 256);

  context.strokeStyle = secondary;
  context.fillStyle = primary;
  context.globalAlpha = 0.72;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, 86, 0, Math.PI * 2);
  context.stroke();

  context.globalAlpha = 0.42;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, 0, 60, 0, Math.PI * 2);
  context.stroke();

  // Tick marks
  for (let i = 0; i < 24; i++) {
    context.save();
    context.rotate((i / 24) * Math.PI * 2);
    context.globalAlpha = i % 4 === 0 ? 0.52 : i % 2 === 0 ? 0.28 : 0.14;
    const len = i % 4 === 0 ? 14 : 8;
    context.fillRect(-1.2, -94, 2.4, len);
    context.restore();
  }

  // Chapter glyph
  context.globalAlpha = 0.88;
  context.font = "700 48px serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = secondary;
  context.fillText(String(chapterNumber), 0, 4);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// Shader-based pulsing particles (technique 3B)
const PARTICLE_VS = `
  attribute float size;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const PARTICLE_FS = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    gl_FragColor = vec4(vColor, tex.a * 0.7);
    if (gl_FragColor.a < 0.02) discard;
  }
`;

function createAmbientParticles(primary: string, secondary: string, discTexture: CanvasTexture) {
  const count = 160;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const baseSizes = new Float32Array(count);
  const primaryColor = new Color(primary);
  const secondaryColor = new Color(secondary);
  const jade = new Color("#26a882");

  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    positions[i * 3] = side * (2.1 + seededNoise(i + 3) * 2.2);
    positions[i * 3 + 1] = -2.8 + seededNoise(i + 9) * 5.6;
    positions[i * 3 + 2] = -1.4 + seededNoise(i + 17) * 2.6;

    const colorPick = i % 5;
    const color = colorPick < 2 ? secondaryColor : colorPick < 4 ? primaryColor : jade;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    baseSizes[i] = 6 + seededNoise(i + 43) * 10;
    sizes[i] = baseSizes[i];
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions.slice(), 3));
  geo.setAttribute("aColor", new BufferAttribute(colors, 3));
  const sizeAttr = new BufferAttribute(sizes, 1);
  sizeAttr.usage = DynamicDrawUsage;
  geo.setAttribute("size", sizeAttr);

  const mat = new ShaderMaterial({
    uniforms: { pointTexture: { value: discTexture } },
    vertexShader: PARTICLE_VS,
    fragmentShader: PARTICLE_FS,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });

  return {
    points: new Points(geo, mat),
    originalPositions: positions.slice(),
    sizes,
    baseSizes,
    sizeAttr
  };
}

function createStarParticles(discTexture: CanvasTexture) {
  const count = 240;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const warmPalette = [
    new Color(1.0, 0.97, 0.88),
    new Color(1.0, 0.94, 0.72),
    new Color(0.90, 0.96, 1.0),
  ];

  for (let i = 0; i < count; i++) {
    const theta = seededNoise(i * 3 + 1) * Math.PI * 2;
    const phi = Math.acos(2 * seededNoise(i * 3 + 2) - 1);
    const r = 5 + seededNoise(i * 3 + 3) * 4;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
    positions[i * 3 + 2] = r * Math.cos(phi);
    const col = seededNoise(i + 500) < 0.08 ? warmPalette[2] : seededNoise(i + 600) < 0.3 ? warmPalette[1] : warmPalette[0];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return new Points(
    geo,
    new PointsMaterial({
      size: 0.018,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      map: discTexture,
      alphaTest: 0.05,
      depthWrite: false,
    })
  );
}

function createMistSprites(mistTexture: CanvasTexture, theme: ThreeReaderAtmosphereProps["theme"]) {
  const sprites: { sprite: Sprite; dx: number; phase: number }[] = [];
  const baseOpacity = theme === "dark" ? 0.07 : 0.06;

  for (let i = 0; i < 6; i++) {
    const mat = new SpriteMaterial({
      map: mistTexture,
      transparent: true,
      opacity: baseOpacity + seededNoise(i + 200) * 0.04,
      blending: NormalBlending,
      depthWrite: false,
    });
    const sprite = new Sprite(mat);
    sprite.scale.set(
      5 + seededNoise(i + 201) * 4,
      1.4 + seededNoise(i + 202) * 1.6,
      1
    );
    sprite.position.set(
      (seededNoise(i + 203) - 0.5) * 10,
      (seededNoise(i + 204) - 0.5) * 3.2,
      -1.2 - seededNoise(i + 205) * 2
    );
    sprites.push({ sprite, dx: (seededNoise(i + 206) - 0.5) * 0.004, phase: seededNoise(i + 207) * Math.PI * 2 });
  }
  return sprites;
}

function createMountainLayer(color: string, seed: number, width: number, height: number, baseY: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, baseY);
  const points = 14;
  for (let i = 0; i <= points; i++) {
    const x = -width / 2 + (i / points) * width;
    const peak = baseY + 0.18 + seededNoise(seed + i * 17) * height;
    const ridge = peak + Math.sin(i * 1.3 + seed) * 0.09;
    shape.lineTo(x, ridge);
  }
  shape.lineTo(width / 2, baseY - 0.7);
  shape.lineTo(-width / 2, baseY - 0.7);
  shape.lineTo(-width / 2, baseY);

  return new Mesh(
    new ShapeGeometry(shape),
    new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );
}

function createXianxiaSky(primary: string, secondary: string, paper: string, theme: ThreeReaderAtmosphereProps["theme"]): XianxiaSkyRig {
  const group = new Group();
  const sky = new Mesh(
    new PlaneGeometry(9.4, 5.6, 1, 1),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPhase: { value: 0 },
        uTime: { value: 0 },
        uDawn: {
          value: new Color(
            theme === "dark" ? "#0d1520" : theme === "sepia" ? "#f6a86a" : "#ffc97a"
          )
        },
        uNoon: {
          value: new Color(
            theme === "dark" ? "#0f2038" : theme === "sepia" ? "#c9d4c0" : "#c2e4ff"
          )
        },
        uDusk: {
          value: new Color(
            theme === "dark" ? "#251530" : theme === "sepia" ? "#e89a60" : "#ffa070"
          )
        },
        uAurora: {
          value: new Color(theme === "dark" ? "#1a4040" : "#9ad4b8")
        },
        uPaper: { value: new Color(paper) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPhase;
        uniform float uTime;
        uniform vec3 uDawn;
        uniform vec3 uNoon;
        uniform vec3 uDusk;
        uniform vec3 uAurora;
        uniform vec3 uPaper;
        varying vec2 vUv;

        void main() {
          float dawnToNoon = smoothstep(0.0, 0.52, uPhase);
          float noonToDusk = smoothstep(0.48, 1.0, uPhase);
          vec3 skyColor = mix(uDawn, uNoon, dawnToNoon);
          skyColor = mix(skyColor, uDusk, noonToDusk);

          // Aurora shimmer band
          float auroraY = smoothstep(0.62, 0.78, vUv.y) * smoothstep(0.98, 0.80, vUv.y);
          float auroraWave = sin(vUv.x * 8.0 + uTime * 0.3) * 0.5 + 0.5;
          skyColor = mix(skyColor, uAurora, auroraY * auroraWave * 0.28);

          float horizon = smoothstep(1.0, 0.05, vUv.y);
          float cloudMist = pow(max(0.0, sin((vUv.x + uTime * 0.012) * 14.0) * 0.5 + 0.5), 6.0)
                          * smoothstep(0.94, 0.15, vUv.y);
          vec3 color = mix(uPaper, skyColor, 0.55 + horizon * 0.2);
          color += vec3(1.0, 0.88, 0.48) * cloudMist * 0.09;
          gl_FragColor = vec4(color, 0.14 + horizon * 0.12);
        }
      `
    })
  );
  sky.position.set(0, 0.18, -2.7);

  const sun = new Mesh(
    new CircleGeometry(0.16, 48),
    new MeshBasicMaterial({
      color: secondary,
      transparent: true,
      opacity: theme === "dark" ? 0.28 : 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );

  // Glow halo behind sun
  const sunGlow = makeGlowSprite(
    theme === "dark" ? 38 : 240,
    theme === "dark" ? 168 : 190,
    theme === "dark" ? 130 : 60,
    1.4,
    theme === "dark" ? 0.12 : 0.18
  );

  const mountainColors = theme === "dark"
    ? ["#2a4a6a", "#3a5a5a", "#28364a"]
    : theme === "sepia"
    ? ["#b07028", "#7ea090", primary]
    : [primary, "#5a9890", "#c8962e"];

  const mountains = [
    createMountainLayer(mountainColors[0], 301, 8.8, 0.95, -2.05),
    createMountainLayer(mountainColors[1], 503, 8.4, 0.72, -1.88),
    createMountainLayer(mountainColors[2], 709, 8.0, 0.52, -1.72)
  ];
  mountains.forEach((m, i) => {
    m.position.z = -2.25 + i * 0.16;
    m.position.x = i % 2 === 0 ? -0.16 : 0.18;
    group.add(m);
  });

  const clouds = Array.from({ length: 14 }).map((_, i) => {
    const cloud = new Mesh(
      new CircleGeometry(0.22 + seededNoise(i + 811) * 0.18, 24),
      new MeshBasicMaterial({
        color: theme === "dark" ? "#b0c8e8" : "#ffffff",
        transparent: true,
        opacity: theme === "dark" ? 0.1 : 0.16,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide
      })
    );
    cloud.scale.set(2.2 + seededNoise(i + 821) * 2.0, 0.36 + seededNoise(i + 827) * 0.24, 1);
    cloud.position.set(
      -4.8 + seededNoise(i + 829) * 9.6,
      -0.5 + seededNoise(i + 839) * 2.8,
      -2.05 - seededNoise(i + 853) * 0.32
    );
    group.add(cloud);
    return cloud;
  });

  group.add(sky, sun, sunGlow);
  return { group, sky, sun, sunGlow, mountains, clouds };
}

function createChapterSeal(chapterNumber: number, primary: string, secondary: string) {
  const group = new Group();
  const texture = createSealTexture(chapterNumber, primary, secondary);
  const seal = new Mesh(
    new CircleGeometry(0.58, 80),
    new MeshBasicMaterial({
      color: "#ffffff",
      map: texture,
      transparent: true,
      opacity: 0.52,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );
  const outer = new Mesh(
    new TorusGeometry(0.72, 0.006, 8, 128),
    new MeshBasicMaterial({
      color: secondary,
      transparent: true,
      opacity: 0.32,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );
  const inner = new Mesh(
    new TorusGeometry(0.44, 0.004, 8, 96),
    new MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0.28,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );

  // Formation ring (outer decorative, slower rotation)
  const formationRing = new Mesh(
    new TorusGeometry(0.96, 0.003, 8, 160),
    new MeshBasicMaterial({
      color: secondary,
      transparent: true,
      opacity: 0.14,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );

  // Glow sprite behind seal
  const sealGlow = makeGlowSprite(240, 180, 60, 2.6, 0.14);

  group.add(sealGlow, seal, outer, inner, formationRing);
  group.position.set(2.28, 1.52, -0.24);
  group.rotation.x = -0.18;
  group.rotation.y = -0.42;
  return { group, seal, outer, inner, formationRing, sealGlow };
}

function createAutoScrollCurrent(primary: string, secondary: string) {
  const group = new Group();
  const left = new Mesh(
    new PlaneGeometry(0.035, 4.6, 1, 1),
    new MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );
  const right = left.clone();
  right.material = new MeshBasicMaterial({
    color: secondary,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide
  });
  left.position.x = -2.45;
  right.position.x = 2.45;
  group.add(left, right);
  return { group, left, right };
}

function createReadingLine(primary: string, secondary: string) {
  const group = new Group();
  const line = new Mesh(
    new PlaneGeometry(2.6, 0.016, 1, 1),
    new MeshBasicMaterial({
      color: secondary,
      transparent: true,
      opacity: 0.18,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );
  const head = new Mesh(
    new CircleGeometry(0.048, 24),
    new MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0.32,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );
  const tail = head.clone();
  tail.material = new MeshBasicMaterial({
    color: secondary,
    transparent: true,
    opacity: 0.24,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide
  });
  head.position.x = 1.34;
  tail.position.x = -1.34;
  group.position.set(0, 1.05, -0.16);
  group.add(line, head, tail);
  return { group, line, head, tail };
}

function createPageWisps(secondary: string) {
  const group = new Group();
  const wisps = Array.from({ length: 12 }).map((_, i) => {
    const isGold = i % 3 === 0;
    const wisp = new Mesh(
      new PlaneGeometry(0.24 + seededNoise(i + 701) * 0.2, 0.38 + seededNoise(i + 709) * 0.24, 1, 1),
      new MeshBasicMaterial({
        color: isGold ? secondary : "#ffffff",
        transparent: true,
        opacity: 0.07,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide
      })
    );
    const side = i % 2 === 0 ? -1 : 1;
    wisp.position.set(
      side * (1.68 + seededNoise(i + 719) * 0.6),
      -1.8 + seededNoise(i + 727) * 3.8,
      -0.3 - seededNoise(i + 733) * 0.9
    );
    wisp.rotation.set(0.1 + seededNoise(i + 739) * 0.2, side * (0.38 + seededNoise(i + 743) * 0.3), seededNoise(i + 751) * 0.7);
    group.add(wisp);
    return { mesh: wisp, phase: seededNoise(i + 761) * Math.PI * 2, side };
  });
  return { group, wisps };
}

function createParagraphMarkers(primary: string, secondary: string) {
  const group = new Group();
  const markers = Array.from({ length: 16 }).map((_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const isGold = i % 4 === 0;
    const marker = new Mesh(
      new BoxGeometry(0.016, 0.18 + seededNoise(i + 901) * 0.2, 0.016),
      new MeshBasicMaterial({
        color: isGold ? secondary : primary,
        transparent: true,
        opacity: 0.09,
        blending: AdditiveBlending,
        depthWrite: false
      })
    );
    marker.position.set(
      side * (1.52 + seededNoise(i + 907) * 0.28),
      -2.15 + (i % 8) * 0.62,
      -0.2 - seededNoise(i + 919) * 0.32
    );
    marker.rotation.z = side * (0.08 + seededNoise(i + 929) * 0.18);
    group.add(marker);
    return { mesh: marker, side, phase: seededNoise(i + 937) * Math.PI * 2 };
  });
  return { group, markers };
}

function createStepPulse(primary: string, secondary: string) {
  const group = new Group();
  const ring = new Mesh(
    new TorusGeometry(0.46, 0.006, 8, 96),
    new MeshBasicMaterial({
      color: secondary,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );
  const outerRing = new Mesh(
    new TorusGeometry(0.68, 0.004, 8, 96),
    new MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false
    })
  );
  const disc = new Mesh(
    new CircleGeometry(0.32, 48),
    new MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide
    })
  );
  group.position.set(0, -1.95, -0.12);
  group.add(ring, outerRing, disc);
  return { group, ring, outerRing, disc };
}

export function ThreeReaderAtmosphere({ chapterNumber, progress, autoScrollEnabled, theme }: ThreeReaderAtmosphereProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(progress);
  const autoScrollRef = useRef(autoScrollEnabled);
  const lastPulseProgressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    autoScrollRef.current = autoScrollEnabled;
  }, [autoScrollEnabled]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el: HTMLDivElement = host;
    const colors = THEME_COLORS[theme];
    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0, 6.4);

    const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.className = "reader-atmosphere-canvas";
    el.appendChild(renderer.domElement);

    const discTexture = makeDiscTexture(128);
    const mistTexture = makeMistTexture();

    const xianxiaSky = createXianxiaSky(colors.primary, colors.secondary, colors.paper, theme);
    const particles = createAmbientParticles(colors.primary, colors.secondary, discTexture);
    const stars = createStarParticles(discTexture);
    const mistSprites = createMistSprites(mistTexture, theme);
    const seal = createChapterSeal(chapterNumber, colors.primary, colors.secondary);
    const current = createAutoScrollCurrent(colors.primary, colors.secondary);
    const readingLine = createReadingLine(colors.primary, colors.secondary);
    const pageWisps = createPageWisps(colors.secondary);
    const paragraphMarkers = createParagraphMarkers(colors.primary, colors.secondary);
    const stepPulse = createStepPulse(colors.primary, colors.secondary);
    const glow = new PointLight(new Color(colors.secondary), 1.2, 7);
    glow.position.set(1.8, 1.4, 2.2);

    mistSprites.forEach(({ sprite }) => scene.add(sprite));
    scene.add(
      xianxiaSky.group,
      stars,
      particles.points,
      seal.group,
      current.group,
      readingLine.group,
      pageWisps.group,
      paragraphMarkers.group,
      stepPulse.group,
      glow
    );

    let frameId = 0;
    let disposed = false;
    let pulseStartedAt = -10000;

    function resize() {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
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
      const progressValue = Math.min(1, Math.max(0, progressRef.current / 100));
      const autoScrollOn = autoScrollRef.current ? 1 : 0;
      const progressDelta = progressRef.current - lastPulseProgressRef.current;
      if (autoScrollRef.current && progressDelta > 0.12) pulseStartedAt = now;
      lastPulseProgressRef.current = progressRef.current;

      // Sky
      xianxiaSky.sky.material.uniforms.uPhase.value = progressValue;
      xianxiaSky.sky.material.uniforms.uTime.value = t;
      const sunAngle = -Math.PI * 0.88 + progressValue * Math.PI * 0.76;
      xianxiaSky.sun.position.x = Math.cos(sunAngle) * 3.4;
      xianxiaSky.sun.position.y = -0.96 + Math.sin(sunAngle) * 2.3;
      xianxiaSky.sun.position.z = -2.0;
      xianxiaSky.sun.scale.setScalar(0.85 + Math.sin(progressValue * Math.PI) * 0.38);
      xianxiaSky.sun.material.opacity = (theme === "dark" ? 0.25 : 0.42) + Math.sin(progressValue * Math.PI) * 0.12;
      xianxiaSky.sunGlow.position.copy(xianxiaSky.sun.position);
      xianxiaSky.sunGlow.position.z += 0.4;
      xianxiaSky.sunGlow.material.opacity = (theme === "dark" ? 0.10 : 0.16) + Math.sin(progressValue * Math.PI) * 0.06;

      xianxiaSky.mountains.forEach((m, i) => {
        m.position.x += Math.sin(t * (0.032 + i * 0.007) + i) * 0.0006;
        (m.material as MeshBasicMaterial).opacity =
          (theme === "dark" ? 0.14 : 0.18) + i * 0.022 + Math.sin(progressValue * Math.PI) * 0.04;
      });
      xianxiaSky.clouds.forEach((c, i) => {
        c.position.x += (0.0008 + i * 0.00007) * (i % 2 === 0 ? 1 : -1);
        if (c.position.x > 5.2) c.position.x = -5.2;
        if (c.position.x < -5.2) c.position.x = 5.2;
        c.position.y += Math.sin(t * 0.16 + i) * 0.0007;
        (c.material as MeshBasicMaterial).opacity =
          (theme === "dark" ? 0.07 : 0.12) + Math.sin(t * 0.32 + i) * 0.02;
      });

      // Stars: fade in after dusk (progress > 0.7) or dark theme
      const starOpacity = theme === "dark"
        ? 0.55 + Math.sin(t * 0.06) * 0.08
        : Math.max(0, (progressValue - 0.65) * 2.2) * 0.42;
      (stars.material as PointsMaterial).opacity = starOpacity;
      stars.rotation.y += 0.00008;

      // Mist
      for (const { sprite, dx, phase } of mistSprites) {
        sprite.position.x += dx;
        if (Math.abs(sprite.position.x) > 6) sprite.position.x *= -1;
        sprite.position.y += Math.sin(t * 0.12 + phase) * 0.0005;
      }

      // Particles — pulsing shader sizes
      const posAttr = particles.points.geometry.getAttribute("position") as BufferAttribute;
      const pos = posAttr.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        const pi = i / 3;
        const wave = Math.sin(t * (0.24 + seededNoise(pi + 101) * 0.34) + pi);
        pos[i] = particles.originalPositions[i] + wave * 0.09;
        pos[i + 1] = particles.originalPositions[i + 1] + progressValue * 0.44 + Math.cos(t * 0.2 + pi) * 0.065;
      }
      posAttr.needsUpdate = true;

      for (let i = 0; i < particles.sizes.length; i++) {
        particles.sizes[i] = particles.baseSizes[i] * (0.5 + 0.5 * Math.sin(i * 0.37 + t * 1.6));
      }
      particles.sizeAttr.needsUpdate = true;
      particles.points.rotation.z = Math.sin(t * 0.07) * 0.03;

      // Seal
      seal.group.rotation.z = t * 0.07;
      seal.group.position.y = 1.52 + Math.sin(t * 0.65) * 0.045;
      seal.outer.rotation.z = -t * 0.16;
      seal.inner.rotation.z = t * 0.22;
      seal.formationRing.rotation.z = -t * 0.06;
      seal.formationRing.rotation.x = 0.3 + Math.sin(t * 0.12) * 0.1;
      seal.group.scale.setScalar(0.9 + progressValue * 0.2 + Math.sin(t * 1.1) * 0.014);
      seal.sealGlow.material.opacity = 0.1 + progressValue * 0.08 + Math.sin(t * 0.8) * 0.03;
      seal.outer.material.opacity = 0.24 + Math.sin(t * 1.8) * 0.08;
      seal.inner.material.opacity = 0.2 + Math.cos(t * 2.2) * 0.07;

      // Auto-scroll current
      current.left.position.y = Math.sin(t * 0.68) * 0.14;
      current.right.position.y = Math.cos(t * 0.68) * 0.14;
      current.left.material.opacity = autoScrollOn * (0.12 + Math.sin(t * 2.8) * 0.04);
      current.right.material.opacity = autoScrollOn * (0.12 + Math.cos(t * 2.8) * 0.04);

      // Reading line
      readingLine.group.position.y = 1.2 - progressValue * 2.9 + Math.sin(t * 0.58) * 0.038;
      readingLine.group.scale.x = 0.8 + progressValue * 0.46;
      readingLine.line.material.opacity = 0.1 + autoScrollOn * 0.18;
      readingLine.head.material.opacity = 0.14 + autoScrollOn * 0.24 + Math.sin(t * 2.2) * 0.04;
      readingLine.tail.material.opacity = 0.09 + autoScrollOn * 0.15;

      // Wisps
      pageWisps.wisps.forEach((w, i) => {
        const drift = t * (0.2 + seededNoise(i + 811) * 0.18) + w.phase;
        w.mesh.position.y += Math.sin(drift) * 0.0009 + autoScrollOn * 0.002;
        w.mesh.position.x += Math.cos(drift * 0.65) * 0.0008 * w.side;
        w.mesh.rotation.z += 0.0007 * w.side;
        (w.mesh.material as MeshBasicMaterial).opacity =
          0.04 + autoScrollOn * 0.07 + Math.max(0, Math.sin(drift)) * 0.02;
        if (w.mesh.position.y > 2.4) w.mesh.position.y = -2.3;
      });

      // Paragraph markers
      paragraphMarkers.markers.forEach((m, i) => {
        const phase = t * 0.5 + m.phase;
        const markerProgress = ((i % 8) + 1) / 8;
        const near = 1 - Math.min(1, Math.abs(progressValue - markerProgress) * 5.4);
        m.mesh.scale.y = 0.8 + near * 1.5 + autoScrollOn * 0.22;
        m.mesh.position.x = m.side * (1.52 + near * 0.2 + Math.sin(phase) * 0.026);
        m.mesh.rotation.z = m.side * (0.08 + near * 0.18);
        (m.mesh.material as MeshBasicMaterial).opacity =
          0.045 + near * 0.18 + autoScrollOn * 0.04;
      });

      // Step pulse on auto-scroll advance
      const pulseAge = Math.max(0, Math.min(1, (now - pulseStartedAt) / 1000));
      const pulseStrength = pulseStartedAt > 0 && pulseAge < 1 ? 1 - pulseAge : 0;
      stepPulse.group.position.y = readingLine.group.position.y;
      stepPulse.group.scale.setScalar(0.7 + pulseAge * 1.9);
      stepPulse.ring.material.opacity = pulseStrength * 0.22;
      stepPulse.outerRing.material.opacity = pulseStrength * 0.12;
      stepPulse.disc.material.opacity = pulseStrength * 0.09;

      glow.intensity = 0.9 + progressValue * 0.55 + autoScrollOn * 0.65;

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
      discTexture.dispose();
      mistTexture.dispose();
      mistSprites.forEach(({ sprite }) => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
        sprite.geometry.dispose();
      });
      scene.traverse((obj: Object3D) => {
        if (obj instanceof Mesh || obj instanceof Points) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => { m.map?.dispose(); m.dispose(); });
          } else {
            (mat as Material & { map?: Texture }).map?.dispose();
            mat.dispose();
          }
        }
        if (obj instanceof Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [chapterNumber, theme]);

  return <div className="reader-atmosphere" ref={hostRef} aria-hidden="true" />;
}
