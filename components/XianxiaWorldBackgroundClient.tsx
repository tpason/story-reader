"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { XianxiaCssBackdrop } from "@/components/XianxiaCssBackdrop";
import { useXianxiaTimeOfDay } from "@/hooks/useXianxiaTimeOfDay";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

// Reader pages run ThreeReaderAtmosphere — no need for the full world background
const READER_PATH_RE = /^\/stories\/[^/]+\/chapters\/\d+/;

export function XianxiaWorldBackgroundClient() {
  const webglEnabled = useDecorativeWebglEnabled();
  const timeOfDay = useXianxiaTimeOfDay();
  const pathname = usePathname();

  if (READER_PATH_RE.test(pathname ?? "")) {
    return null;
  }

  if (!webglEnabled) {
    return <XianxiaCssBackdrop timeOfDay={timeOfDay} />;
  }

  return <ThreeXianxiaWorldBackground timeOfDay={timeOfDay} />;
}
