"use client";

import dynamic from "next/dynamic";
import { XianxiaCssBackdrop } from "@/components/XianxiaCssBackdrop";
import { useXianxiaTimeOfDay } from "@/hooks/useXianxiaTimeOfDay";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

export function XianxiaWorldBackgroundClient() {
  // Desktop only: CSS hides `.xianxia-world-background` ≤839px — must not mark CSS as underWebgl on mobile.
  const webglLayerVisible = useDecorativeWebglEnabled({ tier: "global", allowCompact: false, compactMaxWidth: 839 });
  const timeOfDay = useXianxiaTimeOfDay();

  return (
    <>
      <XianxiaCssBackdrop timeOfDay={timeOfDay} underWebgl={webglLayerVisible} />
      {webglLayerVisible ? <ThreeXianxiaWorldBackground timeOfDay={timeOfDay} /> : null}
    </>
  );
}
