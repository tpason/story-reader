"use client";

import { useEffect } from "react";
import { readReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { classifyFrameSamples } from "@/lib/webgl-performance-classify";
import { writeCachedWebGLPerfTier } from "@/lib/webgl-performance-probe";

const WATCHDOG_SESSION_KEY = "reader:webgl-watchdog-ran";
const WATCHDOG_DELAY_MS = 520;
const WATCHDOG_DURATION_MS = 2000;

type UseWebGLRuntimeWatchdogOptions = {
  enabled: boolean;
};

/**
 * Samples rAF deltas after reader WebGL mounts; downgrades session perf tier when janky.
 */
export function useWebGLRuntimeWatchdog({ enabled }: UseWebGLRuntimeWatchdogOptions) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (readReaderPerformanceMode() !== "balanced") return;
    if (window.sessionStorage.getItem(WATCHDOG_SESSION_KEY) === "1") return;

    let cancelled = false;
    let frameId = 0;
    let timeoutId = 0;
    const frameMs: number[] = [];
    let last = performance.now();
    let tick = 0;

    function finish() {
      if (cancelled) return;
      window.sessionStorage.setItem(WATCHDOG_SESSION_KEY, "1");
      const tier = classifyFrameSamples(frameMs);
      if (tier === "weak") {
        writeCachedWebGLPerfTier("weak");
      }
    }

    function sample(now: number) {
      if (cancelled) return;
      const delta = now - last;
      if (delta > 0 && tick > 0) frameMs.push(delta);
      last = now;
      tick += 1;

      if (now - start < WATCHDOG_DURATION_MS) {
        frameId = window.requestAnimationFrame(sample);
        return;
      }
      finish();
    }

    const start = performance.now();
    timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      frameId = window.requestAnimationFrame(sample);
    }, WATCHDOG_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [enabled]);
}
