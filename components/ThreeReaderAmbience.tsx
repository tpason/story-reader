"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { ReaderAmbienceScene } from "./xianxia-background/ReaderAmbienceScene";
import type { SceneQualityTier } from "./xianxia-background/sceneConfig";

export function ThreeReaderAmbience() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [midRange, setMidRange] = useState(false);
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
      { threshold: 0.05 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const qualityTier: SceneQualityTier = compact ? "phone" : midRange ? "mid" : "full";

  return (
    <div ref={hostRef} className="reader-ambience-webgl" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.2, 5.2], fov: 42 }}
        dpr={compact ? [0.5, 0.65] : midRange ? [0.5, 0.7] : [0.6, 0.85]}
        frameloop={frameloop}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ReaderAmbienceScene qualityTier={qualityTier} />
        </Suspense>
      </Canvas>
    </div>
  );
}
