"use client";

export type ParagraphBookmark = {
  id: string;
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphIndex: number;
  excerpt: string;
  progressPercent: number;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
};

const PARAGRAPH_BOOKMARKS_KEY = "reader:paragraph-bookmarks";
const MAX_PARAGRAPH_BOOKMARKS = 240;

function bookmarkKey(bookmark: Pick<ParagraphBookmark, "storyId" | "chapterNumber" | "paragraphIndex">) {
  return `${bookmark.storyId}:${bookmark.chapterNumber}:${bookmark.paragraphIndex}`;
}

export function readParagraphBookmarks(): ParagraphBookmark[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PARAGRAPH_BOOKMARKS_KEY) ?? "[]") as ParagraphBookmark[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((bookmark) => bookmark?.storyId && bookmark?.chapterId && Number.isInteger(bookmark.paragraphIndex))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, MAX_PARAGRAPH_BOOKMARKS);
  } catch {
    return [];
  }
}

export function writeParagraphBookmarks(bookmarks: ParagraphBookmark[]) {
  window.localStorage.setItem(PARAGRAPH_BOOKMARKS_KEY, JSON.stringify(bookmarks.slice(0, MAX_PARAGRAPH_BOOKMARKS)));
}

export function upsertParagraphBookmark(bookmarks: ParagraphBookmark[], bookmark: ParagraphBookmark) {
  const key = bookmarkKey(bookmark);
  return [bookmark, ...bookmarks.filter((item) => bookmarkKey(item) !== key)].slice(0, MAX_PARAGRAPH_BOOKMARKS);
}

export function removeParagraphBookmark(bookmarks: ParagraphBookmark[], bookmark: Pick<ParagraphBookmark, "storyId" | "chapterNumber" | "paragraphIndex">) {
  const key = bookmarkKey(bookmark);
  return bookmarks.filter((item) => bookmarkKey(item) !== key);
}
