"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { memo, useMemo, useState, type FormEvent } from "react";
import { ChapterTimestamp } from "@/components/ChapterTimestamp";
import { isTodayLocal } from "@/lib/date";
import { formatChapterCardTitle } from "@/lib/chapter-title";
import type { ChapterSummary, StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";

export const CHAPTER_PAGE_SIZE = 80;

export type ChapterListFilter = "all" | "unread" | "audio";

type ChapterCardProps = {
  chapter: ChapterSummary;
  maxReadChapter: number;
  currentStory: StorySummary;
  currentChapterNumber: number | null;
  fresh?: boolean;
};

const ChapterCard = memo(function ChapterCard({
  chapter,
  maxReadChapter,
  currentStory,
  currentChapterNumber,
  fresh = false,
}: ChapterCardProps) {
  const isRead = chapter.chapterNumber <= maxReadChapter;
  const isNew = maxReadChapter > 0 && chapter.chapterNumber > maxReadChapter;
  const addedToday = isTodayLocal(chapter.updatedAt);
  const isCurrent = currentChapterNumber === chapter.chapterNumber;

  return (
    <Link
      className={`story-chapter-card ${isRead ? "story-chapter-read" : ""} ${isCurrent ? "story-chapter-current" : ""} ${fresh ? "story-chapter-card-fresh" : ""}`.trim()}
      href={storyHref(currentStory, chapter.chapterNumber)}
    >
      {isCurrent && <span className="story-chapter-current-bar" aria-hidden="true" />}
      <span className="story-chapter-title">
        {chapter.chapterNumber}. {formatChapterCardTitle(chapter.chapterNumber, chapter.title)}
      </span>
      <span className="chapter-status-row">
        {isRead ? (
          <span className="chapter-status chapter-status-read">Đã đọc</span>
        ) : maxReadChapter > 0 ? (
          <span className="chapter-status">Chưa đọc</span>
        ) : null}
        {isCurrent ? <span className="chapter-status chapter-status-current">Đang đọc</span> : null}
        {isNew ? <span className="chapter-status chapter-status-new">New</span> : null}
        {addedToday ? <span className="chapter-status chapter-status-today">Hôm nay</span> : null}
        {chapter.textSource === "polished" ? (
          <span className="chapter-status chapter-status-polished">Polish</span>
        ) : null}
        {chapter.hasAudio ? <span className="chapter-status chapter-status-audio">Audio</span> : null}
        <ChapterTimestamp chapter={chapter} />
      </span>
    </Link>
  );
});

function ChapterCardSkeleton() {
  return (
    <div className="story-chapter-card story-chapter-card-skeleton" aria-hidden="true">
      <span className="story-chapter-skeleton-title" />
      <span className="story-chapter-skeleton-badges" />
    </div>
  );
}

export type ChapterListProps = {
  chapters: ChapterSummary[];
  totalChapters: number;
  currentStory: StorySummary;
  maxReadChapter: number;
  currentChapterNumber: number | null;
  isLoading: boolean;
  error: string | null;
  chapterSearch: string;
  activeChapterSearch: string;
  pageFirstChapter: number;
  pageLastChapter: number;
  chapterPageStart: number;
  currentChapterPage: number;
  totalChapterPages: number;
  isSearching: boolean;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  chapterRangeLabel: string;
  onChapterSearchChange: (value: string) => void;
  onSearch: (event?: FormEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onLoadPage: (targetChapter: number) => void;
  freshChapterNumber?: number | null;
};

export const ChapterList = memo(function ChapterList({
  chapters,
  totalChapters,
  currentStory,
  maxReadChapter,
  currentChapterNumber,
  isLoading,
  error,
  chapterSearch,
  activeChapterSearch,
  pageFirstChapter,
  pageLastChapter,
  chapterPageStart,
  currentChapterPage,
  totalChapterPages,
  isSearching,
  hasPrevPage,
  hasNextPage,
  chapterRangeLabel,
  onChapterSearchChange,
  onSearch,
  onClearSearch,
  onLoadPage,
  freshChapterNumber = null,
}: ChapterListProps) {
  const [chapterFilter, setChapterFilter] = useState<ChapterListFilter>("all");
  const visibleChapters = useMemo(() => {
    if (chapterFilter === "unread") {
      return chapters.filter((chapter) => chapter.chapterNumber > maxReadChapter);
    }
    if (chapterFilter === "audio") {
      return chapters.filter((chapter) => chapter.hasAudio);
    }
    return chapters;
  }, [chapterFilter, chapters, maxReadChapter]);

  if (totalChapters === 0) {
    return (
      <div className="empty-state">
        <p>Truyện này chưa có chapter trong database.</p>
      </div>
    );
  }

  return (
    <>
      {maxReadChapter > 0 ? (
        <div className="story-detail-progress-wrap">
          <div className="story-detail-progress-bar" aria-hidden="true">
            <div
              className="story-detail-progress-bar-fill"
              style={{ width: `${Math.min(100, (maxReadChapter / totalChapters) * 100)}%` }}
            />
          </div>
          <span className="story-detail-progress-pct">
            {Math.round((maxReadChapter / totalChapters) * 100)}%
          </span>
        </div>
      ) : null}

      <form className="story-chapter-search" role="search" onSubmit={onSearch}>
        <Search size={16} />
        <input
          type="search"
          inputMode="search"
          value={chapterSearch}
          onChange={(event) => onChapterSearchChange(event.target.value)}
          placeholder="Tìm số chương hoặc tên chương"
          aria-label="Tìm số chương hoặc tên chương"
        />
        {activeChapterSearch ? (
          <button
            type="button"
            className="story-chapter-search-clear"
            onClick={onClearSearch}
            aria-label="Xóa tìm kiếm chương"
          >
            <X size={15} />
          </button>
        ) : null}
        <button type="submit" disabled={isLoading}>
          Tìm
        </button>
      </form>

      <div className="story-chapter-filters" role="group" aria-label="Lọc chương">
        {(
          [
            { id: "all", label: "Tất cả" },
            { id: "unread", label: "Chưa đọc" },
            { id: "audio", label: "Có audio" }
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${chapterFilter === option.id ? "chip-active" : ""}`}
            aria-pressed={chapterFilter === option.id}
            onClick={() => setChapterFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="story-chapter-toolbar" aria-label="Chapter pagination">
        <div className="story-chapter-page-label">
          <span>{isSearching ? "Đang lọc mục lục" : `Trang ${currentChapterPage}/${totalChapterPages}`}</span>
          <strong>
            {isSearching ? `Kết quả cho "${activeChapterSearch}"` : `Chương ${chapterRangeLabel}`}
          </strong>
        </div>
        <div className="story-chapter-pager">
          <button
            type="button"
            onClick={() => onLoadPage(1)}
            disabled={isSearching || !hasPrevPage || isLoading}
            aria-label="Về chương đầu"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onLoadPage(Math.max(1, chapterPageStart - CHAPTER_PAGE_SIZE))}
            disabled={isSearching || !hasPrevPage || isLoading}
            aria-label="Trang chương trước"
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>
          <button
            type="button"
            onClick={() => onLoadPage(pageLastChapter + 1)}
            disabled={!hasNextPage || isLoading}
            aria-label="Trang chương sau"
          >
            <span>Sau</span>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => onLoadPage(totalChapters)}
            disabled={isSearching || !hasNextPage || isLoading}
            aria-label="Đến chương cuối"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      {error ? <p className="story-chapter-error">{error}</p> : null}

      {isLoading ? (
        <div className="story-chapter-list" aria-busy="true" aria-label="Đang tải chương">
          {Array.from({ length: 8 }).map((_, i) => (
            <ChapterCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleChapters.length > 0 ? (
        <div className="story-chapter-list">
          {visibleChapters.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              maxReadChapter={maxReadChapter}
              currentStory={currentStory}
              currentChapterNumber={currentChapterNumber}
              fresh={freshChapterNumber === chapter.chapterNumber}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {chapterFilter !== "all"
              ? "Không có chương phù hợp bộ lọc."
              : isSearching
                ? "Không tìm thấy chương phù hợp."
                : "Không có chương trong trang này."}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="story-chapter-loading" role="status" aria-live="polite">
          <Loader2 size={16} />
          Đang tải chương
        </div>
      ) : null}
    </>
  );
});
