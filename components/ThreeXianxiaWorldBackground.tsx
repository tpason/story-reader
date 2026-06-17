"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import { XianxiaScene } from "./xianxia-background/XianxiaScene";
import type { TimeOfDay } from "./xianxia-background/sceneConfig";

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

export function ThreeXianxiaWorldBackground() {
  const timeOfDay = useMemo(getTimeOfDay, []);
  // compact  = ≤839px  (phone): this component shouldn't render — useDecorativeWebglEnabled kills it
  // midRange = 840–1199px (tablet landscape): lower DPR + no antialias, effects preserved
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

  // Quality tiers:
  //   compact  (≤839px)  : shouldn't reach here, but safe fallback — minimal quality
  //   midRange (840–1199px): tablet — lower DPR, no antialias, no GodRays/WaterPlane
  //   full     (≥1200px) : desktop — full quality
  const isReducedQuality = compact || midRange;

  return (
    <div className="xianxia-world-background" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={compact ? [0.6, 0.75] : midRange ? [0.6, 0.85] : [0.75, 1.0]}
        frameloop={frameloop}
        gl={{
          antialias: !isReducedQuality,
          alpha: false,
          powerPreference: "low-power"
        }}
        style={{ background: "#000" }}
      >
        <Suspense fallback={null}>
          {/* Pass compact=true for tablet as well — disables GodRays, WaterPlane, CloudShadow */}
          <XianxiaScene timeOfDay={timeOfDay} compact={isReducedQuality} />
        </Suspense>
      </Canvas>
    </div>
  );
}
