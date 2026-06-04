"use client";

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/store";

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export const selectCurrentBookmark = (storyId: string, chapterNumber: number) =>
  createSelector(
    (state: RootState) => state.bookmarks.items,
    (items) => items.find((item) => item.storyId === storyId && item.chapterNumber === chapterNumber) ?? null
  );

export const selectStoryBookmarks = (storyId: string) =>
  createSelector(
    (state: RootState) => state.bookmarks.items,
    (items) =>
      items
        .filter((item) => item.storyId === storyId)
        .sort((l, r) => l.chapterNumber - r.chapterNumber)
  );

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const selectMaxReadChapter = (storyId: string) =>
  createSelector(
    (state: RootState) => state.history.items,
    (items) => {
      const item = items.find((entry) => entry.storyId === storyId);
      return item?.maxReadChapterNumber ?? item?.chapterNumber ?? 0;
    }
  );

export const selectHistoryItem = (storyId: string) =>
  createSelector(
    (state: RootState) => state.history.items,
    (items) => items.find((entry) => entry.storyId === storyId) ?? null
  );
