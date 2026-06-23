import { formatNovelContent } from "@/lib/formatNovelContent";

type ChapterContentSource = {
  content: string | null;
  isContentPreformatted?: boolean;
  title: string;
};

export function chapterContentToParagraphs(chapter: ChapterContentSource): string[] {
  if (!chapter.content) return [];
  if (chapter.isContentPreformatted) {
    return chapter.content
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }
  return formatNovelContent(chapter.content, undefined, chapter.title);
}
