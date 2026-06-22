"use client";

import { Feather, ScrollText, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { followStoryOnServer } from "@/lib/api-client";
import {
  dismissReaderEngagement,
  isReaderEngagementDismissed
} from "@/lib/reader-engagement";
import { useReaderEngageGate } from "@/lib/reader-engage-gate";
import {
  enablePushNotifications,
  isPushApiSupported,
  isVapidConfigured,
  readPushSubscribed
} from "@/lib/push-client";
import { storyToFollowItem } from "@/lib/follows";
import { followStory, mergeFollows } from "@/lib/store";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";
import type { StorySummary } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

type ReaderEngagementPromptProps = {
  story: StorySummary;
  chapterNumber: number;
  suppressed?: boolean;
};

type PromptMode = "login" | "engage" | "push" | null;

export function ReaderEngagementPrompt({ story, chapterNumber, suppressed = false }: ReaderEngagementPromptProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const followed = useAppSelector((state) => state.follows.items.some((item) => item.storyId === story.id));
  const { engageReady } = useReaderEngageGate(chapterNumber);
  const [mode, setMode] = useState<PromptMode>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (suppressed || !engageReady) {
      setMode(null);
      return;
    }
    if (isReaderEngagementDismissed(story.id)) {
      setMode(null);
      return;
    }

    if (!user) {
      setMode("login");
      return;
    }

    let cancelled = false;

    async function resolveMode() {
      const needsFollow = !followed;
      let needsPush = false;
      if (isPushApiSupported() && (await isVapidConfigured())) {
        try {
          const reg = await navigator.serviceWorker.ready;
          needsPush = !(await readPushSubscribed(reg));
        } catch {
          needsPush = false;
        }
      }
      if (cancelled) return;
      if (needsFollow || needsPush) {
        setMode(needsPush && !needsFollow ? "push" : "engage");
        return;
      }
      setMode(null);
    }

    void resolveMode();
    return () => {
      cancelled = true;
    };
  }, [engageReady, followed, story.id, suppressed, user]);

  if (!mode || suppressed) return null;

  function dismiss() {
    dismissReaderEngagement(story.id);
    setMode(null);
  }

  async function followAndEnablePush() {
    setLoading(true);
    try {
      if (!followed) {
        dispatch(followStory(storyToFollowItem(story)));
        const remote = await followStoryOnServer(story.id);
        if (remote.length > 0) dispatch(mergeFollows(remote));
      }
      await enablePushNotifications();
      setMode(null);
    } finally {
      setLoading(false);
    }
  }

  async function enablePushOnly() {
    setLoading(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) setMode(null);
    } finally {
      setLoading(false);
    }
  }

  const icon =
    mode === "login" ? (
      <ScrollText size={16} aria-hidden="true" />
    ) : mode === "push" ? (
      <Feather size={16} aria-hidden="true" />
    ) : (
      <Sparkles size={16} aria-hidden="true" />
    );

  return (
    <aside className="reader-engagement-prompt" role="dialog" aria-label="Gợi ý linh tin">
      <div className="reader-engagement-prompt-glow" aria-hidden="true" />
      {icon}
      <div className="reader-engagement-prompt-copy">
        {mode === "login" ? (
          <>
            <strong>{NOTIFY_COPY.engageLoginTitle}</strong>
            <span>{NOTIFY_COPY.engageLoginBody}</span>
            <Link className="reader-engagement-push-btn" href="/login">
              {NOTIFY_COPY.engageLoginCta}
            </Link>
          </>
        ) : mode === "push" ? (
          <>
            <strong>{NOTIFY_COPY.pushTitle}</strong>
            <span>{NOTIFY_COPY.pushBody}</span>
            <button type="button" className="reader-engagement-push-btn" onClick={enablePushOnly} disabled={loading}>
              {loading ? "Đang bật…" : NOTIFY_COPY.pushCta}
            </button>
          </>
        ) : (
          <>
            <strong>{NOTIFY_COPY.engageTitle}</strong>
            <span>{NOTIFY_COPY.engageBody}</span>
            <button type="button" className="reader-engagement-push-btn" onClick={followAndEnablePush} disabled={loading}>
              {loading ? "Đang kết linh tin…" : NOTIFY_COPY.engageCta}
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
