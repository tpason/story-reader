import type { QueryClient } from "@tanstack/react-query";
import type { ReaderFetchOptions, ReaderPayload } from "@/lib/types";

export type ReaderChapterQueryOptions = ReaderFetchOptions;

export const READER_CHAPTER_STALE_MS = 1000 * 60 * 8;

/** Global in-flight chapter prefetch keys — max 2 to avoid scroll/radio thrash. */
const MAX_CHAPTER_PREFETCH_IN_FLIGHT = 2;
const chapterPrefetchInFlight = new Set<string>();

function chapterPrefetchKey(storyId: string, chapterNumber: number, options?: ReaderChapterQueryOptions) {
  return `${storyId}:${chapterNumber}:${options?.primaryLayer ?? "polished"}:${options?.secondaryLayer ?? ""}:${options?.displayMode ?? "single"}`;
}

function shouldSkipPrefetchNetwork(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!navigator.onLine) return true;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } })
    .connection;
  return Boolean(connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g");
}

function chapterQueryString(options?: ReaderChapterQueryOptions) {
  if (!options) return "";
  const params = new URLSearchParams();
  if (options.primaryLayer) params.set("primary", options.primaryLayer);
  if (options.secondaryLayer) params.set("secondary", options.secondaryLayer);
  if (options.displayMode) params.set("mode", options.displayMode);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const readerQueryKeys = {
  chapter: (storyId: string, chapterNumber: number, options?: ReaderChapterQueryOptions) =>
    ["reader", "chapter", storyId, chapterNumber, options?.primaryLayer ?? "polished", options?.secondaryLayer ?? "", options?.displayMode ?? "single"] as const,
  chapterList: (storyId: string, cursor: string | null, direction: "next" | "previous") => ["reader", "chapter-list", storyId, direction, cursor] as const,
  comments: (chapterId: string) => ["reader", "comments", chapterId] as const,
  story: (storyId: string) => ["story", storyId] as const
};

export async function fetchReaderChapter(storyId: string, chapterNumber: number, options?: ReaderChapterQueryOptions) {
  const response = await fetch(`/api/stories/${storyId}/chapters/${chapterNumber}${chapterQueryString(options)}`);
  if (!response.ok) throw new Error("Không tải được chương.");
  return (await response.json()) as ReaderPayload;
}

/**
 * Warm RQ chapter JSON (hover / CTA / scroll-edge). Read-only GET only —
 * never writes progress, bookmarks, sessions, or audio jobs.
 * Same query key as the live reader when `options` match bilingual prefs.
 */
export function prefetchReaderChapterQuery(
  queryClient: QueryClient,
  storyId: string,
  chapterNumber: number,
  options?: ReaderChapterQueryOptions
) {
  if (shouldSkipPrefetchNetwork()) return;

  const queryKey = readerQueryKeys.chapter(storyId, chapterNumber, options);
  const state = queryClient.getQueryState(queryKey);
  if (state?.data && state.isInvalidated === false && Date.now() - (state.dataUpdatedAt || 0) < READER_CHAPTER_STALE_MS) {
    return;
  }
  if (state?.fetchStatus === "fetching") return;

  const flightKey = chapterPrefetchKey(storyId, chapterNumber, options);
  if (chapterPrefetchInFlight.has(flightKey)) return;
  if (chapterPrefetchInFlight.size >= MAX_CHAPTER_PREFETCH_IN_FLIGHT) return;

  chapterPrefetchInFlight.add(flightKey);
  return queryClient
    .prefetchQuery({
      queryKey,
      queryFn: () => fetchReaderChapter(storyId, chapterNumber, options),
      staleTime: READER_CHAPTER_STALE_MS
    })
    .finally(() => {
      chapterPrefetchInFlight.delete(flightKey);
    });
}

export async function fetchStorySummary(storyId: string) {
  const response = await fetch(`/api/stories/${storyId}`);
  if (!response.ok) throw new Error("Không tải được truyện.");
  return response.json();
}

export function prefetchStorySummaryQuery(queryClient: QueryClient, storyId: string) {
  if (shouldSkipPrefetchNetwork()) return;
  return queryClient.prefetchQuery({
    queryKey: readerQueryKeys.story(storyId),
    queryFn: () => fetchStorySummary(storyId),
    staleTime: 1000 * 60 * 2
  });
}
