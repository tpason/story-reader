"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type CoverRailSlideProps = {
  children: ReactNode;
  label: string;
  className?: string;
};

/** Horizontal cover rail with always-mounted arrow controls (no mount jitter). */
export function CoverRailSlide({ children, label, className }: CoverRailSlideProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflow = max > 8;
    setCanPrev(overflow && el.scrollLeft > 4);
    setCanNext(overflow && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateEdges) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro?.disconnect();
    };
  }, [updateEdges, children]);

  function slide(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(Math.round(el.clientWidth * 0.75), 220);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className={["cover-rail-slide", className].filter(Boolean).join(" ")}>
      <div
        ref={scrollerRef}
        className="cover-rail-slide-scroller"
        role="list"
        aria-label={label}
      >
        {children}
      </div>
      <button
        type="button"
        className="cover-rail-slide-btn cover-rail-slide-btn--prev"
        aria-label="Trượt sang trái"
        aria-disabled={!canPrev}
        disabled={!canPrev}
        tabIndex={canPrev ? 0 : -1}
        onClick={() => slide(-1)}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <button
        type="button"
        className="cover-rail-slide-btn cover-rail-slide-btn--next"
        aria-label="Trượt sang phải"
        aria-disabled={!canNext}
        disabled={!canNext}
        tabIndex={canNext ? 0 : -1}
        onClick={() => slide(1)}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
