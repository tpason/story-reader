"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { offlineDb, type OfflineChapterRecord } from "@/lib/offline-chapters";

type ReaderOfflineQueryBridgeProps = {
  storyId: string;
  onChapters: (chapters: OfflineChapterRecord[]) => void;
};

/** Isolated dexie live query — separate chunk from ReaderClient. */
export function ReaderOfflineQueryBridge({ storyId, onChapters }: ReaderOfflineQueryBridgeProps) {
  const liveCachedChapters = useLiveQuery(
    () => offlineDb.chapters.where("storyId").equals(storyId).sortBy("chapterNumber"),
    [storyId],
    [] as OfflineChapterRecord[],
  );

  useEffect(() => {
    onChapters(liveCachedChapters ?? []);
  }, [liveCachedChapters, onChapters]);

  return null;
}
