"use client";

import {
  probeWebGLPerformance,
  readCachedWebGLPerfTier,
  writeCachedWebGLPerfTier,
  WEBGL_PERF_EVENT,
  type WebGLPerfTier
} from "@/lib/webgl-performance-probe";
import { siteDecorativeWebglAllowed } from "@/lib/app-features";
import { useAppSelector } from "@/lib/store-hooks";
import { useEffect, useState } from "react";

export function useWebGLPerformanceTier() {
  const isAdmin = useAppSelector((state) => Boolean(state.identity.user?.isAdmin));
  const mayUseDecorativeWebgl = siteDecorativeWebglAllowed(isAdmin);
  const [tier, setTier] = useState<WebGLPerfTier>(() => readCachedWebGLPerfTier() ?? "pending");

  useEffect(() => {
    let cancelled = false;
    let idleId = 0;
    let timeoutId = 0;

    function syncFromCache() {
      if (!cancelled) setTier(readCachedWebGLPerfTier() ?? "weak");
    }

    // Non-admin: CSS vibe only — skip GPU probe spike entirely.
    if (!mayUseDecorativeWebgl) {
      if (!cancelled) setTier("weak");
      return () => {
        cancelled = true;
      };
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
      const runProbe = () => {
        if (cancelled) return;
        void probeWebGLPerformance().then((next) => {
          if (!cancelled) setTier(next);
        });
      };
      // Defer past first content paint so probe rAF does not fight chapter layout.
      const requestIdle = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (typeof requestIdle === "function") {
        idleId = requestIdle(runProbe, { timeout: 2500 });
      } else {
        timeoutId = window.setTimeout(runProbe, 1200);
      }
    }

    window.addEventListener(WEBGL_PERF_EVENT, syncFromCache);
    return () => {
      cancelled = true;
      const cancelIdle = (
        window as Window & { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      if (idleId && typeof cancelIdle === "function") {
        cancelIdle(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener(WEBGL_PERF_EVENT, syncFromCache);
    };
  }, [mayUseDecorativeWebgl]);

  return tier;
}
