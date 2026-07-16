"use client";

import { useEffect, useState } from "react";

const DEFAULT_COMPACT_QUERY = "(max-width: 839px)";

/** Client-only compact viewport flag (SSR → false, then sync). */
export function useCompactViewport(query = DEFAULT_COMPACT_QUERY) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    function sync() {
      setCompact(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return compact;
}
