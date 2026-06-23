import type { ReaderFetchOptions, ReaderPayload } from "@/lib/types";

export type ReaderChapterQueryOptions = ReaderFetchOptions;

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
  comments: (chapterId: string) => ["reader", "comments", chapterId] as const
};

export async function fetchReaderChapter(storyId: string, chapterNumber: number, options?: ReaderChapterQueryOptions) {
  const response = await fetch(`/api/stories/${storyId}/chapters/${chapterNumber}${chapterQueryString(options)}`);
  if (!response.ok) throw new Error("Không tải được chương.");
  return (await response.json()) as ReaderPayload;
}
