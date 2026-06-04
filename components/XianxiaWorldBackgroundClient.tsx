"use client";

import dynamic from "next/dynamic";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

export function XianxiaWorldBackgroundClient() {
  const enabled = useDecorativeWebglEnabled();

  if (!enabled) {
    return <div className="xianxia-world-fallback" aria-hidden="true" />;
  }

  return <ThreeXianxiaWorldBackground />;
}
