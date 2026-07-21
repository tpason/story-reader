"use client";

import dynamic from "next/dynamic";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeReaderAmbience = dynamic(
  () => import("@/components/ThreeReaderAmbience").then((mod) => mod.ThreeReaderAmbience),
  { ssr: false },
);

type ReaderAmbienceLayerProps = {
  enabled?: boolean;
  /** Admin-only WebGL ambience. When false, mount nothing (CSS mist flashed on scroll). */
  allowWebgl?: boolean;
};

/**
 * Mobile ≤839px: off entirely.
 * Public desktop: off (opaque shell; CSS ambience caused compositor flash).
 * Admin desktop: deferred WebGL only when allowWebgl.
 */
export function ReaderAmbienceLayer({ enabled = true, allowWebgl = true }: ReaderAmbienceLayerProps) {
  const isCompact = useCompactViewport();
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const webglReady = useDeferredWebglMount(allowWebgl && webglEnabled && !isCompact, 2000);

  if (!enabled || isCompact || !allowWebgl) return null;

  const showWebgl = webglEnabled && webglReady;
  if (!showWebgl) return null;

  return (
    <div className="reader-ambience-layer reader-ambience-layer--webgl" aria-hidden="true">
      <ThreeReaderAmbience />
    </div>
  );
}
