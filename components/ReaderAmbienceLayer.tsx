"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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
 * Mobile / battery saver: CSS only (petals, mist, qi, sway).
 * Desktop: deferred WebGL (wind, petals, spirit particles) — no CSS+WebGL double stack.
 */
export function ReaderAmbienceLayer({ enabled = true }: ReaderAmbienceLayerProps) {
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    if (!webglEnabled) {
      setWebglReady(false);
      return;
    }

    let cancelled = false;
    const mount = () => {
      if (!cancelled) setWebglReady(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(mount, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(mount, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [webglEnabled]);

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
