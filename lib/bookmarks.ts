"use client";

export type ReaderBookmarkItem = {
  id: string;
  storyId: string;
  storyTitle: string;
  coverImageUrl: string | null;
  chapterId: string | null;
  chapterNumber: number;
  chapterTitle: string | null;
  scrollPosition: number;
  progressPercent: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

const BOOKMARKS_KEY = "reader:bookmarks";
const MAX_BOOKMARKS = 200;

function bookmarkKey(item: Pick<ReaderBookmarkItem, "storyId" | "chapterNumber">) {
  return `${item.storyId}:${item.chapterNumber}`;
}

export function readLocalBookmarks(): ReaderBookmarkItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BOOKMARKS_KEY) ?? "[]") as ReaderBookmarkItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.storyId && item?.storyTitle && Number.isInteger(item.chapterNumber))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } catch {
    return [];
  }
}

export function writeLocalBookmarks(items: ReaderBookmarkItem[]) {
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items.slice(0, MAX_BOOKMARKS)));
}

export function mergeBookmarks(localItems: ReaderBookmarkItem[], remoteItems: ReaderBookmarkItem[]) {
  const byKey = new Map<string, ReaderBookmarkItem>();
  [...localItems, ...remoteItems].forEach((item) => {
    const key = bookmarkKey(item);
    const existing = byKey.get(key);
    if (!existing || Date.parse(item.updatedAt) >= Date.parse(existing.updatedAt)) {
      byKey.set(key, item);
    }
  });
  return [...byKey.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_BOOKMARKS);
}

export function upsertBookmark(items: ReaderBookmarkItem[], item: ReaderBookmarkItem) {
  return mergeBookmarks(items.filter((entry) => bookmarkKey(entry) !== bookmarkKey(item)), [item]);
}

export function removeBookmark(items: ReaderBookmarkItem[], storyId: string, chapterNumber: number) {
  return items.filter((item) => item.storyId !== storyId || item.chapterNumber !== chapterNumber);
}
