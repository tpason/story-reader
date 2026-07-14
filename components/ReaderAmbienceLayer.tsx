"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ReaderAmbienceCss } from "@/components/ReaderAmbienceCss";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeReaderAmbience = dynamic(
  () => import("@/components/ThreeReaderAmbience").then((mod) => mod.ThreeReaderAmbience),
  { ssr: false },
);

const COMPACT_QUERY = "(max-width: 839px)";

type ReaderAmbienceLayerProps = {
  enabled?: boolean;
};

/**
 * Chapter reader foreground ambience.
 * Mobile ≤839px: off entirely (blur/filter layers heat phones even with animation:none).
 * Desktop: deferred WebGL, CSS fallback when WebGL gated off.
 */
export function ReaderAmbienceLayer({ enabled = true }: ReaderAmbienceLayerProps) {
  const [isCompact, setIsCompact] = useState(false);
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const webglReady = useDeferredWebglMount(webglEnabled, 2000);

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const sync = () => setIsCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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
