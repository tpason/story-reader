"use client";

import { BookOpen, BookOpenCheck, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import React, { memo, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CursorPage, StorySummary } from "@/lib/types";
import { StoryCover } from "@/components/StoryCover";
import { storyHref } from "@/lib/urls";
import { CultivationPanel } from "@/components/CultivationPanel";
import { storyDisplayDescription, storyCategoryLabel } from "@/lib/story-description";
import { useAppSelector } from "@/lib/store-hooks";
import { useReadingProgressSync } from "@/hooks/useReadingProgressSync";
import { useStoryLibraryAdminEdit, type AdminStoryListEditField, type AdminStoryListEditState } from "@/hooks/useStoryLibraryAdminEdit";
import { useStoryLibraryFeed } from "@/hooks/useStoryLibraryFeed";

export type StoryLibraryMode = "default" | "search" | "browse";

type StoryLibraryProps = {
  initialPage: CursorPage<StorySummary>;
  /** @deprecated use `mode="search"` */
  searchActive?: boolean;
  mode?: StoryLibraryMode;
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

function updateCardTilt(event: ReactPointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  card.style.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
  card.style.setProperty("--tilt-y", `${(x - 0.5) * 10}deg`);
  card.style.setProperty("--tilt-glow-x", `${x * 100}%`);
  card.style.setProperty("--tilt-glow-y", `${y * 100}%`);
}

function resetCardTilt(event: ReactPointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  card.style.setProperty("--tilt-x", "0deg");
  card.style.setProperty("--tilt-y", "0deg");
  card.style.setProperty("--tilt-glow-x", "50%");
  card.style.setProperty("--tilt-glow-y", "50%");
}

function highlightText(text: string, term: string): React.ReactNode {
  if (!term || !text) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // split with capturing group → odd-indexed items are the matched portions
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
  priority?: boolean;
  onStartEdit: (story: StorySummary, field: AdminStoryListEditField, value: string | null | undefined) => void;
  onSetAdminEdit: (edit: AdminStoryListEditState) => void;
};

const StoryCard = memo(function StoryCard({ story, storyHistory, isAdmin, adminEditForCard, highlight, priority, onStartEdit, onSetAdminEdit }: StoryCardProps) {
  const newChapterCount = storyHistory ? Math.max(0, story.totalChapters - storyHistory.maxReadChapterNumber) : 0;
  const statusLabel = storyHistory
    ? newChapterCount > 0
      ? `Mới +${newChapterCount}`
      : "Đã đọc"
    : "Chưa đọc";
  const progressPercent = storyHistory && story.totalChapters > 0
    ? Math.min(100, Math.round((storyHistory.maxReadChapterNumber / story.totalChapters) * 100))
    : 0;

  return (
    <Link
      className="story-card"
      href={storyHistory ? storyHref(story, storyHistory.chapterNumber) : storyHref(story)}
      onPointerMove={updateCardTilt}
      onPointerLeave={resetCardTilt}
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
          {storyHistory ? <span>Tu luyện tiếp {storyHistory.chapterNumber}</span> : null}
          {story.isCompleted ? <span>Hoàn thành</span> : null}
          {story.rankPosition ? <span>#{story.rankPosition}</span> : null}
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
          <div className="story-progress-mini" aria-label={`Tiến độ ${progressPercent}%`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="story-card-cta">
            {storyHistory ? "Đọc tiếp" : "Chi tiết"}
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
});

export function StoryLibrary({ initialPage, searchActive = false, mode, query }: StoryLibraryProps) {
  const libraryMode: StoryLibraryMode = mode ?? (searchActive ? "search" : "default");
  const hideHomeExtras = libraryMode !== "default";
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

  const historyByStory = useMemo(() => new Map(history.map((item) => [item.storyId, item])), [history]);
  const recentItems = useMemo(() => history.slice(0, 6), [history]);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <BookOpen size={28} />
          <p>Linh Quyển Đại Thư chưa có linh quyển phù hợp.</p>
          <span>Thử thay đổi điều kiện tìm kiếm hoặc quay lại sau.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hideHomeExtras ? <CultivationPanel items={history} /> : null}

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

      {!hideHomeExtras && recentItems.length > 0 ? (
        <section className="continue-section" aria-label="Tu luyện tiếp">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Tu luyện tiếp</p>
              <h2>Hành trình đang đọc</h2>
            </div>
            <Link href="/reading-history">Tàng thư</Link>
          </div>
          <div className="continue-row">
            {recentItems.map((item) => (
              <Link className="continue-card" href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)} key={item.storyId}>
                <BookOpenCheck size={16} />
                <span>{item.storyTitle}</span>
                <small>Chương {item.chapterNumber}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="library-list-section" aria-label={libraryMode === "search" ? "Search results" : "Stories"}>
        <div className="section-heading-row story-list-heading">
          <div>
            <p className="eyebrow">{libraryMode === "search" ? "Kết quả" : "Thư viện"}</p>
            <h2>{libraryMode === "search" ? "Linh quyển tìm thấy" : "Danh sách truyện"}</h2>
          </div>
          <span className="discovery-badge">{initialPage.total ?? items.length} truyện</span>
        </div>

        <div className="story-grid">
          {items.map((story, index) => (
            <StoryCard
              key={story.id}
              story={story}
              storyHistory={historyByStory.get(story.id)}
              isAdmin={!!currentUser?.isAdmin}
              adminEditForCard={adminEdit?.storyId === story.id ? adminEdit : null}
              highlight={query.q || undefined}
              priority={index < 6}
              onStartEdit={startAdminEdit}
              onSetAdminEdit={setAdminEdit}
            />
          ))}
        </div>
      </section>

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
        ) : (
          "Đã xem hết Linh Quyển Đại Thư"
        )}
      </div>
    </>
  );
}
