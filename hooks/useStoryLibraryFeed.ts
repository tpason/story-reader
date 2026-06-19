"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function useStoryLibraryFeed(initialPage: CursorPage<StorySummary>, query: StoryLibraryQuery) {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState(() => mergeUniqueStories([], initialPage.items));
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(mergeUniqueStories([], initialPage.items));
    setNextCursor(initialPage.nextCursor);
    setError(null);
    loadingRef.current = false;
    setLoading(false);
  }, [initialPage, query.q, query.author, query.hot, query.completed, query.category, query.minChapters, query.maxChapters, query.hasPolished, query.hasAudio, query.sort]);

  useEffect(() => {
    if (items.length > 0) dispatch(syncFollowedStories(items));
  }, [dispatch, items]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    fetch(apiUrl(nextCursor, query))
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được danh sách truyện");
        return response.json() as Promise<CursorPage<StorySummary>>;
      })
      .then((page) => {
        setItems((current) => mergeUniqueStories(current, page.items));
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, [nextCursor, query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "180px 0px" }
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
