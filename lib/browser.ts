export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Replaces react-device-detect (40KB) — same semantics, zero cost.
// Evaluated once per module load; SSR-safe (returns false on server).
export const isMobile: boolean =
  typeof navigator !== "undefined"
    ? navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent)
    : false;

export function shouldReduceReaderBackgroundWork() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (document.visibilityState === "hidden") return true;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const compact = window.matchMedia("(max-width: 839px)").matches;
  const connection = nav.connection;

  return (
    isMobile ||
    isIos ||
    compact ||
    Boolean(connection?.saveData) ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "slow-2g" ||
    (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4)
  );
}
