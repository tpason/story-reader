"use client";

import type { GlossaryCharacter, GlossaryIndex } from "@/lib/reader-glossary";
import { buildGlossaryTextSpans } from "@/lib/reader-glossary-inline";
import type { MouseEvent } from "react";

type ReaderGlossaryInlineTextProps = {
  text: string;
  glossaryIndex: GlossaryIndex;
  searchActive: boolean;
  onTermClick: (character: GlossaryCharacter, event: MouseEvent<HTMLButtonElement>) => void;
};

export function ReaderGlossaryInlineText({ text, glossaryIndex, searchActive, onTermClick }: ReaderGlossaryInlineTextProps) {
  if (searchActive || glossaryIndex.size === 0) {
    return text;
  }

  const spans = buildGlossaryTextSpans(text, glossaryIndex);

  return (
    <>
      {spans.map((span, index) =>
        span.kind === "text" ? (
          <span key={`t-${index}`}>{span.value}</span>
        ) : (
          <button
            key={`g-${index}-${span.value}`}
            type="button"
            className="reader-glossary-term"
            title={span.character.role ?? undefined}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTermClick(span.character, event);
            }}
          >
            {span.value}
          </button>
        )
      )}
    </>
  );
}
