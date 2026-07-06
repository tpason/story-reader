"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { ReaderAmbienceScene } from "./xianxia-background/ReaderAmbienceScene";
import type { SceneQualityTier } from "./xianxia-background/sceneConfig";

export function ThreeReaderAmbience() {
  const [compact, setCompact] = useState(false);
  const [midRange, setMidRange] = useState(false);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

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
    const handleVisibility = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const qualityTier: SceneQualityTier = compact ? "phone" : midRange ? "mid" : "full";

  return (
    <div className="reader-ambience-webgl" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.2, 5.2], fov: 42 }}
        dpr={compact ? [0.5, 0.65] : midRange ? [0.55, 0.75] : [0.65, 0.9]}
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
