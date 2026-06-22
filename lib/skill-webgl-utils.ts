/** Deterministic 0–1 noise for skill WebGL motion seeds. */
export function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
