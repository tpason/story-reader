"use client";

export type ReadingHistoryItem = {
  storyId: string;
  storyTitle: string;
  coverImageUrl: string | null;
  chapterId: string | null;
  chapterNumber: number;
  chapterTitle: string | null;
  scrollPosition: number;
  paragraphIndex?: number;
  progressPercent: number;
  maxReadChapterNumber: number;
  totalChapters: number;
  lastReadAt: string;
  nextChapterWordCounts?: number[];
};

const HISTORY_KEY = "reader:history";
const MAX_HISTORY = 80;

export function readLocalHistory(): ReadingHistoryItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as ReadingHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.storyId && item?.storyTitle)
      .sort((a, b) => Date.parse(b.lastReadAt) - Date.parse(a.lastReadAt));
  } catch {
    return [];
  }
}

export function upsertLocalHistory(item: ReadingHistoryItem) {
  const current = readLocalHistory();
  const existing = current.find((entry) => entry.storyId === item.storyId);
  const nextItem: ReadingHistoryItem = {
    ...item,
    maxReadChapterNumber: Math.max(item.maxReadChapterNumber, existing?.maxReadChapterNumber ?? 0)
  };
  const next = [nextItem, ...current.filter((entry) => entry.storyId !== item.storyId)].slice(0, MAX_HISTORY);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.localStorage.setItem(`reader:story:${item.storyId}`, JSON.stringify(nextItem));
  window.dispatchEvent(new CustomEvent("reader-history-updated", { detail: nextItem }));
}

export function writeLocalHistory(items: ReadingHistoryItem[]) {
  const next = items.slice(0, MAX_HISTORY);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  next.forEach((item) => {
    window.localStorage.setItem(`reader:story:${item.storyId}`, JSON.stringify(item));
  });
}

export function mergeHistory(localItems: ReadingHistoryItem[], remoteItems: ReadingHistoryItem[]) {
  const byStory = new Map<string, ReadingHistoryItem>();

  [...localItems, ...remoteItems].forEach((item) => {
    const existing = byStory.get(item.storyId);
    if (!existing || Date.parse(item.lastReadAt) >= Date.parse(existing.lastReadAt)) {
      byStory.set(item.storyId, {
        ...item,
        maxReadChapterNumber: Math.max(item.maxReadChapterNumber, existing?.maxReadChapterNumber ?? 0)
      });
    }
  });

  return [...byStory.values()].sort((a, b) => Date.parse(b.lastReadAt) - Date.parse(a.lastReadAt));
}
