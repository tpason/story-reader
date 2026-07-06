"use client";

import { useEffect, useState } from "react";

/** Defer decorative WebGL mount until idle (reduces homepage/reader GPU spike). */
export function useDeferredWebglMount(enabled: boolean, timeoutMs = 2000) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(mount, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(mount, Math.min(500, timeoutMs));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, timeoutMs]);

  return ready;
}
