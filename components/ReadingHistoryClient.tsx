"use client";

import { BookMarked, BookOpen, ChevronRight, Clock, Flame, LoaderCircle, ScrollText, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryCover } from "@/components/StoryCover";
import { fetchBookmarks, fetchReadingProgressPage } from "@/lib/api-client";
import { storyHref } from "@/lib/urls";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { mergeBookmarkItems, mergeHistoryItems } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

import type { ReadingHistoryItem } from "@/lib/reading-history";

const MotionFX = dynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX), { ssr: false });
const CultivationPanel = dynamic(() => import("@/components/CultivationPanel").then((mod) => mod.CultivationPanel));

const PAGE_SIZE = 24;

function ReadingStats({
  items,
  storyCount
}: {
  items: ReadingHistoryItem[];
  /** Server total when paginating; falls back to loaded items. */
  storyCount?: number;
}) {
  const reduxStreak = useAppSelector((s) => s.readingStreak);
  if (items.length === 0 && !(storyCount && storyCount > 0)) return null;

  const totalChapters = items.reduce((s, i) => s + i.maxReadChapterNumber, 0);
  const completedStories = items.filter(
    (i) => i.totalChapters > 0 && i.maxReadChapterNumber >= i.totalChapters
  ).length;
  const estimatedMinutes = Math.round(totalChapters * 8);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMins = estimatedMinutes % 60;
  const timeLabel =
    estimatedHours > 0
      ? `${estimatedHours}h${remainingMins > 0 ? ` ${remainingMins}p` : ""}`
      : `${estimatedMinutes}p`;

  const streak = reduxStreak.currentStreak;
  const readToday = reduxStreak.lastReadDate === new Date().toISOString().slice(0, 10);
  const storiesLabel = storyCount && storyCount > items.length ? storyCount : items.length;

  return (
    <div className="reading-stats-row" aria-label="Thống kê tu luyện">
      <div className="reading-stat-card">
        <BookOpen size={18} className="reading-stat-icon" />
        <strong>{storiesLabel}</strong>
        <span>truyện đang tu</span>
      </div>
      <div className="reading-stat-card">
        <Flame size={18} className="reading-stat-icon" />
        <strong>{totalChapters.toLocaleString("vi")}</strong>
        <span>chương hấp thu</span>
      </div>
      <div className="reading-stat-card">
        <Clock size={18} className="reading-stat-icon" />
        <strong>~{timeLabel}</strong>
        <span>thời gian tu luyện</span>
      </div>
      <div className="reading-stat-card">
        <Trophy size={18} className="reading-stat-icon" />
        <strong>{completedStories}</strong>
        <span>truyện hoàn thành</span>
      </div>
      <div className={`reading-stat-card reading-stat-streak ${streak >= 3 ? "reading-stat-streak-hot" : ""}`}>
        <ScrollText size={18} className="reading-stat-icon" />
        <strong>{streak}</strong>
        <span>
          {streak === 0
            ? "chưa đọc hôm nay"
            : streak === 1
              ? "ngày liên tiếp"
              : `ngày liên tiếp${readToday ? " · hôm nay đã tu" : ""}`}
        </span>
      </div>
    </div>
  );
}

function HistoryStoryCard({
  item,
  fresh
}: {
  item: ReadingHistoryItem;
  fresh: boolean;
}) {
  const progressPercent =
    item.totalChapters > 0 ? Math.min(100, Math.round((item.maxReadChapterNumber / item.totalChapters) * 100)) : 0;
  const newChapters =
    item.totalChapters > item.maxReadChapterNumber ? item.totalChapters - item.maxReadChapterNumber : 0;

  return (
    <Link
      className={`story-card ${fresh ? "story-card-fresh" : ""}`.trim()}
      href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)}
    >
      <StoryCover src={item.coverImageUrl} title={item.storyTitle} />
      <div className="story-card-body">
        <div className="story-card-heading">
          <div>
            <p className="story-card-kicker">
              <BookOpen size={12} />
              Chương {item.chapterNumber}
              {newChapters > 0 ? ` · Mới +${newChapters}` : ""}
            </p>
            <h2 className="story-card-title">{item.storyTitle}</h2>
          </div>
          <span className={`read-badge ${newChapters > 0 ? "read-badge-active" : ""}`}>
            {newChapters > 0 ? `+${newChapters}` : "Đã đọc"}
          </span>
        </div>
        <div className="story-meta">
          <span>{Math.round(item.progressPercent)}% hoàn thành</span>
          {item.totalChapters > 0 ? (
            <span>
              {item.maxReadChapterNumber}/{item.totalChapters} chương
            </span>
          ) : null}
        </div>
        {item.chapterTitle ? <p className="story-description">{item.chapterTitle}</p> : null}
        <div className="story-card-footer">
          <div className="story-progress-mini" aria-label={`Tiến độ ${progressPercent}%`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="story-card-cta">
            Đọc tiếp
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ReadingHistoryClient() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const localItems = useAppSelector((state) => state.history.items);
  const historyHydrated = useAppSelector((state) => state.history.hydrated);
  const bookmarks = useAppSelector((state) => state.bookmarks.items);
  const { isFresh } = useFreshStoryRealtime({ refreshProgress: true });

  const [feedItems, setFeedItems] = useState<ReadingHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [remoteTotal, setRemoteTotal] = useState<number | undefined>(undefined);
  const [localVisible, setLocalVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const loggedIn = Boolean(user);
  const waitingHydrate = !loggedIn && !historyHydrated && localItems.length === 0;
  const displayItems = useMemo(() => {
    if (loggedIn) return feedItems;
    return localItems.slice(0, localVisible);
  }, [feedItems, localItems, localVisible, loggedIn]);

  const hasMore = loggedIn ? Boolean(nextCursor) : localVisible < localItems.length;
  const statsItems = loggedIn ? feedItems : localItems;

  useEffect(() => {
    fetchBookmarks()
      .then((bookmarkItems) => dispatch(mergeBookmarkItems(bookmarkItems)))
      .catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEndReached(false);

    if (!loggedIn) {
      setFeedItems([]);
      setNextCursor(null);
      setRemoteTotal(undefined);
      setLocalVisible(PAGE_SIZE);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    fetchReadingProgressPage({ limit: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        setFeedItems(page.items);
        setNextCursor(page.nextCursor);
        setRemoteTotal(page.total);
        setEndReached(!page.nextCursor);
        dispatch(mergeHistoryItems(page.items));
      })
      .catch(() => {
        if (cancelled) return;
        setFeedItems([]);
        setNextCursor(null);
        setRemoteTotal(undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, loggedIn, user?.id]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      if (!loggedIn) {
        setLocalVisible((count) => {
          const next = Math.min(localItems.length, count + PAGE_SIZE);
          if (next >= localItems.length) setEndReached(true);
          return next;
        });
        return;
      }
      if (!nextCursor) return;
      const page = await fetchReadingProgressPage({ cursor: nextCursor, limit: PAGE_SIZE });
      setFeedItems((prev) => {
        const seen = new Set(prev.map((item) => item.storyId));
        return [...prev, ...page.items.filter((item) => !seen.has(item.storyId))];
      });
      setNextCursor(page.nextCursor);
      setEndReached(!page.nextCursor);
      dispatch(mergeHistoryItems(page.items));
    } catch {
      // keep current list; user can scroll again
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [dispatch, hasMore, localItems.length, loggedIn, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "280px 0px", threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, displayItems.length]);

  useEffect(() => {
    if (!loggedIn && !hasMore && localItems.length > 0) setEndReached(true);
  }, [hasMore, localItems.length, loggedIn]);

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap history-wrap">
        <XiPageHeroStrip
          eyebrow={
            <>
              <ScrollText size={13} aria-hidden="true" />
              Tàng thư
            </>
          }
          title="Hành trình tu luyện của đạo hữu."
          subtitle="Tán tu lưu tiến độ trên trình duyệt. Khi nhập môn, tu vi và lịch sử đọc sẽ được khắc vào Thiên Thư."
        />

        <ReadingStats items={statsItems} storyCount={loggedIn ? remoteTotal : localItems.length} />

        <CultivationPanel items={statsItems} />

        {bookmarks.length > 0 ? (
          <section className="bookmark-section" aria-label="Dấu ấn đã lưu">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Dấu ấn</p>
                <h2>Bookmark thủ công</h2>
              </div>
              <span className="discovery-badge">{bookmarks.length} dấu</span>
            </div>
            <div className="bookmark-row">
              {bookmarks.slice(0, 12).map((item) => (
                <Link
                  className="bookmark-card"
                  href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)}
                  key={`${item.storyId}-${item.chapterNumber}`}
                  onClick={() => {
                    window.sessionStorage.setItem(
                      `reader:bookmark-scroll:${item.storyId}:${item.chapterNumber}`,
                      String(item.scrollPosition)
                    );
                  }}
                >
                  <BookMarked size={16} />
                  <span>{item.storyTitle}</span>
                  <small>
                    Chương {item.chapterNumber} · {Math.round(item.progressPercent)}%
                  </small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {loading || waitingHydrate ? (
          <div className="infinite-status">
            <LoaderCircle size={17} className="spin" />
            Đang tải lịch sử
          </div>
        ) : null}

        {!loading && !waitingHydrate && displayItems.length === 0 ? (
          <XianxiaEmptyState
            title="Tán tu chưa hấp thu chương nào trên trình duyệt này."
            hint="Mở một linh quyển và đọc vài chương. Hành trình sẽ hiện ở đây."
          />
        ) : null}

        <section className="story-grid" aria-label="Hành trình tu luyện">
          {displayItems.map((item) => (
            <HistoryStoryCard item={item} fresh={isFresh(item.storyId)} key={item.storyId} />
          ))}
        </section>

        {!loading && displayItems.length > 0 ? (
          <div className="infinite-status" ref={sentinelRef}>
            {loadingMore ? (
              <>
                <LoaderCircle size={17} className="spin" />
                Đang tải thêm…
              </>
            ) : hasMore ? (
              "Cuộn để tải thêm hành trình"
            ) : endReached ? (
              "Đã xem hết Tàng thư"
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
