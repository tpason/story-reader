import type { StorySummary } from "@/lib/types";

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function storyCategoryLabel(story: Pick<StorySummary, "primaryCategoryName" | "category">) {
  return cleanText(story.primaryCategoryName) || cleanText(story.category) || "truyện chữ";
}

export function storyDisplayDescription(story: Pick<StorySummary, "description" | "title" | "author" | "primaryCategoryName" | "category" | "status" | "totalChapters" | "isCompleted">) {
  const existing = cleanText(story.description);
  if (existing) return existing;

  const category = storyCategoryLabel(story);
  const author = cleanText(story.author);
  const status = story.isCompleted ? "đã hoàn thành" : cleanText(story.status) || "đang cập nhật";
  const chapterText = story.totalChapters > 0 ? `${story.totalChapters} chương` : "nhiều chương";
  const authorText = author ? ` của ${author}` : "";

  return `${story.title} là ${category}${authorText}, hiện ${status} với ${chapterText}. Theo dõi để nhận chương mới và đọc tiếp từ tiến độ gần nhất.`;
}
