/**
 * Tiểu hồ linh — pose by reading time + saved drag position.
 * Elapsed only advances while the tab is visible.
 */

export type SpiritPose = "stand" | "sit" | "lie" | "sleep";

export const SPIRIT_DISMISS_KEY = "reader:spirit-companion-dismissed";
export const SPIRIT_POS_KEY = "reader:spirit-companion-pos";
export const SPIRIT_ELAPSED_KEY = "reader:spirit-companion-elapsed-ms";

/** Thresholds (visible reading time). */
export const SPIRIT_POSE_AT_MS = {
  sit: 3 * 60_000,
  lie: 8 * 60_000,
  sleep: 15 * 60_000,
} as const;

export function spiritPoseFromElapsed(elapsedMs: number): SpiritPose {
  if (elapsedMs >= SPIRIT_POSE_AT_MS.sleep) return "sleep";
  if (elapsedMs >= SPIRIT_POSE_AT_MS.lie) return "lie";
  if (elapsedMs >= SPIRIT_POSE_AT_MS.sit) return "sit";
  return "stand";
}

export type SpiritPos = { left: number; top: number };

export function readSpiritPos(): SpiritPos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPIRIT_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpiritPos;
    if (
      typeof parsed?.left !== "number" ||
      typeof parsed?.top !== "number" ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSpiritPos(pos: SpiritPos) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPIRIT_POS_KEY, JSON.stringify(pos));
  } catch {
    /* private mode */
  }
}

export function readSpiritElapsedMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(window.sessionStorage.getItem(SPIRIT_ELAPSED_KEY) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeSpiritElapsedMs(ms: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SPIRIT_ELAPSED_KEY, String(Math.max(0, Math.floor(ms))));
  } catch {
    /* private mode */
  }
}

export function clampSpiritPos(
  left: number,
  top: number,
  width: number,
  height: number,
): SpiritPos {
  const pad = 4;
  const maxL = Math.max(pad, window.innerWidth - width - pad);
  const maxT = Math.max(pad, window.innerHeight - height - pad);
  return {
    left: Math.min(maxL, Math.max(pad, left)),
    top: Math.min(maxT, Math.max(pad, top)),
  };
}
