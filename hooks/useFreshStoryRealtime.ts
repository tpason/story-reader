"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchReadingProgress } from "@/lib/api-client";
import { isRealtimeShimmerEnabled } from "@/lib/reader-realtime-fx";
import { useReaderRealtimeFx } from "@/lib/useReaderRealtimeFx";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { mergeHistoryItems } from "@/lib/store";
import { useAppDispatch } from "@/lib/store-hooks";

const FRESH_STORY_MS = 9000;

type UseFreshStoryRealtimeOptions = {
  refreshProgress?: boolean;
  refreshRoute?: boolean;
  /** Only react to events for this story (e.g. story detail page). */
  scopeStoryId?: string;
  invalidateQueryKeys?: readonly (readonly string[])[];
  onEvent?: (event: ReaderRealtimeEvent) => void;
};

export function useFreshStoryRealtime(options: UseFreshStoryRealtimeOptions = {}) {
  const {
    refreshProgress = false,
    refreshRoute = false,
    scopeStoryId,
    invalidateQueryKeys = [],
    onEvent
  } = options;
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode: fxMode } = useReaderRealtimeFx();
  const refreshTimerRef = useRef<number | null>(null);
  const [freshStoryIds, setFreshStoryIds] = useState<Set<string>>(() => new Set());

  const scheduleRouteRefresh = useCallback(() => {
    if (!refreshRoute) return;
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      router.refresh();
      refreshTimerRef.current = null;
    }, 1500);
  }, [refreshRoute, router]);

  const markStoryFresh = useCallback((storyId: string) => {
    if (!isRealtimeShimmerEnabled(fxMode)) return;
    setFreshStoryIds((current) => new Set(current).add(storyId));
    window.setTimeout(() => {
      setFreshStoryIds((current) => {
        if (!current.has(storyId)) return current;
        const next = new Set(current);
        next.delete(storyId);
        return next;
      });
    }, FRESH_STORY_MS);
  }, [fxMode]);

  useReaderRealtimeListener(
    useCallback(
      (event: ReaderRealtimeEvent) => {
        if (!event.storyId) return;
        if (scopeStoryId && event.storyId !== scopeStoryId) return;
        if (event.type !== "chapter_update" && event.type !== "story_update" && event.type !== "notification_update") {
          return;
        }
        markStoryFresh(event.storyId);
        onEvent?.(event);
        scheduleRouteRefresh();
        for (const queryKey of invalidateQueryKeys) {
          queryClient.invalidateQueries({ queryKey: [...queryKey] });
        }
        if (refreshProgress && event.type !== "notification_update") {
          fetchReadingProgress()
            .then((items) => dispatch(mergeHistoryItems(items)))
            .catch(() => undefined);
        }
      },
      [dispatch, invalidateQueryKeys, markStoryFresh, onEvent, queryClient, refreshProgress, scheduleRouteRefresh, scopeStoryId]
    )
  );

  const isFresh = useCallback(
    (storyId: string) => isRealtimeShimmerEnabled(fxMode) && freshStoryIds.has(storyId),
    [freshStoryIds, fxMode]
  );

  return { freshStoryIds, isFresh, markStoryFresh };
}
