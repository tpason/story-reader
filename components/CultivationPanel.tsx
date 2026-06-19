"use client";

import { animate } from "animejs";
import { Flame, Sparkles, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCurrentUser, fetchReadingProgress } from "@/lib/api-client";
import { prefersReducedMotion } from "@/lib/browser";
import { getCultivationState } from "@/lib/cultivation";
import { formatReadingDuration } from "@/lib/reading-estimate";
import type { ReadingHistoryItem } from "@/lib/reading-history";
import { mergeHistoryItems, setCurrentUser } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeCultivationAura = dynamic(() => import("@/components/ThreeCultivationAura").then((mod) => mod.ThreeCultivationAura), {
  ssr: false
});

type CultivationPanelProps = {
  items?: ReadingHistoryItem[];
  compact?: boolean;
  className?: string;
};

export function CultivationPanel({ items, compact = false, className = "" }: CultivationPanelProps) {
  const dispatch = useAppDispatch();
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ compactMaxWidth: 1099 });
  const storeHistory = useAppSelector((state) => state.history.items);
  const user = useAppSelector((state) => state.identity.user);
  const history = items ?? storeHistory;
  const isLoggedIn = Boolean(user);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sigilRef = useRef<HTMLDivElement | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  const breakthroughTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBreakthrough, setShowBreakthrough] = useState(false);

  useEffect(() => {
    if (items) return;
    fetchReadingProgress()
      .then((items) => dispatch(mergeHistoryItems(items)))
      .catch(() => undefined);
  }, [dispatch, items]);

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => dispatch(setCurrentUser(currentUser)))
      .catch(() => undefined);
  }, [dispatch]);

  const streak = useAppSelector((s) => s.readingStreak);
  const state = useMemo(() => getCultivationState(history, isLoggedIn), [history, isLoggedIn]);
  const estimatedReadingTime = state.estimatedMinutesToNextLevel
    ? formatReadingDuration(state.estimatedMinutesToNextLevel)
    : "";

  // Entrance animation
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) return;
    const animation = animate(panel, {
      opacity: [0, 1],
      y: [10, 0],
      duration: 520,
      ease: "outExpo"
    });
    return () => { animation.revert(); };
  }, []);

  // Sigil pulse on level change + breakthrough detection
  useEffect(() => {
    const sigil = sigilRef.current;

    // First render: just record level, no animation
    if (prevLevelRef.current === null) {
      prevLevelRef.current = state.level;
      return;
    }

    const levelIncreased = state.level > prevLevelRef.current;
    prevLevelRef.current = state.level;

    if (!sigil || prefersReducedMotion()) return;

    if (levelIncreased) {
      // Dramatic breakthrough spin
      animate(sigil, {
        scale: [1, 1.35, 0.9, 1.12, 1],
        rotate: [0, 360],
        duration: 1200,
        ease: "outElastic(1, .6)"
      });

      // Show breakthrough overlay
      setShowBreakthrough(true);
      if (breakthroughTimerRef.current) clearTimeout(breakthroughTimerRef.current);
      breakthroughTimerRef.current = setTimeout(() => setShowBreakthrough(false), 2800);
    } else {
      animate(sigil, {
        scale: [0.94, 1.04, 1],
        rotate: [-2, 2, 0],
        duration: 720,
        ease: "outElastic(1, .8)"
      });
    }
  }, [state.level]);

  useEffect(() => {
    return () => {
      if (breakthroughTimerRef.current) clearTimeout(breakthroughTimerRef.current);
    };
  }, []);

  if (compact) {
    return (
      <div className={`cultivation-pill ${className}`} ref={panelRef} title={`${state.xpIntoLevel}/${state.xpForLevel} linh khí`}>
        <span className="cultivation-dot" data-realm={state.realmImageKey} />
        <span>{state.identityLabel}</span>
        <strong>
          {state.realm} tầng {state.realmStage}
        </strong>
      </div>
    );
  }

  return (
    <section
      className={`cultivation-panel ${showBreakthrough ? "cultivation-panel-breakthrough" : ""} ${className}`}
      ref={panelRef}
      aria-label="Cultivation progress"
    >
      {decorativeWebglEnabled ? <ThreeCultivationAura realm={state.realmImageKey} level={state.level} progressPercent={state.progressPercent} /> : null}

      {showBreakthrough && (
        <div className="cultivation-breakthrough-fx" aria-hidden="true">
          <span className="cultivation-breakthrough-ring cultivation-breakthrough-ring-1" />
          <span className="cultivation-breakthrough-ring cultivation-breakthrough-ring-2" />
          <span className="cultivation-breakthrough-ring cultivation-breakthrough-ring-3" />
          <div className="cultivation-breakthrough-label">
            <Zap size={14} />
            Đột phá
          </div>
        </div>
      )}

      <div className="cultivation-sigil" data-realm={state.realmImageKey} ref={sigilRef} aria-hidden="true">
        <Sparkles size={24} />
      </div>
      <div className="cultivation-body">
        <div className="cultivation-heading">
          <div>
            <p className="eyebrow">{state.identityLabel}</p>
            <h2>
              {state.realm} tầng {state.realmStage}
            </h2>
          </div>
          <span className="cultivation-level">Lv.{state.level}</span>
        </div>

        <div className="cultivation-progress" aria-label={`${Math.round(state.progressPercent)}% linh khí`}>
          <span style={{ width: `${state.progressPercent}%` }} />
        </div>

        <div className="cultivation-stats">
          <span>
            <Flame size={14} />
            {state.xpIntoLevel}/{state.xpForLevel} linh khí
          </span>
          <span>{state.completedChapterCount} chương đã hấp thu</span>
          {streak.currentStreak > 0 ? (
            <span className="cultivation-streak">
              🔥 {streak.currentStreak} ngày liên tiếp
              {streak.bestStreak > streak.currentStreak ? ` · kỷ lục ${streak.bestStreak} ngày` : ""}
            </span>
          ) : null}
          <span>
            Đọc thêm {state.chaptersToNextLevel} chương để đột phá
            {estimatedReadingTime ? ` · khoảng ${estimatedReadingTime}` : ""}
          </span>
        </div>
      </div>
    </section>
  );
}
