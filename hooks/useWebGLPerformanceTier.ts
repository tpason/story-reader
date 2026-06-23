"use client";

import {
  probeWebGLPerformance,
  readCachedWebGLPerfTier,
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
