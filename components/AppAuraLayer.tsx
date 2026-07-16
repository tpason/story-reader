"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
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
  const compact = useCompactViewport();
  const variant = resolveAuraVariant(pathname, searchParams.get("tab"));
  const isReaderChapter = READER_CHAPTER_RE.test(pathname ?? "");
  const webglEnabled = useDecorativeWebglEnabled({
    tier: isReaderChapter ? "reader" : "global",
    allowCompact: false,
    compactMaxWidth: 839,
  });
  const reduceMotion = prefersReducedMotion();
  // Homepage/library desktop: XianxiaWorldBackground owns atmosphere — skip AppAura
  // entirely (second canvas + mist rectangles). AppAura only when world WebGL is off.
  const worldOwnsAtmosphere = !isReaderChapter && webglEnabled;
  const canUseWebgl = webglEnabled && !reduceMotion && !isReaderChapter && !worldOwnsAtmosphere;
  const webglReady = useDeferredWebglMount(canUseWebgl, 2400);
  const showWebgl = canUseWebgl && webglReady;

  // Compact chapter only: skip aura to cut compositor heat under opaque reader shell.
  // Desktop chapter keeps CSS aura (no WebGL) — matches pre-cooler desktop look.
  if (isReaderChapter && compact) return null;

  if (worldOwnsAtmosphere) return null;

  return (
    <div
      className={`app-aura-layer app-aura-layer--${variant}${isReaderChapter ? " app-aura-layer--reader" : ""}${showWebgl ? " app-aura-layer--webgl" : ""}`}
      aria-hidden
    >
      {showWebgl ? <ThreeAppAura variant={variant} /> : <AuraCssLayers />}
    </div>
  );
}
