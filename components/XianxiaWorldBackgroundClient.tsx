"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { XianxiaCssBackdrop } from "@/components/XianxiaCssBackdrop";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { useXianxiaTimeOfDay } from "@/hooks/useXianxiaTimeOfDay";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

const READER_CHAPTER_RE = /^\/stories\/[^/]+\/chapters\/\d+/;

export function XianxiaWorldBackgroundClient() {
  const pathname = usePathname();
  const compact = useCompactViewport();
  const isReaderChapter = READER_CHAPTER_RE.test(pathname ?? "");
  // Desktop only: CSS hides `.xianxia-world-background` ≤839px — must not mark CSS as underWebgl on mobile.
  const webglLayerVisible = useDecorativeWebglEnabled({ tier: "global", allowCompact: false, compactMaxWidth: 839 });
  // Chapter pages never mount world WebGL (sky CSS only on desktop chapter).
  const wantWebgl = webglLayerVisible && !isReaderChapter;
  const webglReady = useDeferredWebglMount(wantWebgl, 1200);
  const timeOfDay = useXianxiaTimeOfDay();

  // Compact chapter: skip backdrop (opaque shell + cooler phone).
  // Desktop chapter keeps CSS sky; WebGL stays off on chapter routes.
  if (isReaderChapter && compact) return null;

  return (
    <>
      <XianxiaCssBackdrop timeOfDay={timeOfDay} underWebgl={wantWebgl && webglReady} />
      {wantWebgl && webglReady ? <ThreeXianxiaWorldBackground timeOfDay={timeOfDay} /> : null}
    </>
  );
}
