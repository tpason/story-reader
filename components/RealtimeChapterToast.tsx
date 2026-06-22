"use client";

import { animate } from "animejs";
import { Feather, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { storyHref } from "@/lib/urls";

export type RealtimeToastPayload = {
  id: number;
  event: ReaderRealtimeEvent;
  storyTitle?: string;
};

type RealtimeChapterToastProps = {
  toast: RealtimeToastPayload | null;
  onDismiss: () => void;
};

function toastCopy(toast: RealtimeToastPayload) {
  const { event, storyTitle } = toast;
  if (event.type === "chapter_update" && storyTitle && event.chapterNumber) {
    return {
      title: "Linh tính dao động",
      body: `${storyTitle} · chương ${event.chapterNumber} vừa ấn định`,
      href: event.storyId
        ? storyHref({ id: event.storyId, title: storyTitle }, event.chapterNumber)
        : null
    };
  }
  if (event.type === "story_update" && (storyTitle || event.message)) {
    return {
      title: "Thiên cơ biến động",
      body: event.message || `${storyTitle ?? "Truyện theo dõi"} có cập nhật mới`,
      href: event.storyId && storyTitle ? storyHref({ id: event.storyId, title: storyTitle }) : null
    };
  }
  return {
    title: "Thiên thư rung chuyển",
    body: "Có chương mới từ truyện đang theo dõi",
    href: null as string | null
  };
}

export function RealtimeChapterToast({ toast, onDismiss }: RealtimeChapterToastProps) {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 5200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  useEffect(() => {
    if (!toast || prefersReducedMotion() || !cardRef.current) return;
    animate(cardRef.current, {
      x: [28, 0],
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 620,
      ease: "outExpo"
    });
  }, [toast]);

  if (!toast) return null;

  const copy = toastCopy(toast);

  return (
    <aside className="realtime-chapter-toast" role="status" aria-live="polite" ref={cardRef}>
      <div className="realtime-chapter-toast-glow" aria-hidden="true" />
      <div className="realtime-chapter-toast-icon" aria-hidden="true">
        <Sparkles size={16} />
      </div>
      <div className="realtime-chapter-toast-copy">
        <p className="realtime-chapter-toast-eyebrow">{copy.title}</p>
        <p className="realtime-chapter-toast-body">{copy.body}</p>
        {copy.href ? (
          <Link className="realtime-chapter-toast-link" href={copy.href} onClick={onDismiss}>
            <Feather size={13} />
            Tiếp tục đọc
          </Link>
        ) : null}
      </div>
      <button type="button" className="realtime-chapter-toast-close" aria-label="Đóng thông báo" onClick={onDismiss}>
        <X size={14} />
      </button>
    </aside>
  );
}
