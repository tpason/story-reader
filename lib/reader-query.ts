import type { QueryClient } from "@tanstack/react-query";
import type { ReaderFetchOptions, ReaderPayload } from "@/lib/types";

export type ReaderChapterQueryOptions = ReaderFetchOptions;

export const READER_CHAPTER_STALE_MS = 1000 * 60 * 8;

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

/** Warm RQ chapter JSON (hover / story-detail CTA). Guards save-data / offline. */
export function prefetchReaderChapterQuery(
  queryClient: QueryClient,
  storyId: string,
  chapterNumber: number,
  options?: ReaderChapterQueryOptions
) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const connection = typeof navigator !== "undefined"
    ? (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
    : undefined;
  if (connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
    return;
  }
  return queryClient.prefetchQuery({
    queryKey: readerQueryKeys.chapter(storyId, chapterNumber, options),
    queryFn: () => fetchReaderChapter(storyId, chapterNumber, options),
    staleTime: READER_CHAPTER_STALE_MS
  });
}

export async function fetchStorySummary(storyId: string) {
  const response = await fetch(`/api/stories/${storyId}`);
  if (!response.ok) throw new Error("Không tải được truyện.");
  return response.json();
}

export function prefetchStorySummaryQuery(queryClient: QueryClient, storyId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  return queryClient.prefetchQuery({
    queryKey: readerQueryKeys.story(storyId),
    queryFn: () => fetchStorySummary(storyId),
    staleTime: 1000 * 60 * 2
  });
}
