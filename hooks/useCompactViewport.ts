"use client";

import { useCallback, useSyncExternalStore } from "react";

const DEFAULT_COMPACT_QUERY = "(max-width: 839px)";

function getServerSnapshot() {
  return false;
}

/**
 * Compact viewport flag — sync on first client paint (no false→true flip after mount).
 * SSR / getServerSnapshot stay false to avoid hydration mismatches.
 * Critical chrome also follows `html[data-xi-compact]` + `@media (max-width:839px)`
 * so a late `--compact` class does not change first-paint layout.
 */
export function useCompactViewport(query = DEFAULT_COMPACT_QUERY) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
