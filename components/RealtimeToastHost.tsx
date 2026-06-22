"use client";

import { FloatingPortal } from "@floating-ui/react";
import { useCallback, useState } from "react";
import { RealtimeChapterToast, type RealtimeToastPayload } from "@/components/RealtimeChapterToast";
import type { FollowedStoryItem } from "@/lib/follows";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import type { ReadingHistoryItem } from "@/lib/reading-history";
import { useAppSelector } from "@/lib/store-hooks";

function resolveStoryTitle(
  event: ReaderRealtimeEvent,
  follows: FollowedStoryItem[],
  history: ReadingHistoryItem[]
) {
  if (!event.storyId) return undefined;
  return (
    follows.find((item) => item.storyId === event.storyId)?.storyTitle ??
    history.find((item) => item.storyId === event.storyId)?.storyTitle
  );
}

export function RealtimeToastHost() {
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const [toast, setToast] = useState<RealtimeToastPayload | null>(null);

  useReaderRealtimeListener(
    useCallback(
      (event: ReaderRealtimeEvent) => {
        if (event.type !== "chapter_update" && event.type !== "story_update" && event.type !== "notification_update") {
          return;
        }
        setToast({
          id: Date.now(),
          event,
          storyTitle: resolveStoryTitle(event, follows, history)
        });
      },
      [follows, history]
    )
  );

  return (
    <FloatingPortal>
      <RealtimeChapterToast toast={toast} onDismiss={() => setToast(null)} />
    </FloatingPortal>
  );
}
