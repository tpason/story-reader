"use client";

import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type { CursorPage, StorySummary } from "@/lib/types";
import { syncFollowedStories } from "@/lib/store";
import { useAppDispatch } from "@/lib/store-hooks";

type StoryLibraryQuery = {
  q?: string;
  author?: string;
  hot?: string;
  completed?: string;
  category?: string;
  minChapters?: string;
  maxChapters?: string;
  hasPolished?: string;
  hasAudio?: string;
  sort?: string;
};

export function libraryStoriesQueryKey(query: StoryLibraryQuery) {
  return [
    "stories",
    "library",
    query.q ?? "",
    query.author ?? "",
    query.hot ?? "",
    query.completed ?? "",
    query.category ?? "",
    query.minChapters ?? "",
    query.maxChapters ?? "",
    query.hasPolished ?? "",
    query.hasAudio ?? "",
    query.sort ?? ""
  ] as const;
}

function apiUrl(cursor: string | null, query: StoryLibraryQuery) {
  const params = new URLSearchParams();
  params.set("limit", "24");
  if (cursor) params.set("cursor", cursor);
  if (query.q) params.set("q", query.q);
  if (query.author) params.set("author", query.author);
  if (query.hot) params.set("hot", query.hot);
  if (query.completed) params.set("completed", query.completed);
  if (query.category) params.set("category", query.category);
  if (query.minChapters) params.set("minChapters", query.minChapters);
  if (query.maxChapters) params.set("maxChapters", query.maxChapters);
  if (query.hasPolished) params.set("hasPolished", query.hasPolished);
  if (query.hasAudio) params.set("hasAudio", query.hasAudio);
  if (query.sort) params.set("sort", query.sort);
  return `/api/stories?${params.toString()}`;
}

function mergeUniqueStories(current: StorySummary[], incoming: StorySummary[]): StorySummary[] {
  const seen = new Set(current.map((story) => story.id));
  const merged = [...current];
  for (const story of incoming) {
    if (seen.has(story.id)) continue;
    seen.add(story.id);
    merged.push(story);
  }
  return merged;
}

function flattenLibraryPages(data: InfiniteData<CursorPage<StorySummary>> | undefined) {
  if (!data) return [] as StorySummary[];
  return data.pages.reduce<StorySummary[]>((acc, page) => mergeUniqueStories(acc, page.items), []);
}

export function useStoryLibraryFeed(initialPage: CursorPage<StorySummary>, query: StoryLibraryQuery) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryKey = libraryStoriesQueryKey(query);

  const infinite = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const response = await fetch(apiUrl(pageParam, query));
      if (!response.ok) throw new Error("Không tải được danh sách truyện");
      return (await response.json()) as CursorPage<StorySummary>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: {
      pages: [initialPage],
      pageParams: [null]
    },
    staleTime: 1000 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const items = useMemo(() => flattenLibraryPages(infinite.data), [infinite.data]);
  const nextCursor = infinite.data?.pages.at(-1)?.nextCursor ?? null;
  const loading = infinite.isFetchingNextPage;
  const error = infinite.error instanceof Error ? infinite.error.message : null;

  const setItems: Dispatch<SetStateAction<StorySummary[]>> = useCallback(
    (updater) => {
      queryClient.setQueryData<InfiniteData<CursorPage<StorySummary>>>(queryKey, (current) => {
        const flat = flattenLibraryPages(current);
        const nextFlat = typeof updater === "function" ? updater(flat) : updater;
        const cursor = current?.pages.at(-1)?.nextCursor ?? null;
        const pageSize = current?.pages[0]?.pageSize ?? 24;
        return {
          pages: [{ items: nextFlat, nextCursor: cursor, pageSize }],
          pageParams: [null]
        };
      });
    },
    [queryClient, queryKey]
  );

  // Keep SSR first page in sync when the server props change for the same filters.
  useEffect(() => {
    queryClient.setQueryData<InfiniteData<CursorPage<StorySummary>>>(queryKey, (current) => {
      if (!current || current.pages.length === 0) {
        return { pages: [initialPage], pageParams: [null] };
      }
      if (current.pages.length === 1 && current.pageParams[0] == null) {
        return { pages: [initialPage], pageParams: [null] };
      }
      return current;
    });
  }, [initialPage, queryClient, queryKey]);

  // Idle-defer follow metadata sync — avoid competing with load-more paint on every page append.
  useEffect(() => {
    if (items.length === 0) return;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const run = () => {
      idleId = null;
      timeoutId = null;
      dispatch(syncFollowedStories(items));
    };
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(run, 220);
    }
    return () => {
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [dispatch, items]);

  const loadMore = useCallback(() => {
    if (!nextCursor || infinite.isFetchingNextPage) return;
    void infinite.fetchNextPage();
  }, [infinite, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const root = sentinel.closest(".story-library-scroll");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      {
        root: root instanceof Element ? root : null,
        rootMargin: "48px 0px",
        threshold: 0.01
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  return {
    items,
    setItems,
    nextCursor,
    loading,
    error,
    sentinelRef
  };
}
