"use client";

import { Feather, ScrollText, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { followStoryOnServer } from "@/lib/api-client";
import {
  READER_ENGAGE_AUTO_DISMISS_MS,
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
  theme?: string;
  suppressed?: boolean;
};

type PromptMode = "login" | "engage" | "push" | null;

export function ReaderEngagementPrompt({
  story,
  chapterNumber,
  theme = "light",
  suppressed = false
}: ReaderEngagementPromptProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const followed = useAppSelector((state) => state.follows.items.some((item) => item.storyId === story.id));
  const { engageReady } = useReaderEngageGate(chapterNumber);
  const [mode, setMode] = useState<PromptMode>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Session latch so in-flight resolveMode cannot revive the banner after close.
  const dismissedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    dismissedRef.current = false;
  }, [story.id]);

  useEffect(() => {
    if (suppressed || !engageReady) {
      setMode(null);
      return;
    }
    if (dismissedRef.current || isReaderEngagementDismissed(story.id)) {
      dismissedRef.current = true;
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
      if (cancelled || dismissedRef.current || isReaderEngagementDismissed(story.id)) {
        if (dismissedRef.current || isReaderEngagementDismissed(story.id)) setMode(null);
        return;
      }
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

  function dismiss(event?: { preventDefault(): void; stopPropagation(): void }) {
    event?.preventDefault();
    event?.stopPropagation();
    dismissedRef.current = true;
    try {
      dismissReaderEngagement(story.id);
    } catch {
      // private-mode / quota — still hide for this session via dismissedRef
    }
    setMode(null);
  }

  // Auto-close: banner was sticky forever; toast-style TTL + persist dismiss so it stays gone.
  useEffect(() => {
    if (!mode || suppressed || loading) return;
    const timer = window.setTimeout(() => dismiss(), READER_ENGAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [mode, suppressed, loading, story.id]);

  async function followAndEnablePush(event: { preventDefault(): void; stopPropagation(): void }) {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);
    try {
      if (!followed) {
        dispatch(followStory(storyToFollowItem(story)));
        const remote = await followStoryOnServer(story.id);
        if (remote.length > 0) dispatch(mergeFollows(remote));
      }
      await enablePushNotifications();
      dismissedRef.current = true;
      setMode(null);
    } finally {
      setLoading(false);
    }
  }

  async function enablePushOnly(event: { preventDefault(): void; stopPropagation(): void }) {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) {
        dismissedRef.current = true;
        setMode(null);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !mode || suppressed) return null;

  const icon =
    mode === "login" ? (
      <ScrollText size={16} aria-hidden="true" />
    ) : mode === "push" ? (
      <Feather size={16} aria-hidden="true" />
    ) : (
      <Sparkles size={16} aria-hidden="true" />
    );

  // Portal to body: escapes .reader-shell z-index:2 trap and chrome-hidden pointer-events:none.
  return createPortal(
    <aside
      className="reader-engagement-prompt reader-engagement-prompt-portal"
      data-theme={theme}
      role="dialog"
      aria-label="Gợi ý linh tin"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="reader-engagement-prompt-glow" aria-hidden="true" />
      {icon}
      <div className="reader-engagement-prompt-copy">
        {mode === "login" ? (
          <>
            <strong>{NOTIFY_COPY.engageLoginTitle}</strong>
            <span>{NOTIFY_COPY.engageLoginBody}</span>
            <Link
              className="reader-engagement-push-btn"
              href="/login"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {NOTIFY_COPY.engageLoginCta}
            </Link>
          </>
        ) : mode === "push" ? (
          <>
            <strong>{NOTIFY_COPY.pushTitle}</strong>
            <span>{NOTIFY_COPY.pushBody}</span>
            <button
              type="button"
              className="reader-engagement-push-btn"
              onClick={enablePushOnly}
              onPointerDown={(event) => event.stopPropagation()}
              disabled={loading}
            >
              {loading ? "Đang bật…" : NOTIFY_COPY.pushCta}
            </button>
          </>
        ) : (
          <>
            <strong>{NOTIFY_COPY.engageTitle}</strong>
            <span>{NOTIFY_COPY.engageBody}</span>
            <button
              type="button"
              className="reader-engagement-push-btn"
              onClick={followAndEnablePush}
              onPointerDown={(event) => event.stopPropagation()}
              disabled={loading}
            >
              {loading ? "Đang kết linh tin…" : NOTIFY_COPY.engageCta}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        className="reader-engagement-prompt-close"
        aria-label="Đóng"
        onClick={dismiss}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </aside>,
    document.body
  );
}
