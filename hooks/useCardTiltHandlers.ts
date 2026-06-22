"use client";

import { useEffect, useMemo, useState } from "react";
import { createCardTiltHandlers, isCardTiltEnabled } from "@/lib/card-tilt";

export function useCardTiltHandlers(strength = 1) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    function update() {
      setEnabled(isCardTiltEnabled());
    }
    update();
    const mq = window.matchMedia("(max-width: 839px)");
    mq.addEventListener("change", update);
    window.addEventListener("reader-performance-mode-change", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("reader-performance-mode-change", update);
    };
  }, []);

  return useMemo(
    () => (enabled ? createCardTiltHandlers(strength) : {}),
    [enabled, strength]
  );
}
