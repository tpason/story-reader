"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import type { AppAuraVariant } from "@/components/ThreeAppAura";

const ThreeAppAura = dynamic(() => import("@/components/ThreeAppAura").then((mod) => mod.ThreeAppAura), { ssr: false });

const READER_CHAPTER_RE = /^\/stories\/[^/]+\/chapters\/\d+/;
const DESKTOP_MIN_WIDTH = 840;

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
  // null until layoutEffect — avoid SSR/desktop mist paint that tears down when WebGL gate flips.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const webglEnabled = useDecorativeWebglEnabled({
    tier: isReaderChapter ? "reader" : "global",
    allowCompact: false,
    compactMaxWidth: 839,
  });
  const reduceMotion = prefersReducedMotion();
  // Mobile-only aura path — desktop always skips (world CSS/WebGL owns sky).
  const allowAura = !isReaderChapter && isDesktop === false;
  const canUseWebgl = allowAura && webglEnabled && !reduceMotion;
  const webglReady = useDeferredWebglMount(canUseWebgl, 2400);
  const showWebgl = canUseWebgl && webglReady;

  useLayoutEffect(() => {
    const query = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Chapter / desktop / unresolved viewport: no AppAura (CSS±WebGL world owns atmosphere).
  if (!allowAura) return null;

  return (
    <div
      className={`app-aura-layer app-aura-layer--${variant}${showWebgl ? " app-aura-layer--webgl" : ""}`}
      aria-hidden
    >
      {showWebgl ? <ThreeAppAura variant={variant} /> : <AuraCssLayers />}
    </div>
  );
}
