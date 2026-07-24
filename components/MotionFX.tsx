"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreePageMotion = dynamic(() => import("@/components/ThreePageMotion").then((mod) => mod.ThreePageMotion), {
  ssr: false
});

type MotionFXProps = {
  variant: "library" | "reader" | "error";
};

function scheduleIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 1400 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 600);
  return () => window.clearTimeout(id);
}

export function MotionFX({ variant }: MotionFXProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const entranceRanRef = useRef(false);
  const reduceMotion = prefersReducedMotion();
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ tier: "global" });

  // Entrance once per mount — do NOT re-run when decorativeWebglEnabled flips
  // (gate false→true was reverting anime transforms and re-staggering the library = flash).
  useEffect(() => {
    if (reduceMotion || entranceRanRef.current) return;
    entranceRanRef.current = true;

    let cancelled = false;
    const animations: Array<{ revert: () => void }> = [];

    const cancelIdle = scheduleIdle(() => {
      void (async () => {
        const { animate, stagger } = await import("animejs");
        if (cancelled) return;

        if (variant === "library") {
          // Transform-only on painted SSR cards — opacity:[0,1] blanked first paint.
          animations.push(
            animate(".library-header > *, .category-row, .discover-tabs", {
              y: [18, 0],
              duration: 700,
              delay: stagger(90),
              ease: "outExpo"
            }),
            animate(".cultivation-panel, .continue-card, .discovery-panel, .story-card, .discover-list-card", {
              y: [26, 0],
              duration: 760,
              delay: stagger(36),
              ease: "outExpo"
            }),
            animate(".chip, .discovery-more", {
              scale: [0.96, 1],
              duration: 560,
              delay: stagger(24),
              ease: "outExpo"
            })
          );
        }

        if (variant === "reader") {
          // Transform-only — opacity:[0,1] blanked SSR chapter text (same as library).
          animations.push(
            animate(".reader-heading, .audio-panel, .chapter-nav", {
              y: [20, 0],
              duration: 780,
              delay: stagger(100),
              ease: "outExpo"
            }),
            animate(".reader-content p:nth-child(-n+12)", {
              y: [12, 0],
              duration: 660,
              delay: stagger(28),
              ease: "outExpo"
            }),
            animate(".chapter-sidebar .sidebar-link", {
              x: [-10, 0],
              duration: 540,
              delay: stagger(20),
              ease: "outExpo"
            })
          );
        }

        if (variant === "error") {
          animations.push(
            animate(".error-panel", {
              scale: [0.96, 1],
              y: [22, 0],
              opacity: [0, 1],
              duration: 740,
              ease: "outExpo"
            })
          );
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelIdle();
      animations.forEach((animation) => animation.revert());
    };
  }, [reduceMotion, variant]);

  // Motion lines only when decorative WebGL is on — separate from entrance so gate flips don't jolt cards.
  useEffect(() => {
    if (reduceMotion || !decorativeWebglEnabled) return;

    let cancelled = false;
    const animations: Array<{ revert: () => void }> = [];

    const cancelIdle = scheduleIdle(() => {
      void (async () => {
        const { animate, stagger } = await import("animejs");
        if (cancelled) return;
        animations.push(
          animate(".motion-line", {
            x: ["-18vw", "118vw"],
            opacity: [0, 0.55, 0],
            duration: 4800,
            delay: stagger(820),
            loop: true,
            ease: "inOutSine"
          })
        );
      })();
    });

    return () => {
      cancelled = true;
      cancelIdle();
      animations.forEach((animation) => animation.revert());
    };
  }, [decorativeWebglEnabled, reduceMotion]);

  return (
    <div className={`motion-fx motion-fx-${variant}${decorativeWebglEnabled ? "" : " motion-fx-css"}`} ref={rootRef} aria-hidden="true">
      {decorativeWebglEnabled ? <ThreePageMotion variant={variant} /> : null}
      {!reduceMotion ? (
        <>
          <span className="motion-line motion-line-1" />
          <span className="motion-line motion-line-2" />
          <span className="motion-line motion-line-3" />
        </>
      ) : null}
    </div>
  );
}
