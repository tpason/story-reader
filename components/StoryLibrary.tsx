"use client";

import { BookOpen, BookOpenCheck, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CursorPage, StorySummary } from "@/lib/types";
import { fetchReadingProgress } from "@/lib/api-client";
import { StoryCover } from "@/components/StoryCover";
import { storyHref } from "@/lib/urls";
import { CultivationPanel } from "@/components/CultivationPanel";
import { storyDisplayDescription, storyCategoryLabel } from "@/lib/story-description";
import { mergeHistoryItems, syncFollowedStories } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

type StoryLibraryProps = {
  initialPage: CursorPage<StorySummary>;
  query: {
    q?: string;
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

type AdminStoryListEditField = "storyTitle" | "author" | "description";
type AdminStoryListEditState = {
  storyId: string;
  field: AdminStoryListEditField;
  value: string;
} | null;

function apiUrl(cursor: string | null, query: StoryLibraryProps["query"]) {
  const params = new URLSearchParams();
  params.set("limit", "24");
  if (cursor) params.set("cursor", cursor);
  if (query.q) params.set("q", query.q);
  if (query.hot) params.set("hot", query.hot);
  if (query.completed) params.set("completed", query.completed);
  if (query.category) params.set("category", query.category);
  if (query.minChapters) params.set("minChapters", query.minChapters);
  if (query.maxChapters) params.set("maxChapters", query.maxChapters);
  if (query.hasPolished) params.set("hasPolished", query.hasPolished);
  if (query.hasAudio) params.set("hasAudio", query.hasAudio);
  if (query.sort) params.set("sort", query.sort);
  return `/api/stories?${params.toString()}`;
}

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

export function StoryLibrary({ initialPage, query }: StoryLibraryProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.identity.user);
  const history = useAppSelector((state) => state.history.items);
  const [adminEdit, setAdminEdit] = useState<AdminStoryListEditState>(null);
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(initialPage.items);
    setNextCursor(initialPage.nextCursor);
    setError(null);
  }, [initialPage]);

  useEffect(() => {
    if (items.length > 0) dispatch(syncFollowedStories(items));
  }, [dispatch, items]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReadingProgress(controller.signal)
      .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [dispatch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        setLoading(true);
        fetch(apiUrl(nextCursor, query))
          .then((response) => {
            if (!response.ok) throw new Error("Không tải được danh sách truyện");
            return response.json() as Promise<CursorPage<StorySummary>>;
          })
          .then((page) => {
            setItems((current) => [...current, ...page.items]);
            setNextCursor(page.nextCursor);
            setError(null);
          })
          .catch((fetchError: Error) => setError(fetchError.message))
          .finally(() => setLoading(false));
      },
      { rootMargin: "180px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, nextCursor, query]);

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

  function startAdminEdit(story: StorySummary, field: AdminStoryListEditField, value: string | null | undefined) {
    if (!currentUser?.isAdmin || adminEditSaving) return;
    setAdminEdit({ storyId: story.id, field, value: value ?? "" });
    setAdminEditError(null);
  }

  async function saveAdminEdit() {
    if (!adminEdit || !currentUser?.isAdmin) return;
    setAdminEditSaving(true);
    setAdminEditError(null);
    const previousItems = items;
    setItems((current) =>
      current.map((story) =>
        story.id === adminEdit.storyId
          ? {
              ...story,
              title: adminEdit.field === "storyTitle" ? adminEdit.value : story.title,
              author: adminEdit.field === "author" ? adminEdit.value : story.author,
              description: adminEdit.field === "description" ? adminEdit.value : story.description
            }
          : story
      )
    );
    const editing = adminEdit;
    setAdminEdit(null);

    try {
      const response = await fetch("/api/admin/reader-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: editing.storyId,
          ...(editing.field === "storyTitle" ? { storyTitle: editing.value } : {}),
          ...(editing.field === "author" ? { author: editing.value } : {}),
          ...(editing.field === "description" ? { description: editing.value } : {})
        })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Không lưu được chỉnh sửa.");
      }
      const refreshedResponse = await fetch(`/api/stories/${editing.storyId}`, { cache: "no-store" });
      if (refreshedResponse.ok) {
        const refreshed = (await refreshedResponse.json()) as StorySummary;
        setItems((current) => current.map((story) => (story.id === refreshed.id ? refreshed : story)));
        queryClient.setQueryData(["story", refreshed.id], refreshed);
      }
    } catch (saveError) {
      setItems(previousItems);
      setAdminEditError(saveError instanceof Error ? saveError.message : "Không lưu được chỉnh sửa.");
    } finally {
      setAdminEditSaving(false);
    }
  }

  return (
    <>
      <CultivationPanel items={history} />

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

      {recentItems.length > 0 ? (
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

      <section className="library-list-section" aria-label="Stories">
        <div className="section-heading-row story-list-heading">
          <div>
            <p className="eyebrow">Thư viện</p>
            <h2>Danh sách truyện</h2>
          </div>
          <span className="discovery-badge">{initialPage.total ?? items.length} truyện</span>
        </div>

        <div className="story-grid">
          {items.map((story) => {
            const storyHistory = historyByStory.get(story.id);
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
                key={story.id}
                onPointerMove={updateCardTilt}
                onPointerLeave={resetCardTilt}
              >
                <StoryCover src={story.coverImageUrl} title={story.title} />
                <div className="story-card-body">
                  <div className="story-card-heading">
                    <div>
                      <p className="story-card-kicker">
                        <Sparkles size={12} />
                        {storyCategoryLabel(story)}
                      </p>
                      {adminEdit?.storyId === story.id && adminEdit.field === "storyTitle" ? (
                        <input
                          className="admin-inline-input story-card-admin-input"
                          value={adminEdit.value}
                          autoFocus
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onChange={(event) => setAdminEdit({ storyId: story.id, field: "storyTitle", value: event.target.value })}
                        />
                      ) : (
                        <h2
                          className={currentUser?.isAdmin ? "story-card-title admin-editable-hidden" : "story-card-title"}
                          onClick={(event) => {
                            if (!currentUser?.isAdmin) return;
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            startAdminEdit(story, "storyTitle", story.title);
                          }}
                        >
                          {story.title}
                        </h2>
                      )}
                    </div>
                    <span className={`read-badge ${storyHistory ? "read-badge-active" : ""}`}>{statusLabel}</span>
                  </div>
                  <div className="story-meta">
                    {adminEdit?.storyId === story.id && adminEdit.field === "author" ? (
                      <input
                        className="admin-inline-input story-card-admin-input"
                        value={adminEdit.value}
                        autoFocus
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onChange={(event) => setAdminEdit({ storyId: story.id, field: "author", value: event.target.value })}
                      />
                    ) : (
                      <span
                        className={currentUser?.isAdmin ? "admin-editable-hidden" : undefined}
                        onClick={(event) => {
                          if (!currentUser?.isAdmin) return;
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          startAdminEdit(story, "author", story.author);
                        }}
                      >
                        {story.author || "Unknown author"}
                      </span>
                    )}
                    <span>{story.totalChapters} chương</span>
                    {storyHistory ? <span>Tu luyện tiếp {storyHistory.chapterNumber}</span> : null}
                    {story.isCompleted ? <span>Hoàn thành</span> : null}
                    {story.rankPosition ? <span>#{story.rankPosition}</span> : null}
                  </div>
                  {adminEdit?.storyId === story.id && adminEdit.field === "description" ? (
                    <textarea
                      className="admin-content-editor story-card-admin-description"
                      value={adminEdit.value}
                      autoFocus
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onChange={(event) => setAdminEdit({ storyId: story.id, field: "description", value: event.target.value })}
                    />
                  ) : (
                    <p
                      className={currentUser?.isAdmin ? "story-description admin-editable-hidden" : "story-description"}
                      onClick={(event) => {
                        if (!currentUser?.isAdmin) return;
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        startAdminEdit(story, "description", story.description ?? storyDisplayDescription(story));
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
          })}
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
