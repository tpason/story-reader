"use client";

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
import { Bell, BellRing, LoaderCircle, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReaderRealtime } from "@/lib/useReaderRealtime";
import type { FollowedStoryItem } from "@/lib/follows";
import type { ReadingHistoryItem } from "@/lib/reading-history";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

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
  const unreadChapters = payload?.unreadChapters ?? 0;
  const storyIds = useMemo(() => follows.map((item) => item.storyId), [follows]);
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

  useEffect(() => {
    refresh();
  }, [refresh, queryKey]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 60000);
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const live = useReaderRealtime({
    userId,
    storyIds,
    onEvent: () => refresh()
  });

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
    <div className={`notification-bell ${className}`} data-notification-live={live ? "true" : "false"}>
      <button
        className="icon-button notification-trigger"
        type="button"
        aria-label="Thông báo chương mới"
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
            aria-label="Thông báo"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
          <div className="notification-panel-header">
            <div>
              <p className="eyebrow">Thông báo</p>
              <h2>Chương mới</h2>
            </div>
            <span className={`notification-live ${live ? "notification-live-on" : ""}`}>
              {loading ? <LoaderCircle size={13} className="spin" /> : <Wifi size={13} />}
              {live ? "Live" : "Polling"}
            </span>
          </div>

          {payload?.items.length ? (
            <div className="notification-list">
              {payload.items.slice(0, 6).map((item) => (
                <Link
                  className="notification-item"
                  href={item.nextChapter ? storyHref({ id: item.storyId, title: item.storyTitle }, item.nextChapter) : storyHref({ id: item.storyId, title: item.storyTitle })}
                  key={item.storyId}
                  onClick={() => setOpen(false)}
                >
                  <strong>{item.storyTitle}</strong>
                  <span>Mới +{item.unread} chương · đọc tiếp {item.nextChapter ? `chương ${item.nextChapter}` : "từ đầu"}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="notification-empty">Chưa có chương mới từ truyện đã theo dõi.</p>
          )}

          <Link className="notification-more" href="/updates" onClick={() => setOpen(false)}>
            Xem toàn bộ
          </Link>
          </section>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
