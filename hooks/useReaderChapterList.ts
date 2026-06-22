import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { readerQueryKeys } from "@/lib/reader-query";
import type { ChapterSummary, CursorPage, ReaderPayload } from "@/lib/types";

export type UseReaderChapterListOptions = {
  /** Source of the initial list and the reset baseline on chapter navigation. */
  payload: ReaderPayload;
  storyId: string;
  /** Scrollable sidebar container — used for scroll anchoring + observer root. */
  sidebarRef: RefObject<HTMLElement | null>;
  previousSentinelRef: RefObject<HTMLDivElement | null>;
  nextSentinelRef: RefObject<HTMLDivElement | null>;
};

export type UseReaderChapterListResult = {
  chapters: ChapterSummary[];
  filteredChapters: ChapterSummary[];
  loadingChapters: boolean;
  chapterSearch: string;
  setChapterSearch: Dispatch<SetStateAction<string>>;
  chapterSearchText: string;
  previousChapterCursor: string | null;
  chapterCursor: string | null;
  loadNextChapters: () => void;
  loadPreviousChapters: () => void;
};

/**
 * Reader sidebar chapter list: cursor-paginated chapters expanded around the
 * active chapter, local fuzzy filtering (exact matches first, then Fuse), and
 * IntersectionObserver-driven infinite load in both directions. Resets to the
 * payload baseline whenever the chapter changes.
 *
 * This is intentionally separate from `useStoryChapterPagination` (the page-
 * windowed story-detail list): the reader needs bidirectional cursor expansion,
 * query-client caching, and scroll anchoring that that hook does not model.
 */
export function useReaderChapterList({
  payload,
  storyId,
  sidebarRef,
  previousSentinelRef,
  nextSentinelRef,
}: UseReaderChapterListOptions): UseReaderChapterListResult {
  const queryClient = useQueryClient();

  const [chapters, setChapters] = useState(payload.chapters);
  const [previousChapterCursor, setPreviousChapterCursor] = useState(payload.previousChapterCursor);
  const [chapterCursor, setChapterCursor] = useState(payload.chapterCursor);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");

  const deferredChapterSearch = useDeferredValue(chapterSearch);
  const chapterSearchText = deferredChapterSearch.trim().toLowerCase();

  const chapterSearchIndex = useMemo(
    () =>
      new Fuse(chapters, {
        ignoreLocation: true,
        includeScore: true,
        keys: [
          { name: "chapterNumber", weight: 0.38 },
          { name: "title", weight: 0.62 },
        ],
        shouldSort: true,
        threshold: 0.36,
      }),
    [chapters],
  );

  const filteredChapters = useMemo(() => {
    if (!chapterSearchText) return chapters;
    const exactMatches = chapters.filter((chapter) => {
      const chapterNumber = String(chapter.chapterNumber);
      const chapterTitle = chapter.title?.toLowerCase() ?? "";
      return chapterNumber.includes(chapterSearchText) || chapterTitle.includes(chapterSearchText);
    });
    const exactIds = new Set(exactMatches.map((chapter) => chapter.id));
    const fuzzyMatches = chapterSearchIndex.search(chapterSearchText).map((result) => result.item);
    return [...exactMatches, ...fuzzyMatches.filter((chapter) => !exactIds.has(chapter.id))];
  }, [chapterSearchIndex, chapterSearchText, chapters]);

  // Reset the list to the payload baseline when the chapter changes.
  useEffect(() => {
    setChapters(payload.chapters);
    setPreviousChapterCursor(payload.previousChapterCursor);
    setChapterCursor(payload.chapterCursor);
    setChapterSearch("");
  }, [payload.chapters, payload.previousChapterCursor, payload.chapterCursor]);

  const loadNextChapters = useCallback(() => {
    if (!chapterCursor || loadingChapters) return;
    setLoadingChapters(true);
    queryClient
      .fetchQuery({
        queryKey: readerQueryKeys.chapterList(storyId, chapterCursor, "next"),
        queryFn: async () => {
          const response = await fetch(`/api/stories/${storyId}/chapters?cursor=${encodeURIComponent(chapterCursor)}&limit=80`);
          if (!response.ok) throw new Error("Không tải được danh sách chương");
          return response.json() as Promise<CursorPage<ChapterSummary>>;
        },
        staleTime: 1000 * 60 * 10,
      })
      .then((page) => {
        setChapters((current) => {
          const existing = new Set(current.map((chapter) => chapter.id));
          return [...current, ...page.items.filter((chapter) => !existing.has(chapter.id))];
        });
        setPreviousChapterCursor((current) => current ?? page.previousCursor ?? null);
        setChapterCursor(page.nextCursor);
      })
      .catch(() => undefined)
      .finally(() => setLoadingChapters(false));
  }, [chapterCursor, loadingChapters, storyId, queryClient]);

  const loadPreviousChapters = useCallback(() => {
    if (!previousChapterCursor || loadingChapters) return;
    const sidebar = sidebarRef.current;
    const previousScrollHeight = sidebar?.scrollHeight ?? 0;
    const previousScrollTop = sidebar?.scrollTop ?? 0;

    setLoadingChapters(true);
    queryClient
      .fetchQuery({
        queryKey: readerQueryKeys.chapterList(storyId, previousChapterCursor, "previous"),
        queryFn: async () => {
          const response = await fetch(`/api/stories/${storyId}/chapters?cursor=${encodeURIComponent(previousChapterCursor)}&direction=previous&limit=80`);
          if (!response.ok) throw new Error("Không tải được danh sách chương");
          return response.json() as Promise<CursorPage<ChapterSummary>>;
        },
        staleTime: 1000 * 60 * 10,
      })
      .then((page) => {
        setChapters((current) => {
          const existing = new Set(current.map((chapter) => chapter.id));
          return [...page.items.filter((chapter) => !existing.has(chapter.id)), ...current];
        });
        setPreviousChapterCursor(page.previousCursor ?? null);

        window.requestAnimationFrame(() => {
          const currentSidebar = sidebarRef.current;
          if (!currentSidebar) return;
          currentSidebar.scrollTop = previousScrollTop + Math.max(0, currentSidebar.scrollHeight - previousScrollHeight);
        });
      })
      .catch(() => undefined)
      .finally(() => setLoadingChapters(false));
  }, [loadingChapters, storyId, previousChapterCursor, queryClient, sidebarRef]);

  useEffect(() => {
    if (chapterSearchText) return;
    const sidebar = sidebarRef.current;
    const previousSentinel = previousSentinelRef.current;
    const nextSentinel = nextSentinelRef.current;
    if (!sidebar || !previousSentinel || !nextSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === previousSentinel) loadPreviousChapters();
          if (entry.target === nextSentinel) loadNextChapters();
        });
      },
      { root: sidebar, rootMargin: "180px 0px" },
    );

    observer.observe(previousSentinel);
    observer.observe(nextSentinel);
    return () => observer.disconnect();
    // sidebarRef/sentinel refs are stable; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterSearchText, loadNextChapters, loadPreviousChapters]);

  return {
    chapters,
    filteredChapters,
    loadingChapters,
    chapterSearch,
    setChapterSearch,
    chapterSearchText,
    previousChapterCursor,
    chapterCursor,
    loadNextChapters,
    loadPreviousChapters,
  };
}
