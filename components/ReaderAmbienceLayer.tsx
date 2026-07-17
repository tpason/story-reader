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
};

/**
 * Mobile ≤839px: off entirely.
 * Desktop: deferred WebGL, CSS fallback when WebGL gated off.
 */
export function ReaderAmbienceLayer({ enabled = true }: ReaderAmbienceLayerProps) {
  const isCompact = useCompactViewport();
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const webglReady = useDeferredWebglMount(webglEnabled && !isCompact, 2000);

  if (!enabled || isCompact) return null;

  const showWebgl = webglEnabled && webglReady;

  return (
    <div
      className={`reader-ambience-layer${showWebgl ? " reader-ambience-layer--webgl" : ""}`}
      aria-hidden="true"
    >
      {showWebgl ? <ThreeReaderAmbience /> : <ReaderAmbienceCss />}
    </div>
  );
}
