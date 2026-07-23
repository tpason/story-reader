import type { StorySummary } from "@/lib/types";

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeMetaText(value: string) {
  return cleanText(value).toLocaleLowerCase("vi");
}

/**
 * Crawl sources often store "Title Author" (or title-only) as description.
 * Those look empty in OG cards — treat as missing so the fallback synopsis wins.
 */
export function isUsefulStoryDescription(
  description: string | null | undefined,
  title: string,
  author?: string | null,
) {
  const existing = cleanText(description);
  if (!existing) return false;

  const d = normalizeMetaText(existing);
  const t = normalizeMetaText(title);
  const a = normalizeMetaText(author ?? "");

  if (!t) return existing.length >= 24;
  if (d === t) return false;
  if (a && (d === a || d === `${t} ${a}` || d === `${a} ${t}`)) return false;
  if (a && d.startsWith(t) && d.includes(a) && d.length <= t.length + a.length + 4) {
    return false;
  }
  // Title repeated with tiny noise ("Title -", "Title.")
  if (d.startsWith(t) && d.length <= t.length + 3) return false;

  return true;
}

export function storyCategoryLabel(story: Pick<StorySummary, "primaryCategoryName" | "category">) {
  return cleanText(story.primaryCategoryName) || cleanText(story.category) || "truyện chữ";
}

export function storyDisplayDescription(story: Pick<StorySummary, "description" | "title" | "author" | "primaryCategoryName" | "category" | "status" | "totalChapters" | "isCompleted">) {
  if (isUsefulStoryDescription(story.description, story.title, story.author)) {
    return cleanText(story.description);
  }

  const category = storyCategoryLabel(story);
  const author = cleanText(story.author);
  const status = story.isCompleted ? "đã hoàn thành" : cleanText(story.status) || "đang cập nhật";
  const chapterText = story.totalChapters > 0 ? `${story.totalChapters} chương` : "nhiều chương";
  const authorText = author ? ` của ${author}` : "";

  return `${story.title} là ${category}${authorText}, hiện ${status} với ${chapterText}. Theo dõi để nhận chương mới và đọc tiếp từ tiến độ gần nhất.`;
}
