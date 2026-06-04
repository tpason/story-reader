"use client";

import { animate } from "animejs";
import { BookOpenCheck, ChevronRight, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/browser";
import type { StorySummary } from "@/lib/types";

type Props = {
  story: StorySummary;
  chaptersRead: number;
  onDismiss: () => void;
};

const PARTICLE_COUNT = 18;

export function StoryCompletionOverlay({ story, chaptersRead, onDismiss }: Props) {
  const cardRef    = useRef<HTMLDivElement>(null);
  const sealRef    = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLHeadingElement>(null);

  // Lock body scroll while visible
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  // Entrance animations
  useEffect(() => {
    if (prefersReducedMotion()) return;

    if (cardRef.current) {
      animate(cardRef.current, {
        y: [48, 0],
        opacity: [0, 1],
        scale: [0.90, 1],
        duration: 720,
        ease: "outExpo"
      });
    }
    if (sealRef.current) {
      animate(sealRef.current, {
        scale: [0, 1.18, 0.96, 1],
        rotate: ["-180deg", "0deg"],
        duration: 900,
        delay: 180,
        ease: "outBack(1.4)"
      });
    }
    if (titleRef.current) {
      animate(titleRef.current, {
        opacity: [0, 1],
        y: [14, 0],
        duration: 560,
        delay: 380,
        ease: "outQuad"
      });
    }
  }, []);

  const totalMins = Math.round(chaptersRead * 8);
  const hours = Math.floor(totalMins / 60);
  const mins  = totalMins % 60;
  const timeLabel = hours > 0
    ? `${hours} giờ${mins > 0 ? ` ${mins} phút` : ""}`
    : `${totalMins} phút`;

  return (
    <div
      className="completion-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Hoàn thành truyện"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      {/* Floating qi particles */}
      <div className="completion-particles" aria-hidden="true">
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <span
            key={i}
            className="completion-particle"
            style={{ "--p-i": i, "--p-n": PARTICLE_COUNT } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Expanding rings from center */}
      <div className="completion-rings" aria-hidden="true">
        <span className="completion-ring completion-ring-1" />
        <span className="completion-ring completion-ring-2" />
        <span className="completion-ring completion-ring-3" />
      </div>

      {/* Main card */}
      <div className="completion-card" ref={cardRef}>
        <button
          className="completion-close"
          type="button"
          onClick={onDismiss}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Animated gold seal */}
        <div className="completion-seal" ref={sealRef} aria-hidden="true">
          <Sparkles size={28} />
          <span className="completion-seal-ring" />
        </div>

        <p className="completion-eyebrow">Tu Thành Chính Quả</p>

        <h2 className="completion-title" ref={titleRef}>
          {story.title}
        </h2>

        <p className="completion-subtitle">
          Đạo hữu đã hoàn tất hành trình qua{" "}
          <strong>{chaptersRead}</strong> chương
          {totalMins > 0 ? <> · ước tính <strong>~{timeLabel}</strong> tu luyện</> : null}
        </p>

        <div className="completion-stats">
          <div className="completion-stat">
            <BookOpenCheck size={14} />
            <span>{chaptersRead} chương hấp thu</span>
          </div>
          <div className="completion-stat">
            <Sparkles size={14} />
            <span>Truyện hoàn thành</span>
          </div>
        </div>

        <div className="completion-actions">
          <Link className="completion-cta-primary" href="/" onClick={onDismiss}>
            Tìm truyện mới
            <ChevronRight size={16} />
          </Link>
          <button className="completion-cta-secondary" type="button" onClick={onDismiss}>
            Ở lại chương này
          </button>
        </div>
      </div>
    </div>
  );
}
