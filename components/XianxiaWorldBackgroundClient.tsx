"use client";

import dynamic from "next/dynamic";
import { XianxiaCssBackdrop } from "@/components/XianxiaCssBackdrop";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useXianxiaTimeOfDay } from "@/hooks/useXianxiaTimeOfDay";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

export function XianxiaWorldBackgroundClient() {
  // Desktop only: CSS hides `.xianxia-world-background` ≤839px — must not mark CSS as underWebgl on mobile.
  const webglLayerVisible = useDecorativeWebglEnabled({ tier: "global", allowCompact: false, compactMaxWidth: 839 });
  const webglReady = useDeferredWebglMount(webglLayerVisible, 1200);
  const timeOfDay = useXianxiaTimeOfDay();

  return (
    <>
      <XianxiaCssBackdrop timeOfDay={timeOfDay} underWebgl={webglLayerVisible && webglReady} />
      {webglLayerVisible && webglReady ? <ThreeXianxiaWorldBackground timeOfDay={timeOfDay} /> : null}
    </>
  );
}
