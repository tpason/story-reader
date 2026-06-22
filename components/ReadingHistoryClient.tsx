"use client";

import { BookMarked, BookOpen, ChevronRight, Clock, Flame, LoaderCircle, ScrollText, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";
import { StoryCover } from "@/components/StoryCover";
import { fetchBookmarks, fetchReadingProgress } from "@/lib/api-client";
import { storyHref } from "@/lib/urls";
import { CultivationPanel } from "@/components/CultivationPanel";
import { MotionFX } from "@/components/MotionFX";
import { UserIdentity } from "@/components/UserIdentity";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { mergeBookmarkItems, mergeHistoryItems } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

import type { ReadingHistoryItem } from "@/lib/reading-history";

function ReadingStats({ items }: { items: ReadingHistoryItem[] }) {
  const reduxStreak = useAppSelector((s) => s.readingStreak);
  if (items.length === 0) return null;

  const totalChapters = items.reduce((s, i) => s + i.maxReadChapterNumber, 0);
  const completedStories = items.filter(
    (i) => i.totalChapters > 0 && i.maxReadChapterNumber >= i.totalChapters
  ).length;
  const estimatedMinutes = Math.round(totalChapters * 8);
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMins = estimatedMinutes % 60;
  const timeLabel = estimatedHours > 0
    ? `${estimatedHours}h${remainingMins > 0 ? ` ${remainingMins}p` : ""}`
    : `${estimatedMinutes}p`;

  const streak = reduxStreak.currentStreak;
  const readToday = reduxStreak.lastReadDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="reading-stats-row" aria-label="Thống kê tu luyện">
      <div className="reading-stat-card">
        <BookOpen size={18} className="reading-stat-icon" />
        <strong>{items.length}</strong>
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
        <Flame size={18} className={`reading-stat-icon ${streak >= 3 ? "reading-stat-icon-fire" : ""}`} />
        <strong>{streak}</strong>
        <span>
          {streak === 0
            ? "chưa đọc hôm nay"
            : streak === 1
            ? "ngày liên tiếp"
            : `ngày liên tiếp${readToday ? " 🔥" : ""}`}
        </span>
      </div>
    </div>
  );
}

export function ReadingHistoryClient() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.history.items);
  const bookmarks = useAppSelector((state) => state.bookmarks.items);
  const { isFresh } = useFreshStoryRealtime({ refreshProgress: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadingProgress()
      .then((progressItems) => {
        dispatch(mergeHistoryItems(progressItems));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    fetchBookmarks()
      .then((bookmarkItems) => dispatch(mergeBookmarkItems(bookmarkItems)))
      .catch(() => undefined);
  }, [dispatch]);

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Hành trình tu luyện</span>
        </Link>
        <nav className="topbar-nav" aria-label="History navigation">
          <Link href="/">Thư viện</Link>
          <Link href="/updates">Chương mới</Link>
        </nav>
        <ThemeToggle />
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

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

        <ReadingStats items={items} />

        <CultivationPanel items={items} />

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
                    window.sessionStorage.setItem(`reader:bookmark-scroll:${item.storyId}:${item.chapterNumber}`, String(item.scrollPosition));
                  }}
                >
                  <BookMarked size={16} />
                  <span>{item.storyTitle}</span>
                  <small>Chương {item.chapterNumber} · {Math.round(item.progressPercent)}%</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="infinite-status">
            <LoaderCircle size={17} className="spin" />
            Đang tải lịch sử
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <XianxiaEmptyState
            title="Tán tu chưa hấp thu chương nào trên trình duyệt này."
            hint="Mở một linh quyển và đọc vài chương — hành trình sẽ hiện ở đây."
          />
        ) : null}

        <section className="story-grid" aria-label="Hành trình tu luyện">
          {items.map((item) => {
            const progressPercent = item.totalChapters > 0
              ? Math.min(100, Math.round((item.maxReadChapterNumber / item.totalChapters) * 100))
              : 0;
            const newChapters = item.totalChapters > item.maxReadChapterNumber
              ? item.totalChapters - item.maxReadChapterNumber
              : 0;
            return (
              <Link
                className={`story-card ${isFresh(item.storyId) ? "story-card-fresh" : ""}`.trim()}
                href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)}
                key={item.storyId}
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
                    {item.totalChapters > 0 ? <span>{item.maxReadChapterNumber}/{item.totalChapters} chương</span> : null}
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
          })}
        </section>
      </div>
    </main>
  );
}
