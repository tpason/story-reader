"use client";

import { animate, stagger } from "animejs";
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

export function MotionFX({ variant }: MotionFXProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = prefersReducedMotion();
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ tier: "global" });

  useEffect(() => {
    if (reduceMotion) return;

    const animations: Array<{ revert: () => void }> = [];

    if (decorativeWebglEnabled) {
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
    }

    if (variant === "library") {
      animations.push(
        animate(".library-header > *, .category-row, .discover-tabs", {
          y: [18, 0],
          opacity: [0, 1],
          duration: 700,
          delay: stagger(90),
          ease: "outExpo"
        }),
        animate(".cultivation-panel, .continue-card, .discovery-panel, .story-card, .discover-list-card", {
          y: [26, 0],
          opacity: [0, 1],
          duration: 760,
          delay: stagger(36),
          ease: "outExpo"
        }),
        animate(".chip, .discovery-more", {
          scale: [0.96, 1],
          opacity: [0, 1],
          duration: 560,
          delay: stagger(24),
          ease: "outExpo"
        })
      );
    }

    if (variant === "reader") {
      animations.push(
        animate(".reader-heading, .audio-panel, .chapter-nav", {
          y: [20, 0],
          opacity: [0, 1],
          duration: 780,
          delay: stagger(100),
          ease: "outExpo"
        }),
        animate(".reader-content p:nth-child(-n+12)", {
          y: [12, 0],
          opacity: [0, 1],
          duration: 660,
          delay: stagger(28),
          ease: "outExpo"
        }),
        animate(".chapter-sidebar .sidebar-link", {
          x: [-10, 0],
          opacity: [0, 1],
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

    return () => {
      animations.forEach((animation) => animation.revert());
    };
  }, [decorativeWebglEnabled, reduceMotion, variant]);

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
