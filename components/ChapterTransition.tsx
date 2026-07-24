"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";

type ChapterTransitionProps = {
  trigger: number;
  direction?: "next" | "prev";
};

const COMPACT_QUERY = "(max-width: 839px)";

export function ChapterTransition({ trigger, direction = "next" }: ChapterTransitionProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;

    // Compact / reduced-motion: skip force-reflow overlay (thermal + a11y).
    if (prefersReducedMotion() || window.matchMedia(COMPACT_QUERY).matches) return;

    const el = overlayRef.current;
    if (!el) return;

    el.classList.remove("chapter-transition--active");
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add("chapter-transition--active");

    const timer = setTimeout(() => {
      el?.classList.remove("chapter-transition--active");
    }, 1300);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div
      ref={overlayRef}
      className={`chapter-transition chapter-transition--${direction}`}
      aria-hidden="true"
    />
  );
}
