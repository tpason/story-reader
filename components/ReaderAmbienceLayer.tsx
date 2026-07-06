"use client";

import dynamic from "next/dynamic";
import { ReaderAmbienceCss } from "@/components/ReaderAmbienceCss";
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
 * Mobile: CSS only (petals, mist, qi, sway).
 * Desktop: CSS + lightweight WebGL (wind, petals, spirit particles).
 */
export function ReaderAmbienceLayer({ enabled = true }: ReaderAmbienceLayerProps) {
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });

  if (!enabled) return null;

  return (
    <div className="reader-ambience-layer" aria-hidden="true">
      <ReaderAmbienceCss />
      {webglEnabled ? <ThreeReaderAmbience /> : null}
    </div>
  );
}
