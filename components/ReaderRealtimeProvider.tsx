"use client";

import { createContext, useContext, useMemo } from "react";
import { useReaderRealtime } from "@/lib/useReaderRealtime";
import { useAppSelector } from "@/lib/store-hooks";

const ReaderRealtimeLiveContext = createContext(false);

export function useReaderRealtimeLive() {
  return useContext(ReaderRealtimeLiveContext);
}

export function ReaderRealtimeProvider({ children }: { children: React.ReactNode }) {
  const userId = useAppSelector((state) => state.identity.user?.id ?? null);
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);

  const storyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of follows) ids.add(item.storyId);
    for (const item of history) ids.add(item.storyId);
    return [...ids];
  }, [follows, history]);

  const live = useReaderRealtime({
    userId,
    storyIds,
    onEvent: () => undefined
  });

  return <ReaderRealtimeLiveContext.Provider value={live}>{children}</ReaderRealtimeLiveContext.Provider>;
}
