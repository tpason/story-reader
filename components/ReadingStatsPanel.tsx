"use client";

import { BookOpen, Flame, Star, Trophy } from "lucide-react";
import { useMemo } from "react";
import { DEFAULT_WORDS_PER_CHAPTER, formatReadingDuration } from "@/lib/reading-estimate";
import { streakBonusXp } from "@/lib/reading-streak";
import { useAppSelector } from "@/lib/store-hooks";

export function ReadingStatsPanel() {
  const history = useAppSelector((s) => s.history.items);
  const streak = useAppSelector((s) => s.readingStreak);

  const stats = useMemo(() => {
    const totalStories = history.length;
    const totalChapters = history.reduce((sum, item) => sum + (item.maxReadChapterNumber ?? 0), 0);
    const estimatedWords = totalChapters * DEFAULT_WORDS_PER_CHAPTER;
    const estimatedMinutes = Math.round(estimatedWords / 100);
    const estimatedHours = Math.round(estimatedMinutes / 60);
    const streakXp = streakBonusXp(streak.currentStreak);

    return { totalStories, totalChapters, estimatedHours, streakXp };
  }, [history, streak.currentStreak]);

  return (
    <section className="reading-stats-panel" aria-label="Thống kê tu luyện">
      <p className="eyebrow">Thống kê</p>
      <h2 className="reading-stats-title">Lộ trình tu luyện</h2>
      <div className="reading-stats-grid">
        <div className="reading-stats-card">
          <BookOpen size={18} className="reading-stats-icon" />
          <strong>{stats.totalChapters.toLocaleString("vi-VN")}</strong>
          <span>chương đã hấp thu</span>
        </div>
        <div className="reading-stats-card">
          <Trophy size={18} className="reading-stats-icon" />
          <strong>{stats.totalStories}</strong>
          <span>truyện đã lĩnh ngộ</span>
        </div>
        <div className="reading-stats-card">
          <Flame size={18} className="reading-stats-icon reading-stats-icon-streak" />
          <strong>{streak.currentStreak}</strong>
          <span>ngày liên tiếp</span>
        </div>
        <div className="reading-stats-card">
          <Star size={18} className="reading-stats-icon reading-stats-icon-best" />
          <strong>{streak.bestStreak}</strong>
          <span>ngày kỷ lục</span>
        </div>
      </div>
      {stats.estimatedHours > 0 ? (
        <p className="reading-stats-time">
          Ước tính đã bỏ ra{" "}
          <strong>{formatReadingDuration(stats.estimatedHours * 60)}</strong>{" "}
          trên hành trình tu đạo
        </p>
      ) : null}
      {streak.totalDaysRead > 0 ? (
        <p className="reading-stats-days">
          Tổng <strong>{streak.totalDaysRead}</strong> ngày đã tu luyện
          {stats.streakXp > 0 ? ` · chuỗi hiện tại +${stats.streakXp} linh khí` : ""}
          {streak.bestStreak >= 7 ? ` · đã đạt chuỗi ${streak.bestStreak} ngày` : ""}
        </p>
      ) : null}
    </section>
  );
}
