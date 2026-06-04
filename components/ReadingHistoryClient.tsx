"use client";

import { BookMarked, BookOpen, Clock, Flame, LoaderCircle, Trophy } from "lucide-react";
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
import { mergeBookmarkItems, mergeHistoryItems } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

import type { ReadingHistoryItem } from "@/lib/reading-history";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcStreak(items: ReadingHistoryItem[]): number {
  if (items.length === 0) return 0;

  const dates = new Set(
    items
      .filter((i) => i.lastReadAt)
      .map((i) => dateKey(new Date(i.lastReadAt)))
  );

  const today = new Date();
  const todayKey = dateKey(today);
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const yesterdayKey = dateKey(yest);

  if (!dates.has(todayKey) && !dates.has(yesterdayKey)) return 0;

  const cursor = new Date(today);
  if (!dates.has(todayKey)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (dates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function ReadingStats({ items }: { items: ReadingHistoryItem[] }) {
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

  const streak = calcStreak(items);
  const readToday = items.some(
    (i) => i.lastReadAt && dateKey(new Date(i.lastReadAt)) === dateKey(new Date())
  );

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
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

      <div className="page-wrap history-wrap">
        <section className="library-header">
          <div>
            <p className="eyebrow">Tàng thư</p>
            <h1 className="library-title">Hành trình tu luyện của đạo hữu.</h1>
            <p className="library-subtitle">Tán tu lưu tiến độ trên trình duyệt. Khi nhập môn, tu vi và lịch sử đọc sẽ được khắc vào Thiên Thư.</p>
          </div>
        </section>

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
          <div className="empty-state">
            <p>Tán tu chưa hấp thu chương nào trên trình duyệt này.</p>
          </div>
        ) : null}

        <section className="story-grid" aria-label="Hành trình tu luyện">
          {items.map((item) => (
            <Link className="story-card" href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)} key={item.storyId}>
              <StoryCover src={item.coverImageUrl} title={item.storyTitle} />
              <div className="story-card-body">
                <h2 className="story-card-title">{item.storyTitle}</h2>
                <div className="story-meta">
                  <span>Tu luyện tiếp chương {item.chapterNumber}</span>
                  <span>{Math.round(item.progressPercent)}%</span>
                  {item.totalChapters > item.maxReadChapterNumber ? <span>Mới +{item.totalChapters - item.maxReadChapterNumber}</span> : <span>Đã đọc</span>}
                </div>
                {item.chapterTitle ? <p className="story-description">{item.chapterTitle}</p> : null}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
