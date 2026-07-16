"use client";

import dynamic from "next/dynamic";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

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
 * Desktop chapter companion: tiểu hồ linh that gazes at pointer / reading line.
 * Off on mobile ≤839, battery saver, reduced motion, and when WebGL is gated.
 */
export function ReaderSpiritCompanion({ enabled = true }: ReaderSpiritCompanionProps) {
  const compact = useCompactViewport();
  const webglEnabled = useDecorativeWebglEnabled({
    tier: "reader",
    compactMaxWidth: 839,
  });
  const ready = useDeferredWebglMount(webglEnabled && enabled && !compact, 2400);

  if (!enabled || compact || !webglEnabled || !ready) return null;

  return (
    <aside className="reader-spirit-companion" aria-hidden="true">
      <ThreeReaderSpiritCompanion />
    </aside>
  );
}
