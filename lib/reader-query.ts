import type { ReaderPayload } from "@/lib/types";

export const readerQueryKeys = {
  chapter: (storyId: string, chapterNumber: number) => ["reader", "chapter", storyId, chapterNumber] as const,
  chapterList: (storyId: string, cursor: string | null, direction: "next" | "previous") => ["reader", "chapter-list", storyId, direction, cursor] as const,
  comments: (chapterId: string) => ["reader", "comments", chapterId] as const
};

export async function fetchReaderChapter(storyId: string, chapterNumber: number) {
  const response = await fetch(`/api/stories/${storyId}/chapters/${chapterNumber}`);
  if (!response.ok) throw new Error("Không tải được chương.");
  return (await response.json()) as ReaderPayload;
}
