"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CHAPTER_PAGE_SIZE } from "@/components/reader/ChapterList";
import type { ChapterSummary, CursorPage } from "@/lib/types";

type UseStoryChapterPaginationOptions = {
  storyId: string;
  initialChapters: ChapterSummary[];
  totalChapters: number;
};

export function useStoryChapterPagination({ storyId, initialChapters, totalChapters }: UseStoryChapterPaginationOptions) {
  const [chapterPage, setChapterPage] = useState(initialChapters);
  const [chapterPageStart, setChapterPageStart] = useState(initialChapters[0]?.chapterNumber ?? 1);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chapterLoadError, setChapterLoadError] = useState<string | null>(null);
  const [chapterSearch, setChapterSearch] = useState("");
  const [activeChapterSearch, setActiveChapterSearch] = useState("");
  const appendInFlightRef = useRef(false);
  const [appendExhausted, setAppendExhausted] = useState(false);

  useEffect(() => {
    setChapterPage(initialChapters);
    setChapterPageStart(initialChapters[0]?.chapterNumber ?? 1);
    setIsLoadingChapters(false);
    setChapterLoadError(null);
    setChapterSearch("");
    setActiveChapterSearch("");
    setAppendExhausted(false);
    appendInFlightRef.current = false;
  }, [initialChapters, storyId]);

  const pageFirstChapter = chapterPage[0]?.chapterNumber ?? 0;
  const pageLastChapter = chapterPage.at(-1)?.chapterNumber ?? 0;
  const isSearchingChapters = Boolean(activeChapterSearch);
  const hasPreviousChapterPage = pageFirstChapter > 1;
  const hasNextChapterPage =
    !isSearchingChapters &&
    !appendExhausted &&
    pageLastChapter > 0 &&
    pageLastChapter < totalChapters;
  const isExpandedList = !isSearchingChapters && chapterPage.length > CHAPTER_PAGE_SIZE;
  const chapterRangeLabel = isSearchingChapters
    ? `${chapterPage.length} kết quả`
    : chapterPage.length > 0
      ? `${pageFirstChapter}-${pageLastChapter}/${totalChapters}`
      : `0/${totalChapters}`;
  const currentChapterPage = useMemo(() => Math.max(1, Math.ceil(Math.max(1, pageFirstChapter) / CHAPTER_PAGE_SIZE)), [pageFirstChapter]);
  const totalChapterPages = Math.max(1, Math.ceil(Math.max(0, totalChapters) / CHAPTER_PAGE_SIZE));

  const scrollToChapterList = useCallback(() => {
    window.requestAnimationFrame(() => {
      document.getElementById("story-chapters")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, []);

  const loadChapterPage = useCallback(async (targetChapter: number) => {
    const cleanTarget = Math.min(Math.max(1, Math.floor(targetChapter)), Math.max(1, totalChapters));
    setIsLoadingChapters(true);
    setChapterLoadError(null);
    try {
      const params = new URLSearchParams({
        chapterNumber: String(cleanTarget),
        limit: String(CHAPTER_PAGE_SIZE)
      });
      const response = await fetch(`/api/stories/${storyId}/chapters?${params.toString()}`);
      if (!response.ok) throw new Error("Không thể tải danh sách chương.");
      const data = (await response.json()) as CursorPage<ChapterSummary>;
      setChapterPage(data.items);
      setChapterPageStart(data.items[0]?.chapterNumber ?? cleanTarget);
      setActiveChapterSearch("");
      scrollToChapterList();
    } catch (error) {
      setChapterLoadError(error instanceof Error ? error.message : "Không thể tải danh sách chương.");
    } finally {
      setIsLoadingChapters(false);
    }
  }, [scrollToChapterList, storyId, totalChapters]);

  const appendNextChapterPage = useCallback(async () => {
    if (isSearchingChapters || !hasNextChapterPage || isLoadingChapters || appendInFlightRef.current) return;
    appendInFlightRef.current = true;
    setIsLoadingChapters(true);
    setChapterLoadError(null);
    try {
      const params = new URLSearchParams({
        chapterNumber: String(pageLastChapter + 1),
        limit: String(CHAPTER_PAGE_SIZE)
      });
      const response = await fetch(`/api/stories/${storyId}/chapters?${params.toString()}`);
      if (!response.ok) throw new Error("Không thể tải danh sách chương.");
      const data = (await response.json()) as CursorPage<ChapterSummary>;
      const existing = new Set(chapterPage.map((chapter) => chapter.id));
      const next = data.items.filter((chapter) => !existing.has(chapter.id));

      if (!data.items.length || data.nextCursor == null || next.length === 0) {
        setAppendExhausted(true);
      }
      if (next.length > 0) {
        setChapterPage((current) => [...current, ...next]);
      }
    } catch (error) {
      setChapterLoadError(error instanceof Error ? error.message : "Không thể tải danh sách chương.");
    } finally {
      appendInFlightRef.current = false;
      setIsLoadingChapters(false);
    }
  }, [chapterPage, hasNextChapterPage, isLoadingChapters, isSearchingChapters, pageLastChapter, storyId]);

  const searchChapterList = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const searchText = chapterSearch.trim();
    if (!searchText) {
      setActiveChapterSearch("");
      await loadChapterPage(pageFirstChapter || 1);
      return;
    }

    const chapterNumber = Number(searchText);
    if (/^\d+$/.test(searchText) && Number.isFinite(chapterNumber)) {
      await loadChapterPage(chapterNumber);
      return;
    }

    setIsLoadingChapters(true);
    setChapterLoadError(null);
    try {
      const params = new URLSearchParams({
        q: searchText,
        limit: String(CHAPTER_PAGE_SIZE)
      });
      const response = await fetch(`/api/stories/${storyId}/chapters?${params.toString()}`);
      if (!response.ok) throw new Error("Không thể tìm chương.");
      const data = (await response.json()) as CursorPage<ChapterSummary>;
      setChapterPage(data.items);
      setChapterPageStart(data.items[0]?.chapterNumber ?? 1);
      setActiveChapterSearch(searchText);
      scrollToChapterList();
    } catch (error) {
      setChapterLoadError(error instanceof Error ? error.message : "Không thể tìm chương.");
    } finally {
      setIsLoadingChapters(false);
    }
  }, [chapterSearch, loadChapterPage, pageFirstChapter, scrollToChapterList, storyId]);

  const clearChapterSearch = useCallback(async () => {
    setChapterSearch("");
    setActiveChapterSearch("");
    await loadChapterPage(1);
  }, [loadChapterPage]);

  return {
    chapterPage,
    chapterPageStart,
    isLoadingChapters,
    chapterLoadError,
    chapterSearch,
    activeChapterSearch,
    pageFirstChapter,
    pageLastChapter,
    isSearchingChapters,
    hasPreviousChapterPage,
    hasNextChapterPage,
    isExpandedList,
    chapterRangeLabel,
    currentChapterPage,
    totalChapterPages,
    setChapterSearch,
    loadChapterPage,
    appendNextChapterPage,
    searchChapterList,
    clearChapterSearch
  };
}
