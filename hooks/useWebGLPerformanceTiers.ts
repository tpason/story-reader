"use client";

import {
  probeWebGLPerformance,
  readCachedWebGLPerfTier,
  writeCachedWebGLPerfTier,
  WEBGL_PERF_EVENT,
  type WebGLPerfTier
} from "@/lib/webgl-performance-probe";
import { useEffect, useState } from "react";

export function useWebGLPerformanceTier() {
  const [tier, setTier] = useState<WebGLPerfTier>(() => readCachedWebGLPerfTier() ?? "pending");

  useEffect(() => {
    let cancelled = false;

    function syncFromCache() {
      if (!cancelled) setTier(readCachedWebGLPerfTier() ?? "weak");
    }

    // Compact viewports never mount decorative WebGL — skip GPU probe (heats phones).
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 839px)").matches) {
      if (!readCachedWebGLPerfTier()) writeCachedWebGLPerfTier("weak");
      if (!cancelled) setTier("weak");
      window.addEventListener(WEBGL_PERF_EVENT, syncFromCache);
      return () => {
        cancelled = true;
        window.removeEventListener(WEBGL_PERF_EVENT, syncFromCache);
      };
    }

    const cached = readCachedWebGLPerfTier();
    if (cached) {
      syncFromCache();
    } else {
      void probeWebGLPerformance().then((next) => {
        if (!cancelled) setTier(next);
      });
    }

    window.addEventListener(WEBGL_PERF_EVENT, syncFromCache);
    return () => {
      cancelled = true;
      window.removeEventListener(WEBGL_PERF_EVENT, syncFromCache);
    };
  }, []);

  return tier;
}
