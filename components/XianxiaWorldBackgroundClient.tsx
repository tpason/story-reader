"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  // Chapter pages: CSS sky only (same mountains as home). No world WebGL remount per chapter.
  const wantWebgl = webglLayerVisible && !isReaderChapter;
  const webglReady = useDeferredWebglMount(wantWebgl, 1200);
  const timeOfDay = useXianxiaTimeOfDay();
  // Dim CSS only after WebGL fade-in has started — avoids hard A→B snap when class flips with mount.
  const [underWebgl, setUnderWebgl] = useState(false);

  useEffect(() => {
    if (!wantWebgl || !webglReady) {
      setUnderWebgl(false);
      return;
    }
    const id = window.setTimeout(() => setUnderWebgl(true), 420);
    return () => window.clearTimeout(id);
  }, [wantWebgl, webglReady]);

  return (
    <>
      <XianxiaCssBackdrop timeOfDay={timeOfDay} underWebgl={underWebgl} />
      {wantWebgl && webglReady ? <ThreeXianxiaWorldBackground timeOfDay={timeOfDay} /> : null}
    </>
  );
}
