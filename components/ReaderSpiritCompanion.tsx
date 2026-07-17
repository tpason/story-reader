"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ReaderSpiritCompanionLite } from "@/components/ReaderSpiritCompanionLite";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import {
  readReaderPerformanceMode,
  type ReaderPerformanceMode,
} from "@/lib/reader-performance-mode";

const ThreeReaderSpiritCompanion = dynamic(
  () =>
    import("@/components/ThreeReaderSpiritCompanion").then(
      (mod) => mod.ThreeReaderSpiritCompanion,
    ),
  { ssr: false },
);

type ReaderSpiritCompanionProps = {
  /** When false (focus mode), companion is hidden. */
  enabled?: boolean;
};

/**
 * Chapter companion: tiểu hồ linh gazing at pointer / reading line.
 * Desktop → WebGL; mobile ≤839 → CSS/SVG lite (no WebGL heat).
 * Hidden on focus mode, battery saver, and prefers-reduced-motion.
 */
export function ReaderSpiritCompanion({ enabled = true }: ReaderSpiritCompanionProps) {
  const compact = useCompactViewport();
  const [perfMode, setPerfMode] = useState<ReaderPerformanceMode>("balanced");
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    function sync() {
      setPerfMode(readReaderPerformanceMode());
      setMotionOk(!prefersReducedMotion());
    }
    sync();
    window.addEventListener("reader:performance-mode", sync);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("reader:performance-mode", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const batteryOff = perfMode === "battery_saver";
  const show = enabled && motionOk && !batteryOff;

  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const webglReady = useDeferredWebglMount(show && !compact && webglEnabled, 2400);

  if (!show) return null;

  if (compact) {
    return (
      <aside className="reader-spirit-companion reader-spirit-companion--lite" aria-hidden="true">
        <ReaderSpiritCompanionLite />
      </aside>
    );
  }

  if (!webglEnabled || !webglReady) return null;

  return (
    <aside className="reader-spirit-companion" aria-hidden="true">
      <ThreeReaderSpiritCompanion />
    </aside>
  );
}
