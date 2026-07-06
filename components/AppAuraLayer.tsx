"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import type { AppAuraVariant } from "@/components/ThreeAppAura";

const ThreeAppAura = dynamic(() => import("@/components/ThreeAppAura").then((mod) => mod.ThreeAppAura), { ssr: false });

const READER_CHAPTER_RE = /^\/stories\/[^/]+\/chapters\/\d+/;

function resolveAuraVariant(pathname: string | null, tab: string | null): AppAuraVariant {
  if (pathname?.startsWith("/rankings")) {
    return tab === "readers" ? "readers" : "stories";
  }
  return "global";
}

function AuraCssLayers() {
  return (
    <>
      <span className="app-aura-css app-aura-css-mist" />
      <span className="app-aura-css app-aura-css-mist app-aura-css-mist-2" />
      <span className="app-aura-css app-aura-css-light" />
      <span className="app-aura-css app-aura-css-qi" />
    </>
  );
}

export function AppAuraLayer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const variant = resolveAuraVariant(pathname, searchParams.get("tab"));
  const isReaderChapter = READER_CHAPTER_RE.test(pathname ?? "");
  const webglEnabled = useDecorativeWebglEnabled({
    tier: isReaderChapter ? "reader" : "global",
    allowCompact: !isReaderChapter,
    compactMaxWidth: 839,
  });
  const reduceMotion = prefersReducedMotion();
  const showWebgl = webglEnabled && !reduceMotion && !isReaderChapter;

  return (
    <div
      className={`app-aura-layer app-aura-layer--${variant}${isReaderChapter ? " app-aura-layer--reader" : ""}${showWebgl ? " app-aura-layer--webgl" : ""}`}
      aria-hidden
    >
      {showWebgl ? <ThreeAppAura variant={variant} /> : <AuraCssLayers />}
    </div>
  );
}
