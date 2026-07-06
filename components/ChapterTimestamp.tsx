import { formatChapterTimestamp } from "@/lib/content-timestamps";
import type { ChapterSummary } from "@/lib/types";

type ChapterTimestampProps = {
  chapter: Pick<ChapterSummary, "textSource" | "updatedAt">;
  className?: string;
};

export function ChapterTimestamp({ chapter, className = "chapter-timestamp" }: ChapterTimestampProps) {
  const label = formatChapterTimestamp(chapter);
  if (!label || !chapter.updatedAt) return null;

  return (
    <time className={className} dateTime={chapter.updatedAt} title={label}>
      {label}
    </time>
  );
}
