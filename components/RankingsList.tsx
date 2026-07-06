"use client";

import Link from "next/link";
import { Eye, ScrollText, Sparkles, Users } from "lucide-react";
import type { StoryTrendingItem, TrendingPeriod } from "@/lib/types";
import { StoryCover } from "@/components/StoryCover";
import { RankCalligraphySeal } from "@/components/RankCalligraphySeal";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { storyHref } from "@/lib/urls";

const PERIOD_LABELS: Record<TrendingPeriod, string> = {
  day: "Nhật bang",
  week: "Tuần bang",
  month: "Nguyệt bang",
  year: "Niên bang"
};

function formatReaders(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function formatReadTime(seconds: number) {
  if (seconds < 60) return `${seconds} khắc`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút tu đọc`;
  return `${(minutes / 60).toFixed(1)} giờ tu đọc`;
}

type RankingsListProps = {
  items: StoryTrendingItem[];
  variant?: "trending" | "betterbox" | "source";
  period?: TrendingPeriod;
  emptyTitle?: string;
};

function rankForStory(story: StoryTrendingItem, variant: RankingsListProps["variant"]) {
  return variant === "betterbox" ? story.readerRank ?? story.trendRank : story.trendRank;
}

function StatsRow({
  story,
  variant
}: {
  story: StoryTrendingItem;
  variant: NonNullable<RankingsListProps["variant"]>;
}) {
  if (variant === "trending") {
    return (
      <div className="rankings-stats">
        <span className="rankings-qi-pill">
          <Users size={13} aria-hidden />
          {formatReaders(story.uniqueMembers)} đạo hữu
        </span>
        {story.uniqueGuests > 0 ? (
          <span className="rankings-qi-pill rankings-qi-pill-guest">
            {formatReaders(story.uniqueGuests)} tán tu
          </span>
        ) : null}
        <span className="rankings-qi-pill">
          <Eye size={13} aria-hidden />
          {story.sessionCount} phiên
        </span>
        {story.readSeconds > 0 ? (
          <span className="rankings-qi-pill rankings-qi-pill-muted">{formatReadTime(story.readSeconds)}</span>
        ) : null}
      </div>
    );
  }

  if (variant === "betterbox") {
    return (
      <div className="rankings-stats">
        <span className="rankings-qi-pill">
          <Users size={13} aria-hidden />
          {formatReaders(story.readerCountTotal)} đạo hữu
        </span>
        {story.guestCountTotal > 0 ? (
          <span className="rankings-qi-pill rankings-qi-pill-guest">
            {formatReaders(story.guestCountTotal)} tán tu
          </span>
        ) : null}
        <span className="rankings-qi-pill rankings-qi-pill-muted">
          {formatReaders(story.readerCount30d)} đạo hữu · 30 ngày
        </span>
      </div>
    );
  }

  return (
    <div className="rankings-stats">
      {story.rankName ? <span className="rankings-qi-pill">{story.rankName}</span> : null}
      <span className="rankings-qi-pill rankings-qi-pill-muted">Nguồn {story.sourceCode}</span>
      {story.readerRank ? (
        <span className="rankings-qi-pill">
          <Sparkles size={12} aria-hidden />
          Thiên bang #{story.readerRank}
        </span>
      ) : null}
    </div>
  );
}

function PodiumCard({
  story,
  rank,
  variant,
  period
}: {
  story: StoryTrendingItem;
  rank: number;
  variant: NonNullable<RankingsListProps["variant"]>;
  period?: TrendingPeriod;
}) {
  const tier = rank <= 3 ? (["gold", "silver", "bronze"] as const)[rank - 1] : "jade";
  return (
    <article className={`rankings-podium-card rankings-podium-${tier}`}>
      <div className="rankings-podium-plinth" aria-hidden />
      <RankCalligraphySeal rank={rank} size="podium" />
      <Link className="rankings-podium-link" href={storyHref(story)}>
        <StoryCover src={story.coverImageUrl} title={story.title} className="rankings-podium-cover" />
        <h3>{story.title}</h3>
        <p className="rankings-meta">
          {story.primaryCategoryName ?? story.author ?? story.sourceCode}
          {story.isCompleted ? " · Đã tịnh viên" : ""}
        </p>
        <StatsRow story={story} variant={variant} />
      </Link>
      {variant === "trending" && period ? (
        <span className="rankings-period-badge">{PERIOD_LABELS[period]}</span>
      ) : null}
    </article>
  );
}

function RankingsPodium({
  items,
  variant,
  period
}: {
  items: StoryTrendingItem[];
  variant: NonNullable<RankingsListProps["variant"]>;
  period?: TrendingPeriod;
}) {
  const [first, second, third] = items;
  if (!first) return null;

  return (
    <div className="rankings-podium" aria-label="Tam hạng phong vân">
      {second ? (
        <PodiumCard story={second} rank={rankForStory(second, variant)} variant={variant} period={period} />
      ) : (
        <div className="rankings-podium-spacer" aria-hidden />
      )}
      <PodiumCard story={first} rank={rankForStory(first, variant)} variant={variant} period={period} />
      {third ? (
        <PodiumCard story={third} rank={rankForStory(third, variant)} variant={variant} period={period} />
      ) : (
        <div className="rankings-podium-spacer" aria-hidden />
      )}
    </div>
  );
}

export function RankingsList({ items, variant = "trending", period = "week", emptyTitle }: RankingsListProps) {
  if (!items.length) {
    return (
      <XianxiaEmptyState
        title={emptyTitle ?? "Thiên hạ yên tĩnh. Chưa có linh quyển lên bảng."}
        hint="Hãy là đạo hữu đầu tiên tu đọc, hoặc chờ Thiên Thư ghi nhận thêm phiên đọc."
      />
    );
  }

  const podiumItems = items.slice(0, 3);
  const restItems = items.slice(3);

  return (
    <div className="rankings-board">
      <div className="rankings-board-caption" aria-hidden>
        <ScrollText size={14} />
        <span>Phong vân bảng · linh khí tụ hội</span>
      </div>

      {podiumItems.length >= 2 ? (
        <RankingsPodium items={podiumItems} variant={variant} period={period} />
      ) : null}

      <ol className="rankings-list">
        {(podiumItems.length < 2 ? items : restItems).map((story) => {
          const rank = rankForStory(story, variant);
          return (
            <li key={story.id} className={`rankings-item${rank <= 3 ? " rankings-item-top" : ""}`}>
              <RankCalligraphySeal rank={rank} />
              <Link className="rankings-card" href={storyHref(story)}>
                <StoryCover src={story.coverImageUrl} title={story.title} className="rankings-cover" />
                <div className="rankings-body">
                  <h3>{story.title}</h3>
                  <p className="rankings-meta">
                    {story.primaryCategoryName ?? story.author ?? story.sourceCode}
                    {story.isCompleted ? " · Đã tịnh viên" : ""}
                  </p>
                  <StatsRow story={story} variant={variant} />
                </div>
              </Link>
              {variant === "trending" ? (
                <span className="rankings-period-badge">{PERIOD_LABELS[period]}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
