"use client";

import { useCallback, useState } from "react";
import { fetchReadingProgress } from "@/lib/api-client";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { mergeHistoryItems } from "@/lib/store";
import { useAppDispatch } from "@/lib/store-hooks";

const FRESH_STORY_MS = 9000;

type UseFreshStoryRealtimeOptions = {
  refreshProgress?: boolean;
};

export function useFreshStoryRealtime(options: UseFreshStoryRealtimeOptions = {}) {
  const { refreshProgress = false } = options;
  const dispatch = useAppDispatch();
  const [freshStoryIds, setFreshStoryIds] = useState<Set<string>>(() => new Set());

  const markStoryFresh = useCallback((storyId: string) => {
    setFreshStoryIds((current) => new Set(current).add(storyId));
    window.setTimeout(() => {
      setFreshStoryIds((current) => {
        if (!current.has(storyId)) return current;
        const next = new Set(current);
        next.delete(storyId);
        return next;
      });
    }, FRESH_STORY_MS);
  }, []);

  useReaderRealtimeListener(
    useCallback(
      (event: ReaderRealtimeEvent) => {
        if (!event.storyId) return;
        if (event.type !== "chapter_update" && event.type !== "story_update" && event.type !== "notification_update") {
          return;
        }
        markStoryFresh(event.storyId);
        if (refreshProgress && event.type !== "notification_update") {
          fetchReadingProgress()
            .then((items) => dispatch(mergeHistoryItems(items)))
            .catch(() => undefined);
        }
      },
      [dispatch, markStoryFresh, refreshProgress]
    )
  );

  const isFresh = useCallback((storyId: string) => freshStoryIds.has(storyId), [freshStoryIds]);

  return { freshStoryIds, isFresh, markStoryFresh };
}
