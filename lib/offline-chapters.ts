"use client";

import Dexie, { type Table } from "dexie";
import { fetchReaderChapter } from "@/lib/reader-query";
import type { ReaderPayload } from "@/lib/types";

export type OfflineChapterRecord = {
  key: string;
  storyId: string;
  storyTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  cachedAt: string;
  payload: ReaderPayload;
};

class ReaderOfflineDb extends Dexie {
  chapters!: Table<OfflineChapterRecord, string>;

  constructor() {
    super("linh-quyen-offline");
    this.version(1).stores({
      chapters: "key, storyId, chapterNumber, cachedAt"
    });
  }
}

export const offlineDb = new ReaderOfflineDb();

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function chapterKey(storyId: string, chapterNumber: number) {
  return `${storyId}:${chapterNumber}`;
}

export async function cacheReaderPayload(payload: ReaderPayload) {
  if (!canUseIndexedDb()) return;

  const record: OfflineChapterRecord = {
    key: chapterKey(payload.story.id, payload.chapter.chapterNumber),
    storyId: payload.story.id,
    storyTitle: payload.story.title,
    chapterNumber: payload.chapter.chapterNumber,
    chapterTitle: payload.chapter.title,
    cachedAt: new Date().toISOString(),
    payload
  };

  await offlineDb.chapters.put(record).catch(() => undefined);
}

export async function getCachedChapter(storyId: string, chapterNumber: number) {
  if (!canUseIndexedDb()) return null;
  return offlineDb.chapters.get(chapterKey(storyId, chapterNumber)).then((record) => record ?? null).catch(() => null);
}

export async function listCachedStoryChapters(storyId: string) {
  if (!canUseIndexedDb()) return [];
  return offlineDb.chapters
    .where("storyId")
    .equals(storyId)
    .sortBy("chapterNumber")
    .catch(() => []);
}

export async function clearStoryOfflineCache(storyId: string) {
  if (!canUseIndexedDb()) return 0;
  return offlineDb.chapters.where("storyId").equals(storyId).delete().catch(() => 0);
}

export async function deleteOfflineChapter(storyId: string, chapterNumber: number) {
  if (!canUseIndexedDb()) return;
  await offlineDb.chapters.delete(chapterKey(storyId, chapterNumber)).catch(() => undefined);
}

export async function preloadNextChapters(payload: ReaderPayload, count = 3) {
  await cacheReaderPayload(payload);

  const tasks = Array.from({ length: count }, (_, index) => payload.chapter.chapterNumber + index + 1)
    .filter((chapterNumber) => chapterNumber <= payload.story.totalChapters)
    .map(async (chapterNumber) => {
      const existing = await getCachedChapter(payload.story.id, chapterNumber);
      if (existing) return existing;

      const nextPayload = await fetchReaderChapter(payload.story.id, chapterNumber).catch(() => null);
      if (!nextPayload) return null;
      await cacheReaderPayload(nextPayload);
      return getCachedChapter(payload.story.id, chapterNumber);
    });

  const records = await Promise.all(tasks);
  return records.filter((record): record is OfflineChapterRecord => Boolean(record));
}
