import type { PointerEvent as ReactPointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import { readReaderPerformanceMode } from "@/lib/reader-performance-mode";

const COMPACT_MAX_WIDTH = 839;

function isLowEndConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 2) return true;
  const conn = nav.connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return true;
  return false;
}

export function isCardTiltEnabled() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if (window.matchMedia(`(max-width: ${COMPACT_MAX_WIDTH}px)`).matches) return false;
  if (readReaderPerformanceMode() === "battery_saver") return false;
  if (isLowEndConnection()) return false;
  return true;
}

export function applyCardTilt(element: HTMLElement, clientX: number, clientY: number, strength = 1) {
  const rect = element.getBoundingClientRect();
  const x = (clientX - rect.left) / Math.max(1, rect.width);
  const y = (clientY - rect.top) / Math.max(1, rect.height);
  element.style.setProperty("--tilt-x", `${(0.5 - y) * 9 * strength}deg`);
  element.style.setProperty("--tilt-y", `${(x - 0.5) * 10 * strength}deg`);
  element.style.setProperty("--tilt-glow-x", `${x * 100}%`);
  element.style.setProperty("--tilt-glow-y", `${y * 100}%`);
}

export function resetCardTilt(element: HTMLElement) {
  element.style.setProperty("--tilt-x", "0deg");
  element.style.setProperty("--tilt-y", "0deg");
  element.style.setProperty("--tilt-glow-x", "50%");
  element.style.setProperty("--tilt-glow-y", "50%");
}

export function createCardTiltHandlers(strength = 1) {
  if (!isCardTiltEnabled()) return {};
  return {
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      applyCardTilt(event.currentTarget, event.clientX, event.clientY, strength);
    },
    onPointerLeave(event: ReactPointerEvent<HTMLElement>) {
      resetCardTilt(event.currentTarget);
    }
  };
}
