"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { useRouter } from "next/navigation";
import {
  cancelScheduledPrefetchReaderChapterQuery,
  CHAPTER_HOVER_PREFETCH_DWELL_MS,
  prefetchReaderChapterQuery,
  prefetchStorySummaryQuery,
} from "@/lib/reader-query";
import { warmReaderClientChunk } from "@/lib/warm-reader-client";

export type WarmReaderNavTarget = {
  href: string;
  storyId: string;
  /** When set, also warm full chapter JSON for instant reader open. */
  chapterNumber?: number;
  /** Warm ReaderClient dynamic import (chapter destinations). Default: true when chapterNumber set. */
  warmChunk?: boolean;
  /** Prefetch story detail summary JSON. Default true. */
  warmStorySummary?: boolean;
};

type AppRouter = ReturnType<typeof useRouter>;
// typedRoutes makes AppRouter.prefetch generic; a `(href: string) => void` slot rejects it.
type RouterLike = Pick<AppRouter, "prefetch">;

function prefetchHref(router: RouterLike, href: string) {
  router.prefetch(href as Parameters<AppRouter["prefetch"]>[0]);
}

const scheduledNavs = new Map<string, number>();

function navKey(target: WarmReaderNavTarget) {
  return `${target.href}|${target.storyId}|${target.chapterNumber ?? ""}`;
}

function runWarm(router: RouterLike, queryClient: QueryClient, target: WarmReaderNavTarget) {
  prefetchHref(router, target.href);
  if (target.warmStorySummary !== false) {
    void prefetchStorySummaryQuery(queryClient, target.storyId);
  }
  const shouldWarmChunk = target.warmChunk ?? target.chapterNumber != null;
  if (shouldWarmChunk) {
    warmReaderClientChunk();
  }
  if (target.chapterNumber != null) {
    void prefetchReaderChapterQuery(queryClient, target.storyId, target.chapterNumber);
  }
}

/** Immediate warm — use on pointerdown / intentional CTA so click transit feels instant. */
export function flushWarmReaderNav(router: RouterLike, queryClient: QueryClient, target: WarmReaderNavTarget) {
  cancelWarmReaderNav(target);
  runWarm(router, queryClient, target);
}

/**
 * Dwell warm — use on mouseenter/focus for dense lists so scroll-through does not storm APIs.
 * Pair with cancelWarmReaderNav on mouseleave/blur and flushWarmReaderNav on pointerdown.
 */
export function scheduleWarmReaderNav(
  router: RouterLike,
  queryClient: QueryClient,
  target: WarmReaderNavTarget,
  dwellMs: number = CHAPTER_HOVER_PREFETCH_DWELL_MS
) {
  if (typeof window === "undefined") return;
  const key = navKey(target);
  const existing = scheduledNavs.get(key);
  if (existing != null) window.clearTimeout(existing);
  const timer = window.setTimeout(() => {
    scheduledNavs.delete(key);
    runWarm(router, queryClient, target);
  }, Math.max(0, dwellMs));
  scheduledNavs.set(key, timer);
}

export function cancelWarmReaderNav(target: WarmReaderNavTarget) {
  if (typeof window === "undefined") return;
  const key = navKey(target);
  const timer = scheduledNavs.get(key);
  if (timer != null) {
    window.clearTimeout(timer);
    scheduledNavs.delete(key);
  }
  if (target.chapterNumber != null) {
    cancelScheduledPrefetchReaderChapterQuery(target.storyId, target.chapterNumber);
  }
}

/** Spread onto Link for dense story/continue cards. */
export function warmReaderNavLinkProps(router: RouterLike, queryClient: QueryClient, target: WarmReaderNavTarget) {
  return {
    prefetch: false as const,
    onMouseEnter: () => scheduleWarmReaderNav(router, queryClient, target),
    onMouseLeave: () => cancelWarmReaderNav(target),
    onFocus: () => scheduleWarmReaderNav(router, queryClient, target),
    onBlur: () => cancelWarmReaderNav(target),
    onPointerDown: () => flushWarmReaderNav(router, queryClient, target),
  };
}
