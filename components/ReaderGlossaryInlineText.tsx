"use client";

import type { GlossaryCharacter, GlossaryIndex } from "@/lib/reader-glossary";
import { buildGlossaryTextSpans } from "@/lib/reader-glossary-inline";
import { memo, Fragment, type MouseEvent } from "react";

type ReaderGlossaryInlineTextProps = {
  text: string;
  glossaryIndex: GlossaryIndex;
  searchActive: boolean;
  onTermClick: (character: GlossaryCharacter, event: MouseEvent<HTMLButtonElement>) => void;
};

export const ReaderGlossaryInlineText = memo(function ReaderGlossaryInlineText({
  text,
  glossaryIndex,
  searchActive,
  onTermClick,
}: ReaderGlossaryInlineTextProps) {
  if (searchActive || glossaryIndex.size === 0) {
    return text;
  }

  const spans = buildGlossaryTextSpans(text, glossaryIndex);

  return (
    <>
      {spans.map((span, index) =>
        span.kind === "text" ? (
          // Bare text nodes so ::first-letter drop-cap/initial can target the real first char.
          <Fragment key={`t-${index}`}>{span.value}</Fragment>
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
});
