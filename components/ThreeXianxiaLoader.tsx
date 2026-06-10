"use client";

import { useEffect, useRef } from "react";
import { ACESFilmicToneMapping, AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DynamicDrawUsage, FogExp2, Group, Material, Mesh, MeshBasicMaterial, NormalBlending, PerspectiveCamera, Points, PointsMaterial, Scene, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, Texture, TorusGeometry, WebGLRenderer } from "three";
import { EffectComposer, BloomEffect, RenderPass, EffectPass } from "postprocessing";

// ── Canvas texture helpers ────────────────────────────────────────────────────

function makeDiscTexture(size = 128, sharp = false): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  if (sharp) {
    grad.addColorStop(0,    "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.6,  "rgba(255,255,255,0.2)");
    grad.addColorStop(1,    "rgba(255,255,255,0)");
  } else {
    grad.addColorStop(0,    "rgba(255,255,255,1)");
    grad.addColorStop(0.4,  "rgba(255,255,255,0.7)");
    grad.addColorStop(1,    "rgba(255,255,255,0)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

function makeMistTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  for (const [x, y, r, a] of [
    [256, 210, 195, 0.18],
    [180, 285, 155, 0.12],
    [340, 240, 165, 0.14],
    [260, 260, 125, 0.09],
    [200, 180, 100, 0.07],
  ] as [number, number, number, number][]) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(230,218,200,${a})`);
    grad.addColorStop(0.5, `rgba(215,205,188,${a * 0.4})`);
    grad.addColorStop(1, "rgba(200,198,188,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  return new CanvasTexture(canvas);
}

function makeGlowSprite(
  r: number, g: number, b: number, worldSize: number, opacity: number
): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.28, `rgba(${r},${g},${b},0.6)`);
  grad.addColorStop(0.65, `rgba(${r},${g},${b},0.15)`);
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
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

// Tall vertical pillar of heavenly qi — camera-facing sprite
function makePillarTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  // Horizontal glow
  const hGrad = ctx.createLinearGradient(0, 0, 64, 0);
  hGrad.addColorStop(0,    "rgba(245,225,140,0)");
  hGrad.addColorStop(0.35, "rgba(245,225,140,0.55)");
  hGrad.addColorStop(0.5,  "rgba(255,248,210,1)");
  hGrad.addColorStop(0.65, "rgba(245,225,140,0.55)");
  hGrad.addColorStop(1,    "rgba(245,225,140,0)");
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, 64, 512);
  // Vertical fade via destination-in
  ctx.globalCompositeOperation = "destination-in";
  const vGrad = ctx.createLinearGradient(0, 0, 0, 512);
  vGrad.addColorStop(0,    "rgba(0,0,0,0)");
  vGrad.addColorStop(0.08, "rgba(0,0,0,1)");
  vGrad.addColorStop(0.85, "rgba(0,0,0,1)");
  vGrad.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 64, 512);
  return new CanvasTexture(canvas);
}

// Elliptical petal — soft cream-gold
function makePetalTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 26);
  grad.addColorStop(0,   "rgba(255,248,215,0.92)");
  grad.addColorStop(0.45, "rgba(242,230,190,0.55)");
  grad.addColorStop(1,   "rgba(220,205,170,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(32, 32, 18, 26, 0.3, 0, Math.PI * 2);
  ctx.fill();
  return new CanvasTexture(canvas);
}

// ── Formation ring config ─────────────────────────────────────────────────────

const RING_DEFS = [
  { r: 0.55, tube: 0.018, color: 0xf0d06a, seg: 80,  nodes: 4, initRot: [0, 0, 0],                            speed: [0.008, 0.012, 0.004] },
  { r: 1.05, tube: 0.014, color: 0xc8962e, seg: 96,  nodes: 6, initRot: [Math.PI/3, Math.PI/6, 0],            speed: [-0.005, 0.008, 0.010] },
  { r: 1.62, tube: 0.010, color: 0x26a882, seg: 112, nodes: 8, initRot: [Math.PI/5, -Math.PI/4, Math.PI/8],   speed: [0.006, -0.004, 0.007] },
  { r: 2.22, tube: 0.007, color: 0xc8962e, seg: 128, nodes: 8, initRot: [-Math.PI/4, Math.PI/3, Math.PI/5],   speed: [-0.003, 0.005, -0.004] },
] as const;

// ── Vertex / Fragment shaders for per-particle pulsing size ───────────────────

const PARTICLE_VS = /* glsl */`
  attribute float size;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (7.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FS = /* glsl */`
  uniform sampler2D pointTexture;
  uniform vec3 diffuse;
  void main() {
    vec4 tex = texture2D(pointTexture, gl_PointCoord);
    if (tex.a < 0.04) discard;
    gl_FragColor = vec4(diffuse, 1.0) * tex;
  }
`;

// ── Main component ────────────────────────────────────────────────────────────

export function ThreeXianxiaLoader() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer (opaque — EffectComposer needs it) ───────────────────────
    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x080508, 1);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    mount.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────
    const scene = new Scene();
    scene.fog = new FogExp2(0x080508, 0.10);
    const camera = new PerspectiveCamera(
      55, mount.clientWidth / mount.clientHeight, 0.1, 50
    );
    camera.position.set(0, 0, 5.5);

    // Disposables registry
    const geos: BufferGeometry[] = [];
    const mats: Material[] = [];
    const textures: Texture[] = [];

    function track<T extends { dispose(): void }>(item: T): T {
      if ("isBufferGeometry" in item) geos.push(item as unknown as BufferGeometry);
      else if ("isTexture" in item) textures.push(item as unknown as Texture);
      else mats.push(item as unknown as Material);
      return item;
    }

    // ── Textures ──────────────────────────────────────────────────────────
    const softDiscTex  = track(makeDiscTexture(128, false));
    const sharpDiscTex = track(makeDiscTexture(64, true));
    const mistTex      = track(makeMistTexture());
    const pillarTex    = track(makePillarTexture());
    const petalTex     = track(makePetalTexture());

    // ── Star field ────────────────────────────────────────────────────────
    const STAR_COUNT = 700;
    const starPos    = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const warmPalette: [number, number, number][] = [
      [1.00, 0.98, 0.94],
      [1.00, 0.96, 0.80],
      [0.90, 0.94, 1.00],
    ];
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 7 + Math.random() * 4;
      starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      starPos[i*3+2] = r * Math.cos(phi);
      const colIdx = Math.random() < 0.06 ? 2 : Math.random() < 0.28 ? 1 : 0;
      const col = warmPalette[colIdx];
      starColors[i*3] = col[0]; starColors[i*3+1] = col[1]; starColors[i*3+2] = col[2];
    }
    const starGeo = track(new BufferGeometry());
    starGeo.setAttribute("position", new BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new BufferAttribute(starColors, 3));
    const starMat = track(new PointsMaterial({
      size: 0.028, sizeAttenuation: true,
      vertexColors: true, transparent: true, opacity: 0.82,
      map: sharpDiscTex, alphaTest: 0.25, depthWrite: false,
    }));
    const stars = new Points(starGeo, starMat);
    scene.add(stars);

    // ── Mist wisps ────────────────────────────────────────────────────────
    const mistSprites: { sprite: Sprite; dx: number; wrap: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const mat = track(new SpriteMaterial({
        map: mistTex, transparent: true,
        opacity: 0.045 + Math.random() * 0.065,
        blending: NormalBlending, depthWrite: false,
      }));
      const sprite = new Sprite(mat);
      sprite.scale.set(4.5 + Math.random() * 4, 1.4 + Math.random() * 1.6, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 2.5,
        -1 - Math.random() * 2
      );
      scene.add(sprite);
      const speed = (0.002 + Math.random() * 0.003) * (Math.random() < 0.5 ? 1 : -1);
      mistSprites.push({ sprite, dx: speed, wrap: 6.5 + sprite.scale.x * 0.5 });
    }

    // ── Heavenly qi pillar ────────────────────────────────────────────────
    const pillarMat = track(new SpriteMaterial({
      map: pillarTex,
      transparent: true,
      opacity: 0.16,
      blending: AdditiveBlending,
      depthWrite: false,
    }));
    const pillar = new Sprite(pillarMat);
    pillar.scale.set(0.38, 7.2, 1);
    pillar.position.set(0, 0, 0.5);
    scene.add(pillar);

    // Wider diffuse pillar glow
    const pillarWideMat = track(new SpriteMaterial({
      map: pillarTex,
      transparent: true,
      opacity: 0.06,
      blending: AdditiveBlending,
      depthWrite: false,
    }));
    const pillarWide = new Sprite(pillarWideMat);
    pillarWide.scale.set(1.4, 7.5, 1);
    pillarWide.position.set(0, 0, 0.3);
    scene.add(pillarWide);

    // ── Falling petals ────────────────────────────────────────────────────
    type Petal = {
      sprite: Sprite;
      mat: SpriteMaterial;
      dy: number;
      phase: number;
      freq: number;
      rotSpeed: number;
    };
    const PETAL_COUNT = 24;
    const petals: Petal[] = [];
    for (let i = 0; i < PETAL_COUNT; i++) {
      const mat = track(new SpriteMaterial({
        map: petalTex,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.22,
        blending: NormalBlending,
        depthWrite: false,
        rotation: Math.random() * Math.PI * 2,
      }));
      const sprite = new Sprite(mat);
      const sz = 0.14 + Math.random() * 0.18;
      sprite.scale.set(sz * 0.7, sz, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 10,
        -2.5 + Math.random() * 7.5,
        -0.2 - Math.random() * 1.8
      );
      scene.add(sprite);
      petals.push({
        sprite,
        mat,
        dy: -(0.003 + Math.random() * 0.004),
        phase: Math.random() * Math.PI * 2,
        freq: 0.25 + Math.random() * 0.35,
        rotSpeed: (Math.random() - 0.5) * 0.018,
      });
    }

    // ── Formation rings ───────────────────────────────────────────────────
    const nodeGeo = track(new SphereGeometry(0.032, 7, 7));
    // Each ring uses its own color for nodes
    const nodeMats = RING_DEFS.map(def =>
      track(new MeshBasicMaterial({ color: def.color }))
    );

    type RingGroup = { group: Group; speed: readonly [number, number, number] };
    const ringGroups: RingGroup[] = [];

    RING_DEFS.forEach((def, di) => {
      const group = new Group();
      group.rotation.set(...(def.initRot as [number, number, number]));

      const torusGeo = track(new TorusGeometry(def.r, def.tube, 8, def.seg));
      const torusMat = track(new MeshBasicMaterial({
        color: def.color, transparent: true, opacity: 0.88,
      }));
      group.add(new Mesh(torusGeo, torusMat));

      for (let i = 0; i < def.nodes; i++) {
        const angle = (i / def.nodes) * Math.PI * 2;
        const node = new Mesh(nodeGeo, nodeMats[di]);
        node.position.set(Math.cos(angle) * def.r, Math.sin(angle) * def.r, 0);
        group.add(node);
      }

      scene.add(group);
      ringGroups.push({ group, speed: def.speed });
    });

    // ── Center glow sprites ───────────────────────────────────────────────
    const glowGold = makeGlowSprite(240, 208, 106, 2.8, 0.48);
    const glowJade = makeGlowSprite(38,  168, 130, 1.6, 0.34);
    const glowOuter = makeGlowSprite(200, 150, 80, 5.5, 0.14);
    track((glowGold.material as SpriteMaterial).map!);
    track((glowJade.material as SpriteMaterial).map!);
    track((glowOuter.material as SpriteMaterial).map!);
    track(glowGold.material as SpriteMaterial);
    track(glowJade.material as SpriteMaterial);
    track(glowOuter.material as SpriteMaterial);
    scene.add(glowOuter, glowGold, glowJade);

    // ── Center orb ────────────────────────────────────────────────────────
    const orbGeo = track(new SphereGeometry(0.12, 16, 16));
    const orbMat = track(new MeshBasicMaterial({ color: 0xfffef0 }));
    const orb = new Mesh(orbGeo, orbMat);
    scene.add(orb);

    // ── Qi particles ──────────────────────────────────────────────────────
    const GOLD_COUNT = 150;
    const JADE_COUNT = 65;

    function makeParticleSystem(
      count: number, color: Color, discTex: Texture
    ) {
      const positions  = new Float32Array(count * 3);
      const sizes      = new Float32Array(count);
      const baseSizes  = new Float32Array(count);
      const spdY       = new Float32Array(count);
      const spdX       = new Float32Array(count);
      const phase      = new Float32Array(count);
      const freq       = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        positions[i*3]   = (Math.random() - 0.5) * 7.5;
        positions[i*3+1] = (Math.random() - 0.5) * 6.5;
        positions[i*3+2] = (Math.random() - 0.5) * 3 - 0.5;
        baseSizes[i] = 7 + Math.random() * 14;
        sizes[i]     = baseSizes[i];
        spdY[i]      = 0.003 + Math.random() * 0.006;
        spdX[i]      = 0.0015 + Math.random() * 0.003;
        phase[i]     = Math.random() * Math.PI * 2;
        freq[i]      = 1.2 + Math.random() * 1.4;
      }

      const geo = track(new BufferGeometry());
      geo.setAttribute("position", new BufferAttribute(positions, 3));
      const sizeAttr = new BufferAttribute(sizes, 1).setUsage(DynamicDrawUsage);
      geo.setAttribute("size", sizeAttr);

      const mat = track(new ShaderMaterial({
        uniforms: {
          pointTexture: { value: discTex },
          diffuse: { value: color },
        },
        vertexShader: PARTICLE_VS,
        fragmentShader: PARTICLE_FS,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }));

      const points = new Points(geo, mat);
      return { points, geo, sizeAttr, sizes, baseSizes, spdY, spdX, phase, freq };
    }

    const gold = makeParticleSystem(GOLD_COUNT, new Color(0xf0d06a), softDiscTex);
    const jade = makeParticleSystem(JADE_COUNT, new Color(0x26a882), softDiscTex);
    scene.add(gold.points, jade.points);

    // ── Post-processing (Bloom) ───────────────────────────────────────────
    const bloom = new BloomEffect({
      intensity: 1.15,
      luminanceThreshold: 0.09,
      luminanceSmoothing: 0.18,
      radius: 0.60,
    });
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera, bloom));

    // ── Animation loop ────────────────────────────────────────────────────
    let animId: number;
    let t = 0;

    const animateParticles = (
      sys: ReturnType<typeof makeParticleSystem>,
      count: number,
      tLocal: number
    ) => {
      const posArr  = sys.geo.attributes.position.array as Float32Array;
      const sizeArr = sys.sizes;

      for (let i = 0; i < count; i++) {
        posArr[i*3+1] += sys.spdY[i];
        posArr[i*3]   += Math.sin(tLocal * sys.freq[i] + sys.phase[i]) * sys.spdX[i];
        if (posArr[i*3+1] > 3.6) {
          posArr[i*3+1] = -3.6;
          posArr[i*3]   = (Math.random() - 0.5) * 7.5;
        }
        sizeArr[i] = sys.baseSizes[i] * (0.55 + 0.45 * Math.sin(i * 0.38 + tLocal * sys.freq[i]));
      }

      (sys.geo.attributes.position as BufferAttribute).needsUpdate = true;
      sys.sizeAttr.needsUpdate = true;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.016;

      stars.rotation.y += 0.00012;

      for (const { sprite, dx, wrap } of mistSprites) {
        sprite.position.x += dx;
        if (sprite.position.x > wrap)  sprite.position.x = -wrap;
        if (sprite.position.x < -wrap) sprite.position.x = wrap;
      }

      // Pillar breathe
      const pillarPulse = 0.5 + 0.5 * Math.sin(t * 0.9);
      pillarMat.opacity = 0.10 + pillarPulse * 0.12;
      pillarWideMat.opacity = 0.03 + pillarPulse * 0.05;
      pillar.scale.x = 0.32 + pillarPulse * 0.10;

      // Falling petals
      for (const p of petals) {
        p.sprite.position.y += p.dy;
        p.sprite.position.x += Math.sin(t * p.freq + p.phase) * 0.0012;
        p.mat.rotation += p.rotSpeed;
        if (p.sprite.position.y < -3.8) {
          p.sprite.position.y = 3.8;
          p.sprite.position.x = (Math.random() - 0.5) * 10;
        }
      }

      for (const { group, speed } of ringGroups) {
        group.rotation.x += speed[0];
        group.rotation.y += speed[1];
        group.rotation.z += speed[2];
      }

      const pulse = Math.sin(t * 1.7);
      glowGold.scale.setScalar(2.8 + pulse * 0.32);
      glowJade.scale.setScalar(1.6 - pulse * 0.15);
      glowOuter.scale.setScalar(5.5 + Math.sin(t * 0.7) * 0.6);
      orb.scale.setScalar(0.85 + Math.sin(t * 2.5) * 0.18);

      animateParticles(gold, GOLD_COUNT, t);
      animateParticles(jade, JADE_COUNT, t * 0.85);

      camera.position.x = Math.sin(t * 0.045) * 0.22;
      camera.position.y = Math.cos(t * 0.035) * 0.10;
      camera.lookAt(0, 0, 0);

      composer.render();
    };

    animate();

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const tx of textures) tx.dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true" />;
}
