import { useCallback, useEffect, useMemo, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { findChapterSearchMatches, type ChapterSearchMatch } from "@/lib/reader-in-chapter-search";
import { prefersReducedMotion } from "@/lib/browser";

export type UseInChapterSearchOptions = {
  paragraphs: string[];
  paragraphContainerRef: RefObject<HTMLElement | null>;
  /** Resets the active match when the chapter changes. */
  chapterId: string;
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

/**
 * In-chapter text search ("tìm trong chương"): finds query matches across the
 * chapter paragraphs, tracks the active match, scrolls it into view while the
 * search bar is open, and resets when the query or chapter changes.
 */
export function useInChapterSearch({
  paragraphs,
  paragraphContainerRef,
  chapterId,
}: UseInChapterSearchOptions): UseInChapterSearchResult {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const matches = useMemo(() => findChapterSearchMatches(paragraphs, query), [paragraphs, query]);
  const activeMatch = matches[matchIndex] ?? null;

  useEffect(() => {
    setMatchIndex(0);
  }, [query, chapterId]);

  useEffect(() => {
    if (!open || matches.length === 0) return;
    const match = matches[matchIndex];
    if (!match) return;
    const node = paragraphContainerRef.current?.querySelector(`[data-paragraph-index="${match.paragraphIndex}"]`);
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
