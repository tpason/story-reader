"use client";

import dynamic from "next/dynamic";
import { ReaderAmbienceCss } from "@/components/ReaderAmbienceCss";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeReaderAmbience = dynamic(
  () => import("@/components/ThreeReaderAmbience").then((mod) => mod.ThreeReaderAmbience),
  { ssr: false },
);

type ReaderAmbienceLayerProps = {
  enabled?: boolean;
};

/**
 * Chapter reader foreground ambience.
 * Mobile / battery saver: CSS only (petals, mist, qi, sway).
 * Desktop: deferred WebGL (wind, petals, spirit particles) — no CSS+WebGL double stack.
 */
export function ReaderAmbienceLayer({ enabled = true }: ReaderAmbienceLayerProps) {
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const webglReady = useDeferredWebglMount(webglEnabled, 2000);

  if (!enabled) return null;

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
