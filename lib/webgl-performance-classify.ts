export type WebGLPerfTier = "pending" | "strong" | "weak";

const MIN_SAMPLES = 12;
/** ~29 fps average */
const MAX_AVG_FRAME_MS = 34;
/** Allow occasional hitch; sustained bad p95 = weak */
const MAX_P95_FRAME_MS = 52;

export function classifyFrameSamples(frameMs: number[]): Exclude<WebGLPerfTier, "pending"> {
  if (frameMs.length < MIN_SAMPLES) return "weak";
  const sorted = [...frameMs].sort((a, b) => a - b);
  const avg = frameMs.reduce((sum, value) => sum + value, 0) / frameMs.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? avg;
  return avg > MAX_AVG_FRAME_MS || p95 > MAX_P95_FRAME_MS ? "weak" : "strong";
}
