"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OfflineChapterRecord } from "@/lib/offline-chapters";

const ReaderOfflineQueryBridge = dynamic(
  () => import("@/components/reader/ReaderOfflineQueryBridge").then((mod) => mod.ReaderOfflineQueryBridge),
  { ssr: false },
);

type ReaderOfflineCacheContextValue = {
  cachedChapters: OfflineChapterRecord[];
  ready: boolean;
};

const ReaderOfflineCacheContext = createContext<ReaderOfflineCacheContextValue>({
  cachedChapters: [],
  ready: false,
});

export function useReaderOfflineCache() {
  return useContext(ReaderOfflineCacheContext);
}

type ReaderOfflineCacheProviderProps = {
  storyId: string;
  children: ReactNode;
};

export function ReaderOfflineCacheProvider({ storyId, children }: ReaderOfflineCacheProviderProps) {
  const [active, setActive] = useState(false);
  const [cachedChapters, setCachedChapters] = useState<OfflineChapterRecord[]>([]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setActive(true);
      return;
    }

    const run = () => setActive(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 900);
    return () => window.clearTimeout(id);
  }, []);

  const onChapters = useCallback((chapters: OfflineChapterRecord[]) => {
    setCachedChapters(chapters);
  }, []);

  const value = useMemo(
    () => ({ cachedChapters, ready: active }),
    [active, cachedChapters],
  );

  return (
    <ReaderOfflineCacheContext.Provider value={value}>
      {active ? <ReaderOfflineQueryBridge storyId={storyId} onChapters={onChapters} /> : null}
      {children}
    </ReaderOfflineCacheContext.Provider>
  );
}
