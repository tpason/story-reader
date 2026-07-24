"use client";

import { BookOpenCheck, ChevronRight, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CursorPage, StorySummary } from "@/lib/types";
import { StoryCover } from "@/components/StoryCover";
import { StoryRankMeta } from "@/components/StoryRankMeta";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { storyHref } from "@/lib/urls";
import { storyDisplayDescription, storyCategoryLabel } from "@/lib/story-description";
import { formatRelativeActivity, formatStoryUpdatedLabel } from "@/lib/content-timestamps";
import { resolveStoryStatusBadge } from "@/lib/story-status";
import { prefetchReaderChapterQuery, prefetchStorySummaryQuery } from "@/lib/reader-query";
import { warmReaderClientChunk } from "@/lib/warm-reader-client";
import { armStoryCoverViewTransition } from "@/lib/story-cover-view-transition";
import { useAppSelector } from "@/lib/store-hooks";
import { useReadingProgressSync } from "@/hooks/useReadingProgressSync";
import { useStoryLibraryAdminEdit, type AdminStoryListEditField, type AdminStoryListEditState } from "@/hooks/useStoryLibraryAdminEdit";
import { useStoryLibraryFeed } from "@/hooks/useStoryLibraryFeed";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { useCardTiltHandlers } from "@/hooks/useCardTiltHandlers";

const CultivationPanel = dynamic(() => import("@/components/CultivationPanel").then((mod) => mod.CultivationPanel));

export type StoryLibraryMode = "default" | "search" | "browse";

type StoryLibraryProps = {
  initialPage: CursorPage<StorySummary>;
  /** @deprecated use `mode="search"` */
  searchActive?: boolean;
  mode?: StoryLibraryMode;
  /** Homepage lifts continue into earlier vertical story; keep false there. */
  showContinueSection?: boolean;
  /** Homepage renders cultivation above sticky catalog so sticky chrome cannot cover it. */
  showCultivationPanel?: boolean;
  query: {
    q?: string;
    author?: string;
    hot?: string;
    completed?: string;
    category?: string;
    minChapters?: string;
    maxChapters?: string;
    hasPolished?: string;
    hasAudio?: string;
    sort?: string;
  };
};

function highlightText(text: string, term: string): ReactNode {
  if (!term || !text) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="search-highlight">{part}</mark> : part
  );
}

function StoryCardSkeleton() {
  return (
    <div className="story-card story-card-skeleton" aria-hidden="true">
      <div className="story-card-skeleton-cover" />
      <div className="story-card-body">
        <div className="story-card-skeleton-line story-card-skeleton-line-short" />
        <div className="story-card-skeleton-line" />
        <div className="story-card-skeleton-line story-card-skeleton-line-mid" />
      </div>
    </div>
  );
}

type StoryHistoryItem = {
  storyId: string;
  chapterNumber: number;
  maxReadChapterNumber: number;
};

type StoryCardProps = {
  story: StorySummary;
  storyHistory: StoryHistoryItem | undefined;
  isAdmin: boolean;
  adminEditForCard: AdminStoryListEditState;
  highlight?: string;
  fresh?: boolean;
  priority?: boolean;
  onStartEdit: (story: StorySummary, field: AdminStoryListEditField, value: string | null | undefined) => void;
  onSetAdminEdit: (edit: AdminStoryListEditState) => void;
};

const StoryCard = memo(function StoryCard({ story, storyHistory, isAdmin, adminEditForCard, highlight, fresh, priority, onStartEdit, onSetAdminEdit }: StoryCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tiltHandlers = useCardTiltHandlers();
  const newChapterCount = storyHistory ? Math.max(0, story.totalChapters - storyHistory.maxReadChapterNumber) : 0;
  const statusLabel = storyHistory
    ? newChapterCount > 0
      ? `Mới +${newChapterCount}`
      : "Đã đọc"
    : "Chưa đọc";
  const progressPercent = storyHistory && story.totalChapters > 0
    ? Math.min(100, Math.round((storyHistory.maxReadChapterNumber / story.totalChapters) * 100))
    : 0;
  const updatedLabel = formatRelativeActivity(story.updatedAt) ?? formatStoryUpdatedLabel(story.updatedAt);
  const href = storyHistory ? storyHref(story, storyHistory.chapterNumber) : storyHref(story);

  function warmStoryNav() {
    router.prefetch(href);
    void prefetchStorySummaryQuery(queryClient, story.id);
    if (storyHistory) {
      warmReaderClientChunk();
      void prefetchReaderChapterQuery(queryClient, story.id, storyHistory.chapterNumber);
    }
  }

  return (
    <Link
      className={`story-card ${fresh ? "story-card-fresh" : ""}`.trim()}
      href={href}
      onMouseEnter={warmStoryNav}
      onFocus={warmStoryNav}
      onClick={(event) => armStoryCoverViewTransition(event.currentTarget)}
      {...tiltHandlers}
    >
      <StoryCover src={story.coverImageUrl} title={story.title} priority={priority} />
      <div className="story-card-body">
        <div className="story-card-heading">
          <div>
            <p className="story-card-kicker">
              <Sparkles size={12} />
              {storyCategoryLabel(story)}
            </p>
            {adminEditForCard?.field === "storyTitle" ? (
              <input
                className="admin-inline-input story-card-admin-input"
                value={adminEditForCard.value}
                autoFocus
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onChange={(event) => onSetAdminEdit({ storyId: story.id, field: "storyTitle", value: event.target.value })}
              />
            ) : (
              <h2
                className={isAdmin ? "story-card-title admin-editable-hidden" : "story-card-title"}
                onClick={(event) => {
                  if (!isAdmin) return;
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onStartEdit(story, "storyTitle", story.title);
                }}
              >
                {highlight ? highlightText(story.title, highlight) : story.title}
              </h2>
            )}
          </div>
          <span className={`read-badge ${storyHistory ? "read-badge-active" : ""}`}>{statusLabel}</span>
        </div>
        <div className="story-meta">
          {adminEditForCard?.field === "author" ? (
            <input
              className="admin-inline-input story-card-admin-input"
              value={adminEditForCard.value}
              autoFocus
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onChange={(event) => onSetAdminEdit({ storyId: story.id, field: "author", value: event.target.value })}
            />
          ) : (
            <span
              className={isAdmin ? "admin-editable-hidden" : undefined}
              onClick={(event) => {
                if (!isAdmin) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onStartEdit(story, "author", story.author);
              }}
            >
              {highlight && story.author ? highlightText(story.author, highlight) : story.author || "Unknown author"}
            </span>
          )}
          <span>{story.totalChapters} chương</span>
          {updatedLabel ? <span className="story-meta-time">{updatedLabel}</span> : null}
          {storyHistory ? <span>Tu luyện tiếp {storyHistory.chapterNumber}</span> : null}
          {resolveStoryStatusBadge(story).completed ? <span>Hoàn thành</span> : null}
          <StoryRankMeta story={story} compact />
        </div>
        {adminEditForCard?.field === "description" ? (
          <textarea
            className="admin-content-editor story-card-admin-description"
            value={adminEditForCard.value}
            autoFocus
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onChange={(event) => onSetAdminEdit({ storyId: story.id, field: "description", value: event.target.value })}
          />
        ) : (
          <p
            className={isAdmin ? "story-description admin-editable-hidden" : "story-description"}
            onClick={(event) => {
              if (!isAdmin) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartEdit(story, "description", story.description ?? storyDisplayDescription(story));
            }}
          >
            {storyDisplayDescription(story)}
          </p>
        )}
        <div className="story-card-footer">
          {storyHistory ? (
            <div className="story-progress-mini-wrap">
              <div className="story-progress-mini" aria-label={`Tiến độ ${progressPercent}%`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="story-progress-pct">{progressPercent}%</span>
            </div>
          ) : (
            <span className="story-progress-mini-spacer" aria-hidden />
          )}
          <span className="story-card-cta">
            {storyHistory ? "Đọc tiếp" : "Chi tiết"}
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
});

export function StoryLibrary({
  initialPage,
  searchActive = false,
  mode,
  showContinueSection = true,
  showCultivationPanel = true,
  query
}: StoryLibraryProps) {
  const libraryMode: StoryLibraryMode = mode ?? (searchActive ? "search" : "default");
  const hideHomeExtras = libraryMode !== "default";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, setItems, nextCursor, loading, error, sentinelRef } = useStoryLibraryFeed(initialPage, query);
  const currentUser = useAppSelector((state) => state.identity.user);
  const history = useAppSelector((state) => state.history.items);
  const { adminEdit, adminEditSaving, adminEditError, setAdminEdit, startAdminEdit, saveAdminEdit } = useStoryLibraryAdminEdit({
    isAdmin: !!currentUser?.isAdmin,
    items,
    setItems,
    queryClient
  });
  useReadingProgressSync();
  const { isFresh } = useFreshStoryRealtime();

  const historyByStory = useMemo(() => new Map(history.map((item) => [item.storyId, item])), [history]);
  const recentItems = useMemo(() => history.slice(0, 6), [history]);
  const renderContinue = showContinueSection && !hideHomeExtras && recentItems.length > 0;
  const scrollHostRef = useRef<HTMLDivElement | null>(null);
  // Only after the load-more sentinel enters the scroll host while feed is exhausted.
  const [endReached, setEndReached] = useState(false);

  useEffect(() => {
    setEndReached(false);
  }, [initialPage, query.q, query.author, query.hot, query.completed, query.category, query.minChapters, query.maxChapters, query.hasPolished, query.hasAudio, query.sort]);

  useEffect(() => {
    if (nextCursor || loading) {
      if (nextCursor) setEndReached(false);
      return;
    }
    const sentinel = sentinelRef.current;
    const host = scrollHostRef.current;
    if (!sentinel || !host) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setEndReached(true);
      },
      { root: host, rootMargin: "0px", threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loading, items.length, sentinelRef]);

  if (items.length === 0) {
    return (
      <XianxiaEmptyState
        title="Linh Quyển Đại Thư chưa có linh quyển phù hợp."
        hint="Thử thay đổi điều kiện tìm kiếm hoặc quay lại sau."
      />
    );
  }

  return (
    <>
      {!hideHomeExtras && showCultivationPanel ? <CultivationPanel items={history} /> : null}

      {adminEdit ? (
        <div className="admin-edit-floating" role="status">
          {adminEditSaving ? <span>Đang lưu...</span> : null}
          {adminEditError ? <strong>{adminEditError}</strong> : null}
          <button type="button" onClick={saveAdminEdit} disabled={adminEditSaving}>
            Save
          </button>
          <button type="button" onClick={() => setAdminEdit(null)} disabled={adminEditSaving}>
            Cancel
          </button>
        </div>
      ) : null}

      {renderContinue ? (
        <section className="continue-section" aria-label="Tu luyện tiếp">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Tu luyện tiếp</p>
              <h2>Hành trình đang đọc</h2>
            </div>
            <Link href="/reading-history">Tàng thư</Link>
          </div>
          <div className="continue-row">
            {recentItems.map((item) => {
              const continueHref = storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber);
              const warmContinue = () => {
                warmReaderClientChunk();
                router.prefetch(continueHref);
                void prefetchReaderChapterQuery(queryClient, item.storyId, item.chapterNumber);
              };
              return (
                <Link
                  className={`continue-card ${isFresh(item.storyId) ? "continue-card-fresh" : ""}`.trim()}
                  href={continueHref}
                  key={item.storyId}
                  onMouseEnter={warmContinue}
                  onFocus={warmContinue}
                >
                  <BookOpenCheck size={16} />
                  <span>{item.storyTitle}</span>
                  <small>Chương {item.chapterNumber}</small>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="library-list-section" aria-label={libraryMode === "search" ? "Search results" : "Stories"}>
        {/* Heading stays above bounded feed (Ridi shelf title → grid rhythm). */}
        <div className="library-list-chrome">
          <div className="section-heading-row story-list-heading">
            <div>
              <p className="eyebrow">{libraryMode === "search" ? "Kết quả" : "Thư viện"}</p>
              <h2>{libraryMode === "search" ? "Linh quyển tìm thấy" : "Danh sách truyện"}</h2>
            </div>
            <span className="discovery-badge">{initialPage.total ?? items.length} truyện</span>
          </div>
        </div>

        {/* Inner scroll host (sticky panel on homepage owns viewport height). */}
        <div
          className="story-library-scroll"
          tabIndex={0}
          aria-label="Danh sách linh quyển — cuộn trong khung này"
          ref={scrollHostRef}
        >
          <div className="story-grid">
            {items.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                storyHistory={historyByStory.get(story.id)}
                isAdmin={!!currentUser?.isAdmin}
                adminEditForCard={adminEdit?.storyId === story.id ? adminEdit : null}
                highlight={query.q || undefined}
                fresh={isFresh(story.id)}
                priority={index < 6}
                onStartEdit={startAdminEdit}
                onSetAdminEdit={setAdminEdit}
              />
            ))}
          </div>

          {loading ? (
            <div className="story-grid story-grid-skeleton" aria-busy="true" aria-label="Đang tải thêm linh quyển">
              {Array.from({ length: 6 }).map((_, i) => <StoryCardSkeleton key={i} />)}
            </div>
          ) : null}

          <div className="infinite-status" ref={sentinelRef}>
            {error ? (
              error
            ) : nextCursor ? (
              "Cuộn để tải thêm"
            ) : loading ? (
              "Đang tải…"
            ) : endReached ? (
              "Đã xem hết Linh Quyển Đại Thư"
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
