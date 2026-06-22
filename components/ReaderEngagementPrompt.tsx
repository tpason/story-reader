"use client";

import { Bell, BellPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FollowButton } from "@/components/FollowButton";
import {
  dismissReaderEngagement,
  isReaderEngagementDismissed,
  READER_ENGAGE_MIN_CHAPTER
} from "@/lib/reader-engagement";
import {
  enablePushNotifications,
  isPushApiSupported,
  isVapidConfigured,
  readPushSubscribed
} from "@/lib/push-client";
import type { StorySummary } from "@/lib/types";
import { useAppSelector } from "@/lib/store-hooks";

type ReaderEngagementPromptProps = {
  story: StorySummary;
  chapterNumber: number;
  /** Hide while chapter fresh hint or other bottom promos are visible */
  suppressed?: boolean;
};

type PromptMode = "follow" | "push" | null;

export function ReaderEngagementPrompt({ story, chapterNumber, suppressed = false }: ReaderEngagementPromptProps) {
  const user = useAppSelector((state) => state.identity.user);
  const followed = useAppSelector((state) => state.follows.items.some((item) => item.storyId === story.id));
  const [mode, setMode] = useState<PromptMode>(null);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (suppressed || !user || chapterNumber < READER_ENGAGE_MIN_CHAPTER) {
      setMode(null);
      return;
    }
    if (isReaderEngagementDismissed(story.id)) {
      setMode(null);
      return;
    }

    let cancelled = false;

    async function resolveMode() {
      if (!followed) {
        if (!cancelled) setMode("follow");
        return;
      }
      if (!isPushApiSupported()) {
        if (!cancelled) setMode(null);
        return;
      }
      const vapid = await isVapidConfigured();
      if (!vapid) {
        if (!cancelled) setMode(null);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscribed = await readPushSubscribed(reg);
        if (!cancelled) setMode(subscribed ? null : "push");
      } catch {
        if (!cancelled) setMode(null);
      }
    }

    void resolveMode();
    return () => {
      cancelled = true;
    };
  }, [chapterNumber, followed, story.id, suppressed, user]);

  if (!mode || suppressed) return null;

  function dismiss() {
    dismissReaderEngagement(story.id);
    setMode(null);
  }

  async function enablePush() {
    setPushLoading(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) setMode(null);
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <aside className="reader-engagement-prompt" role="dialog" aria-label="Gợi ý theo dõi và thông báo">
      <div className="reader-engagement-prompt-glow" aria-hidden="true" />
      {mode === "follow" ? <BellPlus size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
      <div className="reader-engagement-prompt-copy">
        {mode === "follow" ? (
          <>
            <strong>Kết báo linh tin</strong>
            <span>Theo dõi truyện để nhận chương mới — kể cả khi đóng tab (sau khi bật thông báo ở Động phủ).</span>
            <FollowButton story={story} className="reader-engagement-follow" />
          </>
        ) : (
          <>
            <strong>Bật linh tin ngoài tab</strong>
            <span>Đạo hữu đang tu truyện này — bật thông báo để biết ngay khi có chương mới.</span>
            <button type="button" className="reader-engagement-push-btn" onClick={enablePush} disabled={pushLoading}>
              {pushLoading ? "Đang bật…" : "Bật thông báo chương mới"}
            </button>
          </>
        )}
      </div>
      <button type="button" className="reader-engagement-prompt-close" aria-label="Đóng" onClick={dismiss}>
        <X size={14} />
      </button>
    </aside>
  );
}
