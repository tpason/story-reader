"use client";

import { ArrowUp } from "lucide-react";
import type { animate as AnimateType } from "animejs";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import { forceUnlockBodyScroll } from "@/lib/body-scroll-lock";

const LIBRARY_SCROLL_SELECTOR = ".story-library-scroll";

function maxLibraryScrollTop() {
  let max = 0;
  document.querySelectorAll<HTMLElement>(LIBRARY_SCROLL_SELECTOR).forEach((node) => {
    max = Math.max(max, node.scrollTop);
  });
  return max;
}

function resetLibraryScrollTops(behavior: ScrollBehavior) {
  document.querySelectorAll<HTMLElement>(LIBRARY_SCROLL_SELECTOR).forEach((node) => {
    if (typeof node.scrollTo === "function") {
      node.scrollTo({ top: 0, behavior });
    } else {
      node.scrollTop = 0;
    }
  });
}

export function GlobalScrollTop() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const animeRef = useRef<typeof AnimateType | null>(null);
  const isVisibleRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const isReaderChapter = /\/stories\/[^/]+\/chapters\/[^/]+/.test(pathname ?? "");

  // Safety net when leaving the reader: nested locks must not leave body stuck.
  // Skip while still on a chapter route so page-layout lock is not wiped mid-read.
  useEffect(() => {
    if (!isReaderChapter) {
      forceUnlockBodyScroll();
    }
  }, [pathname, isReaderChapter]);

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
        const threshold = Math.min(720, window.innerHeight * 0.8);
        // Capture-phase scroll below also covers `.story-library-scroll` internal scroll.
        const shouldShow = scrollTop > threshold || maxLibraryScrollTop() > 160;

        if (isVisibleRef.current === shouldShow) return;
        isVisibleRef.current = shouldShow;

        // Visibility is CSS-transitioned via .scroll-top-button-visible (no setState / no show anime).
        button.classList.toggle("scroll-top-button-visible", shouldShow);
        button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
        button.tabIndex = shouldShow ? 0 : -1;
      });
    };

    update();
    // Capture so nested overflow hosts (library feed) notify without per-node wiring.
    document.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      document.removeEventListener("scroll", update, { capture: true });
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
        const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
        window.scrollTo({ top: 0, behavior });
        resetLibraryScrollTops(behavior);
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
