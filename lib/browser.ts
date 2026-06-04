export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Replaces react-device-detect (40KB) — same semantics, zero cost.
// Evaluated once per module load; SSR-safe (returns false on server).
export const isMobile: boolean =
  typeof navigator !== "undefined"
    ? navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent)
    : false;
