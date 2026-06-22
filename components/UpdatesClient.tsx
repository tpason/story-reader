"use client";

import { Bell, BookOpenCheck, Inbox } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchReadingProgress } from "@/lib/api-client";
import { historyToFollowItem } from "@/lib/follows";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { mergeHistoryItems } from "@/lib/store";
import { storyHref } from "@/lib/urls";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

const FRESH_CARD_MS = 9000;

export function UpdatesClient() {
  const dispatch = useAppDispatch();
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const [freshStoryIds, setFreshStoryIds] = useState<Set<string>>(() => new Set());
  const historyByStory = new Map(history.map((item) => [item.storyId, item]));
  const followedByStory = new Map(follows.map((item) => [item.storyId, item]));

  useEffect(() => {
    fetchReadingProgress()
      .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
      .catch(() => undefined);
  }, [dispatch]);

  const markStoryFresh = useCallback((storyId: string) => {
    setFreshStoryIds((current) => new Set(current).add(storyId));
    window.setTimeout(() => {
      setFreshStoryIds((current) => {
        if (!current.has(storyId)) return current;
        const next = new Set(current);
        next.delete(storyId);
        return next;
      });
    }, FRESH_CARD_MS);
  }, []);

  const handleRealtime = useCallback(
    (event: ReaderRealtimeEvent) => {
      if (!event.storyId) return;
      if (event.type === "chapter_update" || event.type === "story_update" || event.type === "notification_update") {
        markStoryFresh(event.storyId);
        if (event.type !== "notification_update") {
          fetchReadingProgress()
            .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
            .catch(() => undefined);
        }
      }
    },
    [dispatch, markStoryFresh]
  );

  useReaderRealtimeListener(handleRealtime);

  history.forEach((item) => {
    if (!followedByStory.has(item.storyId)) followedByStory.set(item.storyId, historyToFollowItem(item));
  });

  const updates = [...followedByStory.values()]
    .map((item) => {
      const progress = historyByStory.get(item.storyId);
      const maxRead = progress?.maxReadChapterNumber ?? 0;
      return {
        item,
        progress,
        unread: Math.max(0, item.totalChapters - maxRead),
        nextChapter: maxRead > 0 ? Math.min(item.totalChapters, maxRead + 1) : null
      };
    })
    .filter((entry) => entry.unread > 0)
    .sort((a, b) => b.unread - a.unread || Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt));

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <nav className="topbar-nav" aria-label="Updates navigation">
          <Link href="/">Thư viện</Link>
          <Link href="/reading-history">Tàng thư</Link>
        </nav>
        <ThemeToggle />
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

      <div className="page-wrap">
        <section className="library-header updates-header">
          <div>
            <p className="eyebrow">Thông báo chương</p>
            <h1 className="library-title">Chương mới từ truyện đã đọc và theo dõi.</h1>
            <p className="library-subtitle">Trang này gom truyện có chương chưa đọc dựa trên lịch sử đọc và danh sách theo dõi lưu trên thiết bị.</p>
          </div>
          <div className="updates-summary">
            <Bell size={18} />
            <strong>{updates.length}</strong>
            <span>truyện có chương mới</span>
          </div>
        </section>

        {updates.length === 0 ? (
          <div className="empty-state updates-empty">
            <div>
              <Inbox size={28} />
              <p>Chưa có chương mới từ các truyện đạo hữu đã đọc hoặc theo dõi.</p>
            </div>
          </div>
        ) : (
          <section className="updates-list" aria-label="Chương mới">
            {updates.map(({ item, progress, unread, nextChapter }) => (
              <Link
                className={`update-card ${freshStoryIds.has(item.storyId) ? "update-card-fresh" : ""}`.trim()}
                href={nextChapter ? storyHref({ id: item.storyId, title: item.storyTitle }, nextChapter) : storyHref({ id: item.storyId, title: item.storyTitle })}
                key={item.storyId}
              >
                <StoryCover src={item.coverImageUrl} title={item.storyTitle} />
                <div className="update-card-body">
                  <div className="story-card-heading">
                    <h2 className="story-card-title">{item.storyTitle}</h2>
                    <span className="read-badge read-badge-active">Mới +{unread}</span>
                  </div>
                  <div className="story-meta">
                    {item.author ? <span>{item.author}</span> : null}
                    {item.primaryCategoryName ? <span>{item.primaryCategoryName}</span> : null}
                    <span>{item.totalChapters} chương</span>
                    {progress ? <span>Đã đọc {progress.maxReadChapterNumber}</span> : <span>Chưa bắt đầu</span>}
                  </div>
                  <p className="story-description">
                    {nextChapter ? `Đọc tiếp chương ${nextChapter}` : "Mở mục lục để bắt đầu đọc truyện này."}
                  </p>
                </div>
                <BookOpenCheck size={18} className="update-card-icon" />
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
