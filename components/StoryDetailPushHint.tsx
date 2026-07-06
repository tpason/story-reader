"use client";

import { Feather, LoaderCircle, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!user) {
      setVisible(false);
      return;
    }
    if (isStoryDetailPushDismissed(storyId) && !boosted) {
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
      if (!followed && maxRead <= 0 && !boosted) return;
      if (!cancelled) setVisible(true);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [boosted, followed, maxRead, storyId, user]);

  if (!visible) return null;

  function dismiss() {
    dismissStoryDetailPush(storyId);
    setVisible(false);
  }

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
      <button type="button" className="story-detail-push-hint-close" aria-label="Đóng" onClick={dismiss}>
        <X size={14} />
      </button>
    </aside>
  );
}
