"use client";

import { useEffect, useRef } from "react";
import type * as ThreeNamespace from "three";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { makeFluffyCloudTexture } from "@/lib/three-cloud-utils";

type ThreeHeroCloudProps = { paused?: boolean };

const STAR  = 50;
const MIST  = 60;
const VORTEX = 30;
const WISP  = 15;
const SPARK = 40;
const FRAME_MS = 1000 / 30;

export function ThreeHeroCloud({ paused }: ThreeHeroCloudProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const webglEnabled = useDecorativeWebglEnabled();
  const pausedRef = useRef(paused ?? false);

  useEffect(() => { pausedRef.current = paused ?? false; }, [paused]);

  useEffect(() => {
    if (!webglEnabled) return;
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const initTimer = window.requestAnimationFrame(() => {
      void mountCloud();
    });

    async function mountCloud() {
      const THREE = (await import("three")) as typeof ThreeNamespace;
      if (disposed) return;

      const w = host!.offsetWidth  || 640;
      const h = host!.offsetHeight || 380;
      const asp = w / h;

      const renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: false, powerPreference: "low-power"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);

      const cvs = renderer.domElement;
      cvs.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;" +
        "pointer-events:none;z-index:0;border-radius:inherit";
      host!.appendChild(cvs);

      const scene = new THREE.Scene();
      const cam = new THREE.OrthographicCamera(-asp, asp, 1, -1, 0.1, 10);
      cam.position.z = 4;

      // ── Procedural cloud layers (no file dependencies) ───────────────
      const cloudTextures = [0, 7, 14, 21, 28, 35, 42, 49].map((seed) =>
        makeFluffyCloudTexture(seed, [255, 250, 235], 256)
      );

      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(0, -0.02, -0.08);
      scene.add(cloudGroup);

      const cloudLayerDefs = [
        { ti: 3, x: -0.10, y: -0.08, z: -0.18, sx: 2.45, sy: 0.92, rot: -0.02, opacity: 0.36, speed: 0.09, phase: 0.20 },
        { ti: 0, x: -0.38, y: -0.04, z: -0.08, sx: 1.42, sy: 0.58, rot: 0.06, opacity: 0.58, speed: 0.13, phase: 1.40 },
        { ti: 1, x: 0.25, y: 0.01, z: -0.06, sx: 1.52, sy: 0.62, rot: -0.05, opacity: 0.52, speed: 0.12, phase: 2.70 },
        { ti: 2, x: 0.01, y: -0.10, z: 0.03, sx: 1.78, sy: 0.68, rot: 0.02, opacity: 0.40, speed: 0.16, phase: 4.10 },
        { ti: 4, x: 0.55, y: -0.16, z: 0.06, sx: 1.12, sy: 0.44, rot: 0.11, opacity: 0.32, speed: 0.18, phase: 5.30 },
        { ti: 5, x: -0.62, y: -0.16, z: 0.05, sx: 1.04, sy: 0.42, rot: -0.12, opacity: 0.30, speed: 0.17, phase: 3.30 },
        { ti: 6, x: 0.80, y: 0.05, z: -0.12, sx: 1.35, sy: 0.50, rot: 0.08, opacity: 0.22, speed: 0.11, phase: 1.80 },
        { ti: 7, x: -0.80, y: 0.08, z: -0.14, sx: 1.28, sy: 0.48, rot: -0.07, opacity: 0.20, speed: 0.10, phase: 2.40 },
      ].map((layer) => {
        const geo = new THREE.PlaneGeometry(layer.sx * asp, layer.sy);
        const mat = new THREE.MeshBasicMaterial({
          map: cloudTextures[layer.ti],
          color: 0xfff8e8,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(layer.x * asp, layer.y, layer.z);
        mesh.rotation.z = layer.rot;
        cloudGroup.add(mesh);
        return { mesh, geo, mat, ...layer };
      });

      // ── Caustic light overlay ────────────────────────────────────────
      function createCausticTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const base = ctx.createRadialGradient(128, 112, 8, 128, 128, 150);
        base.addColorStop(0, "rgba(255,255,255,0.28)");
        base.addColorStop(0.34, "rgba(246,220,154,0.16)");
        base.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";

        for (let i = 0; i < 34; i++) {
          const y = 18 + i * 6.5;
          const phase = i * 0.72;
          ctx.beginPath();
          ctx.moveTo(-20, y);
          for (let x = -20; x <= 280; x += 24) {
            const wave = Math.sin(x * 0.045 + phase) * 7 + Math.sin(x * 0.018 + phase * 1.7) * 5;
            ctx.lineTo(x, y + wave);
          }
          ctx.strokeStyle = `rgba(255, ${226 + (i % 4) * 6}, ${150 + (i % 3) * 18}, ${0.035 + (i % 5) * 0.012})`;
          ctx.lineWidth = 1.2 + (i % 4) * 0.45;
          ctx.stroke();
        }

        for (let i = 0; i < 18; i++) {
          const x = (i * 43) % 256;
          const y = (i * 71) % 256;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 36 + (i % 4) * 14);
          glow.addColorStop(0, "rgba(255,245,196,0.12)");
          glow.addColorStop(1, "rgba(255,245,196,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(x - 70, y - 70, 140, 140);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1.35, 1.08);
        return texture;
      }

      const causticTexture = createCausticTexture();
      const projectorGroup = new THREE.Group();
      projectorGroup.position.set(0.22 * asp, 0.04, 0.12);
      scene.add(projectorGroup);

      const causticGeo = new THREE.PlaneGeometry(asp * 1.34, 1.26);
      const causticMat = new THREE.MeshBasicMaterial({
        map: causticTexture ?? undefined,
        color: 0xffedbd,
        transparent: true,
        opacity: causticTexture ? 0.18 : 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const causticMesh = new THREE.Mesh(causticGeo, causticMat);
      causticMesh.position.set(0.10 * asp, 0.02, 0.14);
      causticMesh.rotation.z = -0.08;
      projectorGroup.add(causticMesh);

      function makeProjectorBeam(x: number, y: number, width: number, height: number, angle: number, opacity: number) {
        const geo = new THREE.PlaneGeometry(width * asp, height);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xfff2cf,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x * asp, y, 0.10);
        mesh.rotation.z = angle;
        projectorGroup.add(mesh);
        return { mesh, geo, mat, baseOpacity: opacity };
      }

      const beams = [
        makeProjectorBeam(0.34, 0.08, 0.22, 1.52, -0.82, 0.035),
        makeProjectorBeam(0.49, 0.02, 0.16, 1.34, -0.68, 0.026),
        makeProjectorBeam(0.16, -0.03, 0.20, 1.24, -0.98, 0.024),
      ];

      // ── Formation rings: increased opacity for visible spiritual array ─
      const RING_SEG = 80;
      function makeRing(r: number, col: number, op: number) {
        const pts: number[] = [];
        for (let i = 0; i <= RING_SEG; i++) {
          const a = (i / RING_SEG) * Math.PI * 2;
          pts.push(Math.cos(a) * r * asp, Math.sin(a) * r, 0);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        const mat = new THREE.LineBasicMaterial({
          color: col, transparent: true, opacity: op, depthWrite: false
        });
        return { obj: new THREE.LineLoop(geo, mat), geo, mat };
      }

      // Increased from 0.045-0.09 → 0.15-0.22 and added 4th ring
      const ring1 = makeRing(0.26, 0xf0c840, 0.22);
      const ring2 = makeRing(0.48, 0xe0b030, 0.18);
      const ring3 = makeRing(0.72, 0xd0a020, 0.15);
      const ring4 = makeRing(0.96, 0xc09010, 0.11);
      scene.add(ring1.obj, ring2.obj, ring3.obj, ring4.obj);

      // ── Starfield ────────────────────────────────────────────────────
      const stPos = new Float32Array(STAR * 3);
      const stPh  = new Float32Array(STAR);
      for (let i = 0; i < STAR; i++) {
        stPos[i * 3]     = (Math.random() - 0.5) * asp * 2.1;
        stPos[i * 3 + 1] = (Math.random() - 0.5) * 2.0;
        stPos[i * 3 + 2] = -0.2;
        stPh[i] = Math.random() * Math.PI * 2;
      }
      const stGeo = new THREE.BufferGeometry();
      const stAttr = new THREE.BufferAttribute(stPos, 3);
      stGeo.setAttribute("position", stAttr);
      const stMat = new THREE.PointsMaterial({
        size: 0.012, color: 0xfff0d8, transparent: true, opacity: 0.38,
        depthWrite: false, sizeAttenuation: true
      });
      scene.add(new THREE.Points(stGeo, stMat));

      // ── Warm mist particles ──────────────────────────────────────────
      const mPos  = new Float32Array(MIST * 3);
      const mBase = new Float32Array(MIST * 2);
      const mPh   = new Float32Array(MIST);
      const mSp   = new Float32Array(MIST);
      for (let i = 0; i < MIST; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const x = Math.cos(a) * r * asp * 0.88;
        const y = Math.sin(a) * r * 0.82;
        mBase[i * 2] = mPos[i * 3] = x;
        mBase[i * 2 + 1] = mPos[i * 3 + 1] = y;
        mPos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        mPh[i] = Math.random() * Math.PI * 2;
        mSp[i] = 0.14 + Math.random() * 0.20;
      }
      const mGeo  = new THREE.BufferGeometry();
      const mAttr = new THREE.BufferAttribute(mPos, 3);
      mGeo.setAttribute("position", mAttr);
      const mMat = new THREE.PointsMaterial({
        size: 0.30, color: 0xd4c8b0, transparent: true, opacity: 0.48,
        depthWrite: false, sizeAttenuation: true
      });
      scene.add(new THREE.Points(mGeo, mMat));

      // ── Qi vortex ────────────────────────────────────────────────────
      const VORTEX_R = [0.22, 0.40, 0.58];
      const VORTEX_SPD = [0.30, 0.18, 0.10];
      const vPos  = new Float32Array(VORTEX * 3);
      const vAngle = new Float32Array(VORTEX);
      const vLayer = new Float32Array(VORTEX);
      const vRnd  = new Float32Array(VORTEX);
      const COUNT_PER_RING = VORTEX / 3;
      for (let i = 0; i < VORTEX; i++) {
        const layer = Math.floor(i / COUNT_PER_RING);
        vLayer[i] = layer;
        const a = (i % COUNT_PER_RING / COUNT_PER_RING) * Math.PI * 2 +
                  (Math.random() - 0.5) * 0.25;
        vAngle[i] = a;
        vRnd[i]   = (Math.random() - 0.5) * 0.04;
        const r = VORTEX_R[layer];
        vPos[i * 3]     = Math.cos(a) * r * asp;
        vPos[i * 3 + 1] = Math.sin(a) * r;
        vPos[i * 3 + 2] = 0.05 + layer * 0.04;
      }
      const vGeo  = new THREE.BufferGeometry();
      const vAttr = new THREE.BufferAttribute(vPos, 3);
      vGeo.setAttribute("position", vAttr);
      const vMat = new THREE.PointsMaterial({
        size: 0.055, color: 0xf0c840, transparent: true, opacity: 0.80,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      scene.add(new THREE.Points(vGeo, vMat));

      // ── Edge wisps ───────────────────────────────────────────────────
      const ePos  = new Float32Array(WISP * 3);
      const eBase = new Float32Array(WISP * 2);
      const ePh   = new Float32Array(WISP);
      for (let i = 0; i < WISP; i++) {
        const a = (i / WISP) * Math.PI * 2;
        const r = 0.85 + Math.random() * 0.15;
        const x = Math.cos(a) * r * asp * 0.92;
        const y = Math.sin(a) * r * 0.90;
        eBase[i * 2] = ePos[i * 3] = x;
        eBase[i * 2 + 1] = ePos[i * 3 + 1] = y;
        ePos[i * 3 + 2] = -0.1;
        ePh[i] = Math.random() * Math.PI * 2;
      }
      const eGeo  = new THREE.BufferGeometry();
      const eAttr = new THREE.BufferAttribute(ePos, 3);
      eGeo.setAttribute("position", eAttr);
      const eMat = new THREE.PointsMaterial({
        size: 0.52, color: 0xe8dcc8, transparent: true, opacity: 0.34,
        depthWrite: false, sizeAttenuation: true
      });
      scene.add(new THREE.Points(eGeo, eMat));

      // ── Golden qi sparks — 80 particles with size pulsing ────────────
      const sPos   = new Float32Array(SPARK * 3);
      const sBase  = new Float32Array(SPARK * 2);
      const sPh    = new Float32Array(SPARK);
      const sSizes = new Float32Array(SPARK);

      const SPARK_VS = `
        attribute float sparkSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = sparkSize * (200.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `;
      const SPARK_FS = `
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = dot(uv, uv);
          if (d > 0.25) discard;
          float a = (0.25 - d) * 4.0;
          gl_FragColor = vec4(1.0, 0.85, 0.30, a * 0.88);
        }
      `;

      for (let i = 0; i < SPARK; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.82;
        const x = Math.cos(a) * r * asp;
        const y = Math.sin(a) * r * 0.80;
        sBase[i * 2] = sPos[i * 3] = x;
        sBase[i * 2 + 1] = sPos[i * 3 + 1] = y;
        sPos[i * 3 + 2] = 0.15 + Math.random() * 0.12;
        sPh[i] = Math.random() * Math.PI * 2;
        sSizes[i] = 6 + Math.random() * 8;
      }
      const sGeo  = new THREE.BufferGeometry();
      const sAttr = new THREE.BufferAttribute(sPos, 3);
      sGeo.setAttribute("position", sAttr);
      const sSizeAttr = new THREE.BufferAttribute(sSizes, 1);
      sSizeAttr.usage = THREE.DynamicDrawUsage;
      sGeo.setAttribute("sparkSize", sSizeAttr);

      const sMat = new THREE.ShaderMaterial({
        vertexShader: SPARK_VS,
        fragmentShader: SPARK_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(sGeo, sMat));

      // ── Light rays ───────────────────────────────────────────────────
      function makeRay(angle: number, op: number) {
        const geo = new THREE.PlaneGeometry(asp * 1.1, 2.2);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xf8ead8, transparent: true, opacity: op,
          depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.z = angle;
        return { mesh, geo, mat };
      }
      const ray1 = makeRay(0.14,  0.052);
      const ray2 = makeRay(-0.22, 0.030);
      const ray3 = makeRay(0.50,  0.018);
      scene.add(ray1.mesh, ray2.mesh, ray3.mesh);

      if (disposed) {
        renderer.dispose();
        causticTexture?.dispose();
        causticGeo.dispose();
        causticMat.dispose();
        beams.forEach(beam => { beam.geo.dispose(); beam.mat.dispose(); });
        cloudTextures.forEach(t => t.dispose());
        cloudLayerDefs.forEach(l => { l.geo.dispose(); l.mat.dispose(); });
        [ring1.geo, ring2.geo, ring3.geo, ring4.geo, stGeo, mGeo, vGeo, eGeo, sGeo,
         ray1.geo, ray2.geo, ray3.geo].forEach(g => g.dispose());
        [ring1.mat, ring2.mat, ring3.mat, ring4.mat, stMat, mMat, vMat, eMat, sMat,
         ray1.mat, ray2.mat, ray3.mat].forEach(m => m.dispose());
        cvs.remove();
        return;
      }

      let lastRender = 0;
      function tick(ms: number) {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        if (pausedRef.current || ms - lastRender < FRAME_MS) return;
        lastRender = ms;
        const t = ms * 0.001;

        stMat.opacity = 0.30 + Math.sin(t * 0.28) * 0.10;

        for (let i = 0; i < MIST; i++) {
          const ph = mPh[i], sp = mSp[i];
          (mAttr.array as Float32Array)[i * 3]     = mBase[i * 2] + Math.sin(t * sp + ph) * 0.095;
          (mAttr.array as Float32Array)[i * 3 + 1] = mBase[i * 2 + 1] + Math.cos(t * sp * 0.55 + ph) * 0.048;
        }
        mAttr.needsUpdate = true;
        mMat.opacity = 0.40 + Math.sin(t * 0.17) * 0.08;

        cloudGroup.position.y = -0.02 + Math.sin(t * 0.28) * 0.018;
        cloudGroup.rotation.z = Math.sin(t * 0.10) * 0.010;
        cloudLayerDefs.forEach((layer, index) => {
          const drift = Math.sin(t * layer.speed + layer.phase);
          const lift = Math.cos(t * (layer.speed * 0.74) + layer.phase);
          layer.mesh.position.x = layer.x * asp + drift * 0.030 * (1 + index * 0.08);
          layer.mesh.position.y = layer.y + lift * 0.020;
          layer.mesh.rotation.z = layer.rot + Math.sin(t * 0.08 + layer.phase) * 0.014;
          layer.mesh.scale.setScalar(1 + Math.sin(t * 0.16 + layer.phase) * 0.018);
          layer.mat.opacity = layer.opacity + Math.sin(t * 0.22 + layer.phase) * 0.055;
        });

        projectorGroup.position.x = 0.22 * asp + Math.sin(t * 0.11) * 0.018;
        projectorGroup.position.y = 0.04 + Math.cos(t * 0.09) * 0.012;
        causticMesh.rotation.z = -0.08 + Math.sin(t * 0.12) * 0.018;
        causticMat.opacity = (causticTexture ? 0.15 : 0.06) + Math.sin(t * 0.24) * 0.045;
        if (causticTexture) {
          causticTexture.offset.x = (t * 0.012) % 1;
          causticTexture.offset.y = (Math.sin(t * 0.09) * 0.03 + 1) % 1;
        }
        beams.forEach((beam, index) => {
          beam.mesh.rotation.z += Math.sin(t * 0.10 + index) * 0.00018;
          beam.mat.opacity = beam.baseOpacity + Math.sin(t * 0.18 + index * 0.8) * 0.012;
        });

        for (let i = 0; i < VORTEX; i++) {
          const layer = vLayer[i];
          const spd   = VORTEX_SPD[layer];
          const baseR = VORTEX_R[layer];
          const a = vAngle[i] + t * spd;
          const r = baseR + vRnd[i] + Math.sin(t * 0.42 + vAngle[i] * 3.14) * 0.018;
          (vAttr.array as Float32Array)[i * 3]     = Math.cos(a) * r * asp;
          (vAttr.array as Float32Array)[i * 3 + 1] = Math.sin(a) * r;
        }
        vAttr.needsUpdate = true;
        vMat.opacity = 0.70 + Math.sin(t * 0.22) * 0.12;

        ring1.obj.rotation.z = t * 0.045;
        ring2.obj.rotation.z = -t * 0.028;
        ring3.obj.rotation.z = t * 0.016;
        ring4.obj.rotation.z = -t * 0.010;
        ring1.mat.opacity = 0.20 + Math.sin(t * 0.31) * 0.04;
        ring2.mat.opacity = 0.16 + Math.sin(t * 0.25 + 1.0) * 0.03;
        ring3.mat.opacity = 0.13 + Math.sin(t * 0.19 + 2.0) * 0.025;
        ring4.mat.opacity = 0.09 + Math.sin(t * 0.15 + 3.0) * 0.02;

        for (let i = 0; i < WISP; i++) {
          const ph = ePh[i];
          (eAttr.array as Float32Array)[i * 3]     = eBase[i * 2] + Math.sin(t * 0.22 + ph) * 0.10;
          (eAttr.array as Float32Array)[i * 3 + 1] = eBase[i * 2 + 1] + Math.cos(t * 0.18 + ph) * 0.055;
        }
        eAttr.needsUpdate = true;
        eMat.opacity = 0.28 + Math.sin(t * 0.13 + 1.1) * 0.08;

        for (let i = 0; i < SPARK; i++) {
          const ph = sPh[i];
          (sAttr.array as Float32Array)[i * 3]     = sBase[i * 2] + Math.sin(t * 0.44 + ph) * 0.072;
          (sAttr.array as Float32Array)[i * 3 + 1] = sBase[i * 2 + 1]
            + Math.cos(t * 0.36 + ph) * 0.040
            + Math.sin(t * 0.16 + ph * 0.6) * 0.030;
          sSizeAttr.array[i] = 5 + 7 * (0.5 + 0.5 * Math.sin(t * (2.2 + sPh[i] * 1.8) + ph));
        }
        sAttr.needsUpdate = true;
        sSizeAttr.needsUpdate = true;

        ray1.mat.opacity = 0.040 + Math.sin(t * 0.25) * 0.018;
        ray2.mat.opacity = 0.020 + Math.sin(t * 0.19 + 0.8) * 0.010;
        ray3.mat.opacity = 0.012 + Math.sin(t * 0.14 + 1.6) * 0.007;

        renderer.render(scene, cam);
      }

      raf = requestAnimationFrame(tick);

      cleanup = () => {
        renderer.dispose();
        causticTexture?.dispose();
        causticGeo.dispose();
        causticMat.dispose();
        beams.forEach(beam => { beam.geo.dispose(); beam.mat.dispose(); });
        cloudTextures.forEach(t => t.dispose());
        cloudLayerDefs.forEach(l => { l.geo.dispose(); l.mat.dispose(); });
        [ring1.geo, ring2.geo, ring3.geo, ring4.geo, stGeo, mGeo, vGeo, eGeo, sGeo,
         ray1.geo, ray2.geo, ray3.geo].forEach(g => g.dispose());
        [ring1.mat, ring2.mat, ring3.mat, ring4.mat, stMat, mMat, vMat, eMat, sMat,
         ray1.mat, ray2.mat, ray3.mat].forEach(m => m.dispose());
        cvs.remove();
      };
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(initTimer);
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [webglEnabled]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit" }}
    />
  );
}
