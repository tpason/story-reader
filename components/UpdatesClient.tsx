"use client";

import { Bell, BookOpenCheck, Feather, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { fetchReadingProgress } from "@/lib/api-client";
import { historyToFollowItem } from "@/lib/follows";
import { mergeHistoryItems } from "@/lib/store";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";
import { storyHref } from "@/lib/urls";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

type UpdateEntry = {
  item: ReturnType<typeof historyToFollowItem>;
  progress: (typeof history)[number] | undefined;
  unread: number;
  nextChapter: number | null;
};

function UpdateCard({ entry, fresh }: { entry: UpdateEntry; fresh: boolean }) {
  const { item, progress, unread, nextChapter } = entry;
  return (
    <Link
      className={`update-card ${fresh ? "update-card-fresh" : ""}`.trim()}
      href={
        nextChapter
          ? storyHref({ id: item.storyId, title: item.storyTitle }, nextChapter)
          : storyHref({ id: item.storyId, title: item.storyTitle })
      }
    >
      <StoryCover src={item.coverImageUrl} title={item.storyTitle} />
      <div className="update-card-body">
        <div className="story-card-heading">
          <h2 className="story-card-title">{item.storyTitle}</h2>
          <span className="read-badge read-badge-active">{NOTIFY_COPY.unreadBadge(unread)}</span>
        </div>
        <div className="story-meta">
          {item.author ? <span>{item.author}</span> : null}
          {item.primaryCategoryName ? <span>{item.primaryCategoryName}</span> : null}
          <span>{item.totalChapters} chương</span>
          {progress ? <span>Đã đọc {progress.maxReadChapterNumber}</span> : <span>Chưa bắt đầu</span>}
        </div>
        <p className="story-description">
          {nextChapter ? NOTIFY_COPY.readNext(nextChapter) : "Mở mục lục để bắt đầu đọc truyện này."}
        </p>
      </div>
      <BookOpenCheck size={18} className="update-card-icon" />
    </Link>
  );
}

function UpdateSection({
  title,
  icon,
  entries,
  isFresh
}: {
  title: string;
  icon: ReactNode;
  entries: UpdateEntry[];
  isFresh: (storyId: string) => boolean;
}) {
  if (!entries.length) return null;
  return (
    <section className="updates-section" aria-label={title}>
      <h2 className="updates-section-title">
        {icon}
        {title}
      </h2>
      <div className="updates-list">
        {entries.map((entry) => (
          <UpdateCard entry={entry} fresh={isFresh(entry.item.storyId)} key={entry.item.storyId} />
        ))}
      </div>
    </section>
  );
}

export function UpdatesClient() {
  const dispatch = useAppDispatch();
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const { isFresh } = useFreshStoryRealtime({ refreshProgress: true });
  const historyByStory = new Map(history.map((item) => [item.storyId, item]));
  const followedByStory = new Map(follows.map((item) => [item.storyId, item]));
  const followIdSet = useMemo(() => new Set(follows.map((item) => item.storyId)), [follows]);

  useEffect(() => {
    fetchReadingProgress()
      .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
      .catch(() => undefined);
  }, [dispatch]);

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

  const hasReading = (storyId: string) => (historyByStory.get(storyId)?.maxReadChapterNumber ?? 0) > 0;
  const readingUpdates = updates.filter((entry) => hasReading(entry.item.storyId));
  const followUpdates = updates.filter((entry) => followIdSet.has(entry.item.storyId) && !hasReading(entry.item.storyId));

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
        <XiPageHeroStrip className="updates-header" eyebrow={<><Sparkles size={13} aria-hidden="true" />{NOTIFY_COPY.eyebrow}</>} title={NOTIFY_COPY.pageTitle} subtitle={NOTIFY_COPY.pageSubtitle}>
          <div className="updates-summary">
            <Bell size={18} />
            <strong>{updates.length}</strong>
            <span>truyện có linh tin</span>
          </div>
        </XiPageHeroStrip>

        {updates.length === 0 ? (
          <XianxiaEmptyState title={NOTIFY_COPY.empty} hint={NOTIFY_COPY.emptyHint} className="updates-empty" />
        ) : (
          <>
            <UpdateSection
              title={NOTIFY_COPY.sectionReading}
              icon={<ScrollText size={16} aria-hidden="true" />}
              entries={readingUpdates}
              isFresh={isFresh}
            />
            <UpdateSection
              title={NOTIFY_COPY.sectionFollow}
              icon={<Feather size={16} aria-hidden="true" />}
              entries={followUpdates}
              isFresh={isFresh}
            />
          </>
        )}
      </div>
    </main>
  );
}
