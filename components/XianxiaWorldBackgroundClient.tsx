"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaWorldBackground = dynamic(
  () => import("@/components/ThreeXianxiaWorldBackground").then((mod) => mod.ThreeXianxiaWorldBackground),
  { ssr: false }
);

// Reader pages run ThreeReaderAtmosphere — no need for the full world background
const READER_PATH_RE = /^\/stories\/[^/]+\/chapters\/\d+/;

export function XianxiaWorldBackgroundClient() {
  const enabled = useDecorativeWebglEnabled();
  const pathname = usePathname();

  if (!enabled || READER_PATH_RE.test(pathname ?? "")) {
    return null;
  }

  return <ThreeXianxiaWorldBackground />;
}
