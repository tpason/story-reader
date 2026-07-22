"use client";

import Dexie, { type Table } from "dexie";
import { fetchReaderChapter } from "@/lib/reader-query";
import {
  estimateOfflineCacheBytes,
  formatOfflineCacheSize,
  OFFLINE_DOWNLOAD_MAX,
  OFFLINE_DOWNLOAD_PRESETS,
  summarizeOfflineCacheByStory
} from "@/lib/offline-chapters-utils";
import type { ReaderPayload } from "@/lib/types";

export { estimateOfflineCacheBytes, formatOfflineCacheSize, OFFLINE_DOWNLOAD_MAX, OFFLINE_DOWNLOAD_PRESETS };

export type OfflineChapterRecord = {
  key: string;
  storyId: string;
  storyTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  cachedAt: string;
  payload: ReaderPayload;
};

export type OfflineCacheStorySummary = {
  storyId: string;
  storyTitle: string;
  chapterCount: number;
  estimatedBytes: number;
  minChapter: number;
  maxChapter: number;
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

/** Must stay aligned with `CACHE_VERSION` + `-api` in `public/sw.js`. */
const SW_API_CACHE_PREFIX = "linh-quyen-";
const SW_API_CACHE_FALLBACK = "linh-quyen-v4-api";

/** One-way Dexie → Cache API mirror so SW SWR can serve warmed chapter JSON. */
async function mirrorChapterPayloadToCacheApi(payload: ReaderPayload) {
  if (typeof caches === "undefined") return;
  try {
    const cacheNames = await caches.keys();
    const apiCacheName =
      cacheNames.find((name) => name.startsWith(SW_API_CACHE_PREFIX) && name.endsWith("-api")) ??
      SW_API_CACHE_FALLBACK;
    const cache = await caches.open(apiCacheName);
    const url = `/api/stories/${payload.story.id}/chapters/${payload.chapter.chapterNumber}`;
    await cache.put(
      url,
      new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=120, stale-while-revalidate=600"
        }
      })
    );
  } catch {
    // Best-effort only — Dexie remains source of truth for offline reading.
  }
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
  void mirrorChapterPayloadToCacheApi(payload);
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

export async function listOfflineCacheByStory(): Promise<OfflineCacheStorySummary[]> {
  if (!canUseIndexedDb()) return [];
  const records = await offlineDb.chapters.toArray().catch(() => []);
  return summarizeOfflineCacheByStory(records);
}

export async function clearAllOfflineCache() {
  if (!canUseIndexedDb()) return 0;
  return offlineDb.chapters.clear().catch(() => 0);
}

export async function deleteOfflineChapter(storyId: string, chapterNumber: number) {
  if (!canUseIndexedDb()) return;
  await offlineDb.chapters.delete(chapterKey(storyId, chapterNumber)).catch(() => undefined);
}

export async function preloadNextChapters(payload: ReaderPayload, count = 3) {
  return downloadChaptersFrom(payload, payload.chapter.chapterNumber, count + 1, { includeCurrent: true });
}

export async function downloadChaptersFrom(
  payload: ReaderPayload,
  fromChapterNumber: number,
  count: number,
  options: { includeCurrent?: boolean; onProgress?: (done: number, total: number) => void } = {}
) {
  const capped = Math.min(Math.max(1, count), OFFLINE_DOWNLOAD_MAX);
  const includeCurrent = options.includeCurrent ?? false;
  const chapterNumbers = Array.from({ length: capped }, (_, index) => fromChapterNumber + (includeCurrent ? index : index + 1))
    .filter((chapterNumber) => chapterNumber >= 1 && chapterNumber <= payload.story.totalChapters);

  if (!canUseIndexedDb()) return [];

  const records: OfflineChapterRecord[] = [];
  let done = 0;
  const total = chapterNumbers.length;

  for (const chapterNumber of chapterNumbers) {
    const existing = await getCachedChapter(payload.story.id, chapterNumber);
    if (existing) {
      records.push(existing);
      done += 1;
      options.onProgress?.(done, total);
      continue;
    }

    const nextPayload =
      chapterNumber === payload.chapter.chapterNumber
        ? payload
        : await fetchReaderChapter(payload.story.id, chapterNumber).catch(() => null);
    if (!nextPayload) {
      done += 1;
      options.onProgress?.(done, total);
      continue;
    }

    await cacheReaderPayload(nextPayload);
    const cached = await getCachedChapter(payload.story.id, chapterNumber);
    if (cached) records.push(cached);
    done += 1;
    options.onProgress?.(done, total);
  }

  return records;
}
