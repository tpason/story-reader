import { CanvasTexture, SRGBColorSpace } from "three";

type RGB = [number, number, number];

function seeded(n: number, s: number) {
  const x = Math.sin(s * 47.31 + n * 127.1) * 43758.55;
  return x - Math.floor(x);
}

/**
 * Procedural fluffy cloud texture.
 * Produces a "torn silk" cloud form: layered radial blobs with bright top,
 * shadowed base, and wispy edge tendrils.
 */
export function makeFluffyCloudTexture(
  seed: number,
  tint: RGB = [255, 252, 242],
  size = 512,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.round(size * 0.42); // wide, landscape aspect ~2.4:1
  const ctx = canvas.getContext("2d")!;

  const w = canvas.width;
  const h = canvas.height;
  const [tr, tg, tb] = tint;
  const cx = w * 0.50;
  const cy = h * 0.56;

  // Core body blobs (14–18)
  const blobCount = 14 + Math.floor(seeded(seed, 77) * 4);
  for (let i = 0; i < blobCount; i++) {
    const bx = cx + (seeded(i * 4, seed) - 0.5) * w * 0.78;
    const by = cy + (seeded(i * 4 + 1, seed) - 0.5) * h * 0.38;
    const r = (0.08 + seeded(i * 4 + 2, seed) * 0.14) * h;
    const a = 0.12 + seeded(i * 4 + 3, seed) * 0.10;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, `rgba(${tr},${tg},${tb},${a.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(${tr},${tg},${tb},${(a * 0.44).toFixed(3)})`);
    g.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Bright sunlit top highlights (smaller, offset upward)
  const hlCount = 6 + Math.floor(seeded(seed + 1, 99) * 3);
  for (let i = 0; i < hlCount; i++) {
    const bx = cx + (seeded(i * 3 + 100, seed) - 0.5) * w * 0.60;
    const by = cy - h * 0.12 + (seeded(i * 3 + 101, seed) - 0.5) * h * 0.22;
    const r = (0.05 + seeded(i * 3 + 102, seed) * 0.09) * h;
    const a = 0.16 + seeded(i * 3 + 103, seed) * 0.08;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Shadow base blobs (darker, offset downward, ~30% opacity)
  const shCount = 4 + Math.floor(seeded(seed + 2, 55) * 3);
  const sr = Math.round(tr * 0.80);
  const sg = Math.round(tg * 0.82);
  const sb = Math.round(tb * 0.88);
  for (let i = 0; i < shCount; i++) {
    const bx = cx + (seeded(i * 3 + 200, seed) - 0.5) * w * 0.55;
    const by = cy + h * 0.10 + seeded(i * 3 + 201, seed) * h * 0.18;
    const r = (0.06 + seeded(i * 3 + 202, seed) * 0.10) * h;
    const a = 0.06 + seeded(i * 3 + 203, seed) * 0.05;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, `rgba(${sr},${sg},${sb},${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${sr},${sg},${sb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Wispy edge tendrils (thin, elongated, 12–18% opacity)
  const wCount = 8 + Math.floor(seeded(seed + 3, 33) * 4);
  for (let i = 0; i < wCount; i++) {
    const side = seeded(i, seed + 4) > 0.5 ? 1 : -1;
    const bx = cx + side * (w * 0.28 + seeded(i * 3 + 300, seed) * w * 0.22);
    const by = cy + (seeded(i * 3 + 301, seed) - 0.5) * h * 0.44;
    const rx = (0.10 + seeded(i * 3 + 302, seed) * 0.16) * w;
    const ry = (0.018 + seeded(i * 3 + 303, seed) * 0.022) * h;
    const a = 0.06 + seeded(i * 3 + 304, seed) * 0.07;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(rx / ry, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, `rgba(${tr},${tg},${tb},${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * Wide horizontal mist band for low-altitude drift layers.
 */
export function makeMistBandTexture(tint: RGB = [220, 225, 218], size = 512): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.round(size * 0.25);
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const [tr, tg, tb] = tint;

  // Core horizontal band
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(${tr},${tg},${tb},0)`);
  g.addColorStop(0.35, `rgba(${tr},${tg},${tb},0.22)`);
  g.addColorStop(0.65, `rgba(${tr},${tg},${tb},0.22)`);
  g.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Horizontal variation blobs for irregular edge
  for (let i = 0; i < 9; i++) {
    const bx = (i / 8) * w + (seeded(i, 77) - 0.5) * w * 0.18;
    const by = h * 0.50;
    const rx = w * (0.08 + seeded(i + 10, 77) * 0.06);
    const ry = h * (0.22 + seeded(i + 20, 77) * 0.16);
    const a = 0.06 + seeded(i + 30, 77) * 0.05;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(rx / ry, 1);
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    bg.addColorStop(0, `rgba(${tr},${tg},${tb},${a.toFixed(3)})`);
    bg.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, ry, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
