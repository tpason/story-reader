import type { ChapterSummary } from "@/lib/types";

const VI_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

/**
 * SQL fragment: display timestamp by active content layer (raw → created, else pipeline update).
 * Non-empty text via NULLIF(BTRIM(...), '') — same semantics as pre-perf path; list queries still
 * omit returning TEXT blobs to Node.
 */
export const CHAPTER_DISPLAY_AT_SQL = `
  CASE
    WHEN COALESCE(NULLIF(BTRIM(c.polished_text_content), ''), NULLIF(BTRIM(c.polished_text_path), '')) IS NOT NULL
      OR c.is_polished THEN
      COALESCE(c.polished_at, c.updated_at)
    WHEN COALESCE(NULLIF(BTRIM(c.translated_text_content), ''), NULLIF(BTRIM(c.translated_text_path), '')) IS NOT NULL
      OR c.is_translated THEN
      COALESCE(c.translated_at, c.updated_at)
    ELSE
      COALESCE(c.created_at, c.downloaded_at, c.updated_at)
  END AS chapter_updated_at`;

export function formatContentDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return VI_DATE_FORMATTER.format(date);
}

export function chapterTimestampLabel(textSource: ChapterSummary["textSource"]) {
  return textSource === "polished" || textSource === "translated" ? "Cập nhật" : "Tạo";
}

export function formatChapterTimestamp(chapter: Pick<ChapterSummary, "textSource" | "updatedAt">) {
  const date = formatContentDate(chapter.updatedAt);
  if (!date) return null;
  return `${chapterTimestampLabel(chapter.textSource)} ${date}`;
}

export function formatStoryUpdatedLabel(updatedAt: string) {
  const date = formatContentDate(updatedAt);
  return date ? `Cập nhật ${date}` : null;
}

export function formatRelativeActivity(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatStoryUpdatedLabel(value);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return formatStoryUpdatedLabel(value);
}
