"use client";

import { animate } from "animejs";
import { Feather, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import { storyHref } from "@/lib/urls";

export type ReaderChapterFreshHintState = {
  chapterNumber: number;
  kind: "next" | "current";
};

type ReaderChapterFreshHintProps = {
  storyId: string;
  storyTitle: string;
  hint: ReaderChapterFreshHintState | null;
  onDismiss: () => void;
};

export function ReaderChapterFreshHint({ storyId, storyTitle, hint, onDismiss }: ReaderChapterFreshHintProps) {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!hint || prefersReducedMotion() || !cardRef.current) return;
    animate(cardRef.current, {
      y: [18, 0],
      opacity: [0, 1],
      duration: 520,
      ease: "outExpo"
    });
  }, [hint]);

  if (!hint) return null;

  const copy =
    hint.kind === "next"
      ? {
          title: "Linh khí tụ hội",
          body: `Chương ${hint.chapterNumber} vừa ấn định — tiếp tục hành trình?`,
          href: storyHref({ id: storyId, title: storyTitle }, hint.chapterNumber),
          cta: `Đọc chương ${hint.chapterNumber}`
        }
      : {
          title: "Thiên thư cập nhật",
          body: `Nội dung chương ${hint.chapterNumber} vừa được polish lại.`,
          href: null as string | null,
          cta: null as string | null
        };

  return (
    <aside className="reader-chapter-fresh-hint" role="status" aria-live="polite" ref={cardRef}>
      <div className="reader-chapter-fresh-hint-glow" aria-hidden="true" />
      <Sparkles size={15} aria-hidden="true" />
      <div className="reader-chapter-fresh-hint-copy">
        <strong>{copy.title}</strong>
        <span>{copy.body}</span>
        {copy.href && copy.cta ? (
          <Link className="reader-chapter-fresh-hint-link" href={copy.href} onClick={onDismiss}>
            <Feather size={13} />
            {copy.cta}
          </Link>
        ) : (
          <button type="button" className="reader-chapter-fresh-hint-link" onClick={() => window.location.reload()}>
            Tải lại chương
          </button>
        )}
      </div>
      <button type="button" className="reader-chapter-fresh-hint-close" aria-label="Đóng" onClick={onDismiss}>
        <X size={14} />
      </button>
    </aside>
  );
}
