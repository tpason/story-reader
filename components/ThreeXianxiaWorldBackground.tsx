"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { XianxiaScene } from "./xianxia-background/XianxiaScene";
import type { TimeOfDay } from "./xianxia-background/sceneConfig";
import type { SceneQualityTier } from "./xianxia-background/sceneConfig";

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
    <div className="xianxia-world-background" data-xi-time={timeOfDay} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={compact ? [0.6, 0.75] : midRange ? [0.6, 0.85] : [0.75, 1.0]}
        frameloop={frameloop}
        gl={{
          antialias: qualityTier === "full",
          alpha: false,
          powerPreference: "low-power",
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
