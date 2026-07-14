import { CanvasTexture } from "three";

/** Deterministic 0–1 noise for skill WebGL motion seeds. */
export function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Soft radial sprite for PointsMaterial — module-cached across skill canvases. */
let softParticleTextureCache: CanvasTexture | null = null;

export function getSoftParticleTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (softParticleTextureCache) return softParticleTextureCache;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  softParticleTextureCache = new CanvasTexture(canvas);
  softParticleTextureCache.needsUpdate = true;
  return softParticleTextureCache;
}
