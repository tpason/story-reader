import { useCallback, useEffect, useMemo, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  findChapterSearchMatchesAcrossBlocks,
  type ChapterSearchBlock,
  type ChapterSearchMatch
} from "@/lib/reader-in-chapter-search";
import { prefersReducedMotion } from "@/lib/browser";

export type { ChapterSearchBlock };

export type UseInChapterSearchOptions = {
  blocks: ChapterSearchBlock[];
  paragraphContainerRef: RefObject<HTMLElement | null>;
  /** Changes when primary or inline chapters change — resets match index. */
  resetKey: string;
};

export type UseInChapterSearchResult = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  matchIndex: number;
  matches: ChapterSearchMatch[];
  activeMatch: ChapterSearchMatch | null;
  jump: (direction: "previous" | "next") => void;
};

function paragraphSelector(match: ChapterSearchMatch) {
  return `[data-chapter-number="${match.chapterNumber}"][data-paragraph-index="${match.paragraphIndex}"]`;
}

/**
 * In-chapter text search across primary + inline chapter blocks.
 */
export function useInChapterSearch({
  blocks,
  paragraphContainerRef,
  resetKey,
}: UseInChapterSearchOptions): UseInChapterSearchResult {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const matches = useMemo(() => findChapterSearchMatchesAcrossBlocks(blocks, query), [blocks, query]);
  const activeMatch = matches[matchIndex] ?? null;

  useEffect(() => {
    setMatchIndex(0);
  }, [query, resetKey]);

  useEffect(() => {
    if (!open || matches.length === 0) return;
    const match = matches[matchIndex];
    if (!match) return;
    const node = paragraphContainerRef.current?.querySelector(paragraphSelector(match));
    node?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    // paragraphContainerRef is a stable ref; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matchIndex, matches]);

  const jump = useCallback(
    (direction: "previous" | "next") => {
      if (matches.length === 0) return;
      setMatchIndex((current) => {
        if (direction === "next") return (current + 1) % matches.length;
        return (current - 1 + matches.length) % matches.length;
      });
    },
    [matches.length],
  );

  return { open, setOpen, query, setQuery, matchIndex, matches, activeMatch, jump };
}
