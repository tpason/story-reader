"use client";

import { BookMarked, Highlighter, StickyNote } from "lucide-react";
import { memo } from "react";
import { ReaderGlossaryInlineText } from "@/components/ReaderGlossaryInlineText";
import { renderParagraphSearchText } from "@/components/ReaderChapterExtras";
import type { ChapterSearchMatch } from "@/lib/reader-in-chapter-search";
import type { GlossaryCharacter, GlossaryIndex } from "@/lib/reader-glossary";
import type { ParagraphBookmark } from "@/lib/paragraph-bookmarks";

type ReaderInlineChapterBlockProps = {
  chapterId: string;
  chapterNumber: number;
  title: string;
  paragraphs: string[];
  glossaryIndex: GlossaryIndex;
  onTermClick: (character: GlossaryCharacter) => void;
  bookmarkedParagraphIndexes?: Set<number>;
  chapterBookmarks?: ParagraphBookmark[];
  chapterSearchQuery?: string;
  activeChapterSearchMatch?: ChapterSearchMatch | null;
  onToggleBookmark?: (paragraphIndex: number, paragraph: string) => void;
  onOpenNote?: (paragraphIndex: number) => void;
};

export const ReaderInlineChapterBlock = memo(function ReaderInlineChapterBlock({
  chapterId,
  chapterNumber,
  title,
  paragraphs,
  glossaryIndex,
  onTermClick,
  bookmarkedParagraphIndexes,
  chapterBookmarks = [],
  chapterSearchQuery = "",
  activeChapterSearchMatch = null,
  onToggleBookmark,
  onOpenNote
}: ReaderInlineChapterBlockProps) {
  if (paragraphs.length === 0) return null;

  function paragraphClassName(index: number, bookmarked: boolean, hasNote: boolean) {
    const classes = ["reader-paragraph", "reader-inline-paragraph"];
    if (bookmarked) classes.push("reader-paragraph-bookmarked");
    if (hasNote) classes.push("reader-paragraph-has-note");
    return classes.join(" ");
  }

  function renderParagraphText(paragraphIndex: number, paragraph: string) {
    if (chapterSearchQuery.trim()) {
      return renderParagraphSearchText(
        paragraph,
        chapterSearchQuery,
        activeChapterSearchMatch,
        chapterNumber,
        paragraphIndex
      );
    }
    return glossaryIndex.size > 0 ? (
      <ReaderGlossaryInlineText text={paragraph} glossaryIndex={glossaryIndex} searchActive={false} onTermClick={onTermClick} />
    ) : (
      paragraph
    );
  }

  return (
    <section className="reader-inline-chapter" data-inline-chapter={chapterNumber} aria-label={title}>
      <div className="reader-inline-chapter-divider" role="separator">
        <span>Chương {chapterNumber}</span>
        <strong>{title}</strong>
      </div>
      {paragraphs.map((paragraph, index) => {
        const bookmarked = bookmarkedParagraphIndexes?.has(index) ?? false;
        const hasNote = chapterBookmarks.some((item) => item.paragraphIndex === index && item.note);
        return (
          <p
            key={`para-${chapterId}-${index}`}
            className={paragraphClassName(index, bookmarked, hasNote)}
            data-paragraph-index={index}
            data-chapter-number={chapterNumber}
            data-chapter-id={chapterId}
            data-chapter-title={title}
          >
            {onToggleBookmark ? (
              <span className="paragraph-tools">
                <button
                  className="paragraph-bookmark-button"
                  type="button"
                  aria-label={bookmarked ? "Bỏ dấu đoạn" : "Đánh dấu đoạn"}
                  title={bookmarked ? "Bỏ dấu đoạn" : "Đánh dấu đoạn"}
                  onClick={() => onToggleBookmark(index, paragraph)}
                >
                  {bookmarked ? <BookMarked size={13} /> : <Highlighter size={13} />}
                </button>
                {bookmarked && onOpenNote ? (
                  <button
                    className={`paragraph-note-button ${hasNote ? "paragraph-note-button-active" : ""}`}
                    type="button"
                    aria-label="Ghi chú đoạn"
                    title={hasNote ? "Sửa ghi chú đoạn" : "Thêm ghi chú đoạn"}
                    onClick={() => onOpenNote(index)}
                  >
                    <StickyNote size={13} />
                  </button>
                ) : null}
              </span>
            ) : null}
            <span className="reader-paragraph-text">{renderParagraphText(index, paragraph)}</span>
          </p>
        );
      })}
    </section>
  );
});
