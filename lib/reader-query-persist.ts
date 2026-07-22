"use client";

import type { Query, QueryClient } from "@tanstack/react-query";
import { readerQueryKeys } from "@/lib/reader-query";
import type { ReaderPayload } from "@/lib/types";

const DB_NAME = "linh-quyen-rq";
const STORE_NAME = "chapter-queries";
const DB_VERSION = 1;
const MAX_ENTRIES = 40;

type PersistRecord = {
  key: string;
  storyId: string;
  chapterNumber: number;
  payload: ReaderPayload;
  updatedAt: number;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function isReaderChapterQuery(query: Query) {
  const key = query.queryKey;
  return Array.isArray(key) && key[0] === "reader" && key[1] === "chapter" && typeof key[2] === "string" && typeof key[3] === "number";
}

function persistKey(storyId: string, chapterNumber: number) {
  return `${storyId}:${chapterNumber}`;
}

async function trimStore(db: IDBDatabase) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const all = (await idbRequest(store.getAll())) as PersistRecord[];
  if (all.length <= MAX_ENTRIES) return;
  all.sort((a, b) => a.updatedAt - b.updatedAt);
  const overflow = all.length - MAX_ENTRIES;
  for (let i = 0; i < overflow; i += 1) {
    store.delete(all[i].key);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("trim failed"));
  });
}

async function writeChapterPayload(payload: ReaderPayload) {
  if (!canUseIndexedDb()) return;
  try {
    const db = await openDb();
    const record: PersistRecord = {
      key: persistKey(payload.story.id, payload.chapter.chapterNumber),
      storyId: payload.story.id,
      chapterNumber: payload.chapter.chapterNumber,
      payload,
      updatedAt: Date.now()
    };
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("put failed"));
    });
    await trimStore(db);
    db.close();
  } catch {
    // Best-effort persist only.
  }
}

async function hydrateChapterQueries(queryClient: QueryClient) {
  if (!canUseIndexedDb()) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const records = (await idbRequest(tx.objectStore(STORE_NAME).getAll())) as PersistRecord[];
    db.close();
    for (const record of records) {
      if (!record?.payload?.chapter?.content) continue;
      queryClient.setQueryData(
        readerQueryKeys.chapter(record.storyId, record.chapterNumber),
        record.payload
      );
    }
  } catch {
    // Ignore corrupt/unavailable store.
  }
}

/** Persist only default `["reader","chapter",…]` payloads to IndexedDB (max 40). */
export function setupReaderChapterQueryPersist(queryClient: QueryClient) {
  if (!canUseIndexedDb()) return () => undefined;

  let cancelled = false;
  void hydrateChapterQueries(queryClient);

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (cancelled) return;
    if (event.type !== "updated" && event.type !== "added") return;
    const query = event.query;
    if (!isReaderChapterQuery(query)) return;
    const data = query.state.data as ReaderPayload | undefined;
    if (!data?.chapter?.content) return;
    // Only persist default polished/single keys (key slots 4–6).
    const key = query.queryKey;
    const primary = key[4];
    const secondary = key[5];
    const mode = key[6];
    if (primary !== "polished" || secondary !== "" || mode !== "single") return;
    void writeChapterPayload(data);
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
