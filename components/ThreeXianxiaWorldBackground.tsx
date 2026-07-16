"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { XianxiaScene } from "./xianxia-background/XianxiaScene";
import type { TimeOfDay } from "./xianxia-background/sceneConfig";
import type { SceneQualityTier } from "./xianxia-background/sceneConfig";
import { readCachedWebGLPerfTier, WEBGL_PERF_EVENT } from "@/lib/webgl-performance-probe";

const CANVAS_BG: Record<TimeOfDay, string> = {
  dawn: "#1a1420",
  day: "#8aa8b8",
  dusk: "#181018",
  night: "#020408",
};

type ThreeXianxiaWorldBackgroundProps = {
  timeOfDay: TimeOfDay;
};

export function ThreeXianxiaWorldBackground({ timeOfDay }: ThreeXianxiaWorldBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [midRange, setMidRange] = useState(false);
  const [weakGpu, setWeakGpu] = useState(false);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const pageVisibleRef = useRef(true);
  const intersectingRef = useRef(true);

  const syncFrameloop = () => {
    setFrameloop(pageVisibleRef.current && intersectingRef.current ? "always" : "never");
  };

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 839px)");
    const midRangeQuery = window.matchMedia("(max-width: 1199px)");

    const update = () => {
      const isCompact = compactQuery.matches;
      setCompact(isCompact);
      setMidRange(midRangeQuery.matches && !isCompact);
    };

    update();
    compactQuery.addEventListener("change", update);
    midRangeQuery.addEventListener("change", update);
    return () => {
      compactQuery.removeEventListener("change", update);
      midRangeQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const syncWeak = () => setWeakGpu(readCachedWebGLPerfTier() === "weak");
    syncWeak();
    window.addEventListener(WEBGL_PERF_EVENT, syncWeak);
    return () => window.removeEventListener(WEBGL_PERF_EVENT, syncWeak);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      pageVisibleRef.current = !document.hidden;
      syncFrameloop();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = Boolean(entry?.isIntersecting);
        syncFrameloop();
      },
      { threshold: 0.02 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Wide desktop can still be mid-tier if the GPU probe said weak.
  const qualityTier: SceneQualityTier = compact
    ? "phone"
    : midRange || weakGpu
      ? "mid"
      : "full";

  // Sharpness budget: full ≈ native DPR + AA; mid slightly below; never smash to ~0.6×
  // (that combo with half-res EffectComposer is what made the scene look flat/pixelated).
  const dpr =
    qualityTier === "phone"
      ? ([0.55, 0.7] as [number, number])
      : qualityTier === "mid"
        ? ([0.7, 0.95] as [number, number])
        : ([0.85, 1.25] as [number, number]);

  return (
    <div
      ref={hostRef}
      className="xianxia-world-background"
      data-xi-time={timeOfDay}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={dpr}
        frameloop={frameloop}
        gl={{
          antialias: qualityTier === "full",
          alpha: false,
          powerPreference: qualityTier === "full" ? "high-performance" : "low-power",
          stencil: false,
          depth: true,
        }}
        style={{ background: CANVAS_BG[timeOfDay] }}
      >
        <Suspense fallback={null}>
          <XianxiaScene timeOfDay={timeOfDay} qualityTier={qualityTier} />
        </Suspense>
      </Canvas>
    </div>
  );
}
