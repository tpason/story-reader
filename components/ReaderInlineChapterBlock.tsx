"use client";

import { ReaderGlossaryInlineText } from "@/components/ReaderGlossaryInlineText";
import type { GlossaryCharacter } from "@/lib/reader-glossary";
import type { GlossaryIndex } from "@/lib/reader-glossary";

type ReaderInlineChapterBlockProps = {
  chapterId: string;
  chapterNumber: number;
  title: string;
  paragraphs: string[];
  glossaryIndex: GlossaryIndex;
  onTermClick: (character: GlossaryCharacter) => void;
};

export function ReaderInlineChapterBlock({
  chapterId,
  chapterNumber,
  title,
  paragraphs,
  glossaryIndex,
  onTermClick
}: ReaderInlineChapterBlockProps) {
  if (paragraphs.length === 0) return null;

  return (
    <section className="reader-inline-chapter" data-inline-chapter={chapterNumber} aria-label={title}>
      <div className="reader-inline-chapter-divider" role="separator">
        <span>Chương {chapterNumber}</span>
        <strong>{title}</strong>
      </div>
      {paragraphs.map((paragraph, index) => (
        <p
          className="reader-paragraph reader-inline-paragraph"
          data-paragraph-index={index}
          data-chapter-number={chapterNumber}
          data-chapter-id={chapterId}
          data-chapter-title={title}
          key={`${chapterNumber}-${index}-${paragraph.slice(0, 12)}`}
        >
          <span className="reader-paragraph-text">
            {glossaryIndex.size > 0 ? (
              <ReaderGlossaryInlineText text={paragraph} glossaryIndex={glossaryIndex} searchActive={false} onTermClick={onTermClick} />
            ) : (
              paragraph
            )}
          </span>
        </p>
      ))}
    </section>
  );
}
