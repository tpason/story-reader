"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { XianxiaCssBackdrop } from "@/components/XianxiaCssBackdrop";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useXianxiaTimeOfDay } from "@/hooks/useXianxiaTimeOfDay";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

const READER_CHAPTER_RE = /^\/stories\/[^/]+\/chapters\/\d+/;

export function XianxiaWorldBackgroundClient() {
  const pathname = usePathname();
  const isReaderChapter = READER_CHAPTER_RE.test(pathname ?? "");
  // Desktop only: CSS hides `.xianxia-world-background` ≤839px — must not mark CSS as underWebgl on mobile.
  const webglLayerVisible = useDecorativeWebglEnabled({ tier: "global", allowCompact: false, compactMaxWidth: 839 });
  // Chapter pages never mount world backdrop (opaque reader shell; sky CSS flashed on desktop scroll).
  const wantWebgl = webglLayerVisible && !isReaderChapter;
  const webglReady = useDeferredWebglMount(wantWebgl, 1200);
  const timeOfDay = useXianxiaTimeOfDay();

  if (isReaderChapter) return null;

  return (
    <>
      <XianxiaCssBackdrop timeOfDay={timeOfDay} underWebgl={wantWebgl && webglReady} />
      {wantWebgl && webglReady ? <ThreeXianxiaWorldBackground timeOfDay={timeOfDay} /> : null}
    </>
  );
}
