"use client";

import { animate } from "animejs";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions
} from "@floating-ui/react";
import { Bell, BellRing, Feather, LoaderCircle, ScrollText, Sparkles, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SpiritBurstCanvas } from "@/components/SpiritBurstCanvas";
import { useReaderRealtimeLive } from "@/components/ReaderRealtimeProvider";
import { prefersReducedMotion } from "@/lib/browser";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import type { FollowedStoryItem } from "@/lib/follows";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import type { ReadingHistoryItem } from "@/lib/reading-history";
import { useAppSelector } from "@/lib/store-hooks";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";
import { storyHref } from "@/lib/urls";

const ThreeNotificationOrb = dynamic(
  () => import("@/components/ThreeNotificationOrb").then((mod) => mod.ThreeNotificationOrb),
  { ssr: false }
);

type NotificationItem = {
  storyId: string;
  storyTitle: string;
  coverImageUrl: string | null;
  author: string | null;
  totalChapters: number;
  maxReadChapterNumber: number;
  unread: number;
  nextChapter: number | null;
  updatedAt: string;
};

type NotificationPayload = {
  items: NotificationItem[];
  unreadStories: number;
  unreadChapters: number;
  serverTime: string;
};

function buildNotificationUrl(history: ReadingHistoryItem[], follows: FollowedStoryItem[]) {
  const params = new URLSearchParams();
  const maxReadByStory = new Map(history.map((item) => [item.storyId, item.maxReadChapterNumber || item.chapterNumber || 0]));
  follows.forEach((item) => {
    if (!maxReadByStory.has(item.storyId)) maxReadByStory.set(item.storyId, 0);
  });
  const stories = [...maxReadByStory.entries()]
    .slice(0, 120)
    .map(([storyId, maxRead]) => `${storyId}:${maxRead}`)
    .join(",");
  if (stories) params.set("stories", stories);
  return `/api/notifications${params.size > 0 ? `?${params.toString()}` : ""}`;
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const history = useAppSelector((state) => state.history.items);
  const follows = useAppSelector((state) => state.follows.items);
  const userId = useAppSelector((state) => state.identity.user?.id ?? null);
  const [payload, setPayload] = useState<NotificationPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ allowCompact: true, compactMaxWidth: 720 });
  const unreadChapters = payload?.unreadChapters ?? 0;
  const storyIds = useMemo(() => follows.map((item) => item.storyId), [follows]);
  const followIds = useMemo(() => new Set(follows.map((item) => item.storyId)), [follows]);
  const readingIds = useMemo(
    () =>
      new Set(
        history
          .filter((item) => (item.maxReadChapterNumber || item.chapterNumber || 0) > 0)
          .map((item) => item.storyId)
      ),
    [history]
  );
  const { readingItems, followItems } = useMemo(() => {
    const items = payload?.items ?? [];
    const reading: NotificationItem[] = [];
    const followOnly: NotificationItem[] = [];
    for (const item of items) {
      if (readingIds.has(item.storyId)) reading.push(item);
      else if (followIds.has(item.storyId)) followOnly.push(item);
      else reading.push(item);
    }
    return { readingItems: reading.slice(0, 5), followItems: followOnly.slice(0, 5) };
  }, [followIds, payload?.items, readingIds]);
  const queryKey = useMemo(() => JSON.stringify({ userId, history: history.map((item) => [item.storyId, item.maxReadChapterNumber]), follows: storyIds }), [history, storyIds, userId]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(buildNotificationUrl(history, follows))
      .then((response) => {
        if (!response.ok) throw new Error("Cannot load notifications");
        return response.json() as Promise<NotificationPayload>;
      })
      .then(setPayload)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [follows, history]);

  const handleRealtimeEvent = useCallback(
    (event: ReaderRealtimeEvent) => {
      refresh();
      if (event.type !== "chapter_update" && event.type !== "story_update" && event.type !== "notification_update") {
        return;
      }
      setBurstKey((value) => value + 1);
    },
    [refresh]
  );

  const live = useReaderRealtimeLive();

  useReaderRealtimeListener(handleRealtimeEvent);

  useEffect(() => {
    refresh();
  }, [refresh, queryKey]);

  useEffect(() => {
    const pollMs = live ? 120_000 : 30_000;
    const timer = window.setInterval(refresh, pollMs);
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [live, refresh]);

  useEffect(() => {
    if (!open || prefersReducedMotion() || !panelRef.current) return;
    animate(panelRef.current, {
      y: [-8, 0],
      opacity: [0, 1],
      scale: [0.97, 1],
      duration: 420,
      ease: "outExpo"
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const { context, floatingStyles, refs } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-end",
    strategy: "fixed",
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate
  });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return (
    <>
      <div
        className={`notification-bell ${live ? "notification-bell-live" : ""} ${className}`.trim()}
        data-notification-live={live ? "true" : "false"}
      >
        <SpiritBurstCanvas trigger={decorativeWebglEnabled ? 0 : burstKey} className="notification-spirit-burst" />
        {decorativeWebglEnabled ? <ThreeNotificationOrb trigger={burstKey} className="notification-spirit-burst" /> : null}
        <button
          className="icon-button notification-trigger"
          type="button"
          aria-label={NOTIFY_COPY.bellAria}
          aria-expanded={open}
          ref={refs.setReference}
          {...getReferenceProps({
            onClick: () => setOpen((value) => !value)
          })}
        >
          {unreadChapters > 0 ? <BellRing size={17} /> : <Bell size={17} />}
          {unreadChapters > 0 ? <span className="notification-dot">{unreadChapters > 99 ? "99+" : unreadChapters}</span> : null}
        </button>

        {open ? (
          <FloatingPortal>
            <section
              className="notification-panel notification-panel-portal"
              aria-label={NOTIFY_COPY.panelTitle}
              ref={(node) => {
                refs.setFloating(node);
                panelRef.current = node;
              }}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <div className="notification-panel-header">
                <div>
                  <p className="eyebrow">
                    <Sparkles size={12} aria-hidden="true" />
                    {NOTIFY_COPY.eyebrow}
                  </p>
                  <h2>{NOTIFY_COPY.panelTitle}</h2>
                </div>
                <span className={`notification-live ${live ? "notification-live-on" : ""}`}>
                  {loading ? <LoaderCircle size={13} className="spin" /> : <Wifi size={13} />}
                  {live ? NOTIFY_COPY.live : NOTIFY_COPY.polling}
                </span>
              </div>

              {payload?.items.length ? (
                <div className="notification-sections">
                  {readingItems.length ? (
                    <div className="notification-section">
                      <h3 className="notification-section-title">
                        <ScrollText size={14} aria-hidden="true" />
                        {NOTIFY_COPY.sectionReading}
                      </h3>
                      <div className="notification-list">
                        {readingItems.map((item, index) => (
                          <Link
                            className="notification-item notification-item-animated"
                            href={
                              item.nextChapter
                                ? storyHref({ id: item.storyId, title: item.storyTitle }, item.nextChapter)
                                : storyHref({ id: item.storyId, title: item.storyTitle })
                            }
                            key={item.storyId}
                            style={{ animationDelay: `${index * 45}ms` }}
                            onClick={() => setOpen(false)}
                          >
                            <strong>{item.storyTitle}</strong>
                            <span>
                              {NOTIFY_COPY.unreadBadge(item.unread)} ·{" "}
                              {item.nextChapter ? NOTIFY_COPY.readNext(item.nextChapter) : "Mở từ đầu"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {followItems.length ? (
                    <div className="notification-section">
                      <h3 className="notification-section-title">
                        <Feather size={14} aria-hidden="true" />
                        {NOTIFY_COPY.sectionFollow}
                      </h3>
                      <div className="notification-list">
                        {followItems.map((item, index) => (
                          <Link
                            className="notification-item notification-item-animated"
                            href={
                              item.nextChapter
                                ? storyHref({ id: item.storyId, title: item.storyTitle }, item.nextChapter)
                                : storyHref({ id: item.storyId, title: item.storyTitle })
                            }
                            key={item.storyId}
                            style={{ animationDelay: `${(readingItems.length + index) * 45}ms` }}
                            onClick={() => setOpen(false)}
                          >
                            <strong>{item.storyTitle}</strong>
                            <span>
                              {NOTIFY_COPY.unreadBadge(item.unread)} ·{" "}
                              {item.nextChapter ? NOTIFY_COPY.readNext(item.nextChapter) : "Mở từ đầu"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="notification-empty">{NOTIFY_COPY.empty}</p>
              )}

              <Link className="notification-more" href="/updates" onClick={() => setOpen(false)}>
                <ScrollText size={14} aria-hidden="true" />
                {NOTIFY_COPY.viewAll}
              </Link>
            </section>
          </FloatingPortal>
        ) : null}
      </div>
    </>
  );
}
