"use client";

import { Bell, BookOpenCheck, Check, CheckCheck, Feather, ScrollText, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, type MouseEvent, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryCover } from "@/components/StoryCover";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import {
  computeNotificationUnread,
  effectiveMaxReadForNotify,
  isNotificationStoryVisible,
  markAllNotificationsCaughtUp,
  markNotificationCaughtUp
} from "@/lib/notification-caught-up";
import { useNotificationCaughtUp } from "@/lib/useNotificationCaughtUp";
import { fetchReadingProgress } from "@/lib/api-client";
import { historyToFollowItem } from "@/lib/follows";
import { mergeHistoryItems } from "@/lib/store";
import { type ReadingHistoryItem } from "@/lib/reading-history";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";
import { storyHref } from "@/lib/urls";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

const MotionFX = dynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX), { ssr: false });

type UpdateEntry = {
  item: ReturnType<typeof historyToFollowItem>;
  progress: ReadingHistoryItem | undefined;
  unread: number;
  nextChapter: number | null;
};

function UpdateCard({ entry, fresh }: { entry: UpdateEntry; fresh: boolean }) {
  const { item, progress, unread, nextChapter } = entry;

  function dismissCaughtUp(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    markNotificationCaughtUp(item.storyId, item.totalChapters);
  }

  return (
    <article className={`update-card ${fresh ? "update-card-fresh" : ""}`.trim()}>
      <Link
        className="update-card-main"
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
          <p className="story-description update-card-cta">
            {nextChapter ? NOTIFY_COPY.readNext(nextChapter) : "Mở mục lục để bắt đầu đọc truyện này."}
          </p>
        </div>
        <BookOpenCheck size={18} className="update-card-icon" aria-hidden="true" />
      </Link>
      <div className="update-card-footer">
        <button
          type="button"
          className="update-caught-up-btn"
          title={NOTIFY_COPY.markCaughtUpHint}
          aria-label={NOTIFY_COPY.markCaughtUp}
          onClick={dismissCaughtUp}
        >
          <Check size={14} aria-hidden="true" />
          <span>{NOTIFY_COPY.markCaughtUp}</span>
        </button>
      </div>
    </article>
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
  const followsHydrated = useAppSelector((state) => state.follows.hydrated);
  const historyHydrated = useAppSelector((state) => state.history.hydrated);
  const { isFresh } = useFreshStoryRealtime({ refreshProgress: true });
  const historyByStory = useMemo(() => new Map(history.map((item) => [item.storyId, item])), [history]);
  const followIdSet = useMemo(() => new Set(follows.map((item) => item.storyId)), [follows]);

  const caughtUpMap = useNotificationCaughtUp();

  useEffect(() => {
    fetchReadingProgress()
      .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
      .catch(() => undefined);
  }, [dispatch]);

  const updates = useMemo(() => {
    const byStory = new Map(follows.map((item) => [item.storyId, item]));
    history.forEach((item) => {
      if (!byStory.has(item.storyId)) byStory.set(item.storyId, historyToFollowItem(item));
    });
    const progressMap = new Map(history.map((item) => [item.storyId, item]));
    return [...byStory.values()]
      .map((item) => {
        const progress = progressMap.get(item.storyId);
        const maxRead = progress?.maxReadChapterNumber ?? 0;
        if (!isNotificationStoryVisible(item.storyId, item.totalChapters, maxRead, caughtUpMap)) return null;
        const unread = computeNotificationUnread(item.storyId, item.totalChapters, maxRead, caughtUpMap);
        const effectiveRead = effectiveMaxReadForNotify(item.storyId, maxRead, caughtUpMap);
        return {
          item,
          progress,
          unread,
          nextChapter: unread > 0 ? Math.min(item.totalChapters, effectiveRead + 1) : null
        };
      })
      .filter((entry): entry is UpdateEntry => entry !== null && entry.unread > 0)
      .sort((a, b) => b.unread - a.unread || Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt));
  }, [caughtUpMap, follows, history]);

  const hasReading = (storyId: string) => (historyByStory.get(storyId)?.maxReadChapterNumber ?? 0) > 0;
  const readingUpdates = updates.filter((entry) => hasReading(entry.item.storyId));
  const followUpdates = updates.filter((entry) => followIdSet.has(entry.item.storyId) && !hasReading(entry.item.storyId));
  const showHydrateSlot = (!followsHydrated || !historyHydrated) && updates.length === 0 && follows.length === 0 && history.length === 0;

  function markAllCaughtUp() {
    if (!updates.length) return;
    markAllNotificationsCaughtUp(
      updates.map((entry) => ({ storyId: entry.item.storyId, totalChapters: entry.item.totalChapters }))
    );
  }

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap">
        <XiPageHeroStrip className="updates-header" eyebrow={<><Sparkles size={13} aria-hidden="true" />{NOTIFY_COPY.eyebrow}</>} title={NOTIFY_COPY.pageTitle} subtitle={NOTIFY_COPY.pageSubtitle}>
          <div className="updates-hero-actions">
            <div className="updates-summary">
              <Bell size={18} />
              <strong>{updates.length}</strong>
              <span>truyện có linh tin</span>
            </div>
            {updates.length > 0 ? (
              <button
                type="button"
                className="chip notification-mark-all-btn"
                title={NOTIFY_COPY.markAllCaughtUpHint}
                aria-label={NOTIFY_COPY.markAllCaughtUp}
                onClick={markAllCaughtUp}
              >
                <CheckCheck size={14} aria-hidden="true" />
                <span>{NOTIFY_COPY.markAllCaughtUp}</span>
              </button>
            ) : null}
            <Link className="chip chip-inverted" href="/following">
              Tủ truyện đầy đủ
            </Link>
          </div>
        </XiPageHeroStrip>

        {showHydrateSlot ? (
          <div className="updates-list" aria-busy="true" aria-label="Đang mở linh tin">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="update-card xi-skel-card" aria-hidden="true">
                <div className="update-card-main" style={{ display: "flex", gap: 14 }}>
                  <div className="xi-skel xi-skel-cover" />
                  <div style={{ flex: 1 }}>
                    <div className="xi-skel" style={{ height: 18, width: "70%", marginBottom: 10 }} />
                    <div className="xi-skel" style={{ height: 12, width: "45%", marginBottom: 8 }} />
                    <div className="xi-skel" style={{ height: 12, width: "55%" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : updates.length === 0 ? (
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
