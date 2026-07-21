"use client";

import dynamic from "next/dynamic";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { ReaderAmbienceCss } from "@/components/ReaderAmbienceCss";

const ThreeReaderAmbience = dynamic(
  () => import("@/components/ThreeReaderAmbience").then((mod) => mod.ThreeReaderAmbience),
  { ssr: false },
);

type ReaderAmbienceLayerProps = {
  enabled?: boolean;
  /** When false, keep CSS vibe only — skip deferred WebGL (faster first paint). */
  allowWebgl?: boolean;
};

/**
 * Mobile ≤839px: off entirely.
 * Desktop: CSS ambience by default; optional deferred WebGL when allowWebgl.
 * Flash mitigation lives on the reading column (no backdrop-filter / solid panel),
 * not by deleting this layer.
 */
export function ReaderAmbienceLayer({ enabled = true, allowWebgl = true }: ReaderAmbienceLayerProps) {
  const isCompact = useCompactViewport();
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const webglReady = useDeferredWebglMount(allowWebgl && webglEnabled && !isCompact, 2000);

  if (!enabled || isCompact) return null;

  const showWebgl = allowWebgl && webglEnabled && webglReady;

  return (
    <div
      className={`reader-ambience-layer${showWebgl ? " reader-ambience-layer--webgl" : ""}`}
      aria-hidden="true"
    >
      {showWebgl ? <ThreeReaderAmbience /> : <ReaderAmbienceCss />}
    </div>
  );
}
