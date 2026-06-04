"use client";

import { ArrowUp } from "lucide-react";
import type { animate as AnimateType } from "animejs";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";

export function GlobalScrollTop() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const animeRef = useRef<typeof AnimateType | null>(null);
  const isVisibleRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const isReaderChapter = /\/stories\/[^/]+\/chapters\/[^/]+/.test(pathname ?? "");

  useEffect(() => {
    if (prefersReducedMotion()) return;
    import("animejs").then((mod) => { animeRef.current = mod.animate; });
  }, []);

  // Restore correct DOM state after any React re-render (e.g. route change resets JSX attrs)
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const shouldShow = !isReaderChapter && isVisibleRef.current;
    button.classList.toggle("scroll-top-button-visible", shouldShow);
    button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    button.tabIndex = shouldShow ? 0 : -1;
  });

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || isReaderChapter) {
      isVisibleRef.current = false;
      return;
    }

    const update = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const scrollingElement = document.scrollingElement ?? document.documentElement;
        const scrollTop = scrollingElement.scrollTop || window.scrollY;
        const shouldShow = scrollTop > Math.min(720, window.innerHeight * 0.8);

        if (isVisibleRef.current === shouldShow) return;
        isVisibleRef.current = shouldShow;

        button.classList.toggle("scroll-top-button-visible", shouldShow);
        button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
        button.tabIndex = shouldShow ? 0 : -1;

        if (!prefersReducedMotion() && animeRef.current) {
          animeRef.current(button, {
            scale: shouldShow ? [0.84, 1] : [1, 0.9],
            rotate: shouldShow ? [-8, 0] : [0, 4],
            duration: shouldShow ? 420 : 180,
            ease: shouldShow ? "outBack" : "inQuad"
          });
        }
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isReaderChapter, pathname]);

  if (isReaderChapter) return null;

  return (
    <button
      ref={buttonRef}
      className="scroll-top-button"
      type="button"
      title="Cuộn lên đầu"
      aria-label="Cuộn lên đầu trang"
      aria-hidden={true}
      tabIndex={-1}
      onClick={() => {
        if (!prefersReducedMotion() && animeRef.current && buttonRef.current) {
          animeRef.current(buttonRef.current, {
            y: [0, -8, 0],
            scale: [1, 1.12, 1],
            duration: 520,
            ease: "outElastic(1, .7)"
          });
        }
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
