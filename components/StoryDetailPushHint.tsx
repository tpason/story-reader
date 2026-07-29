"use client";

import { Feather, LoaderCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  enablePushNotifications,
  isPushApiSupported,
  isVapidConfigured,
  readPushSubscribed
} from "@/lib/push-client";
import { dismissStoryDetailPush, isStoryDetailPushDismissed } from "@/lib/story-detail-push";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";
import { useAppSelector } from "@/lib/store-hooks";

type StoryDetailPushHintProps = {
  storyId: string;
  /** Boost visibility right after a realtime chapter update on this story. */
  boosted?: boolean;
};

export function StoryDetailPushHint({ storyId, boosted = false }: StoryDetailPushHintProps) {
  const user = useAppSelector((state) => state.identity.user);
  const followed = useAppSelector((state) => state.follows.items.some((item) => item.storyId === storyId));
  const maxRead = useAppSelector(
    (state) => state.history.items.find((item) => item.storyId === storyId)?.maxReadChapterNumber ?? 0
  );
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    dismissedRef.current = false;
  }, [storyId]);

  useEffect(() => {
    if (!user) {
      setVisible(false);
      return;
    }
    // Honor dismiss even when boosted (fresh chapter) — otherwise close looks broken.
    if (dismissedRef.current || isStoryDetailPushDismissed(storyId)) {
      dismissedRef.current = true;
      setVisible(false);
      return;
    }

    let cancelled = false;

    async function resolve() {
      if (!isPushApiSupported() || !(await isVapidConfigured())) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        if (await readPushSubscribed(reg)) return;
      } catch {
        return;
      }
      if (cancelled || dismissedRef.current || isStoryDetailPushDismissed(storyId)) return;
      if (!followed && maxRead <= 0 && !boosted) return;
      if (!cancelled && !dismissedRef.current) setVisible(true);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [boosted, followed, maxRead, storyId, user]);

  function dismiss(event?: { preventDefault(): void; stopPropagation(): void }) {
    event?.preventDefault();
    event?.stopPropagation();
    dismissedRef.current = true;
    try {
      dismissStoryDetailPush(storyId);
    } catch {
      // still hide this mount via dismissedRef
    }
    setVisible(false);
  }

  useEffect(() => {
    if (!visible || loading) return;
    const timer = window.setTimeout(() => dismiss(), 15_000);
    return () => window.clearTimeout(timer);
  }, [visible, loading, storyId]);

  if (!visible) return null;

  async function enable() {
    setLoading(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="story-detail-push-hint" role="note" aria-label="Gợi ý bật linh tin">
      <Sparkles size={16} aria-hidden="true" />
      <div className="story-detail-push-hint-copy">
        <strong>{NOTIFY_COPY.pushTitle}</strong>
        <span>Nhận linh tin khi truyện này có chương mới, kể cả khi đóng tab.</span>
        <button type="button" className="story-detail-push-hint-cta" onClick={enable} disabled={loading}>
          {loading ? <LoaderCircle size={14} className="spin" /> : <Feather size={14} />}
          {loading ? "Đang bật…" : NOTIFY_COPY.pushCta}
        </button>
      </div>
      <button
        type="button"
        className="story-detail-push-hint-close"
        aria-label="Đóng"
        onClick={dismiss}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </aside>
  );
}
