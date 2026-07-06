import { Crown, Flame } from "lucide-react";
import type { StorySummary } from "@/lib/types";

type StoryRankMetaProps = {
  story: StorySummary;
  /** Compact labels for story cards in the library grid. */
  compact?: boolean;
};

export function StoryRankMeta({ story, compact = false }: StoryRankMetaProps) {
  const badges = [];

  if (story.readerRank != null && story.readerRank > 0) {
    badges.push(
      <span key="reader-rank" className="story-meta-icon-badge story-meta-rank story-meta-rank-betterbox">
        <Crown size={12} aria-hidden="true" />
        {compact ? `Thiên #${story.readerRank}` : `Thiên bảng #${story.readerRank}`}
      </span>,
    );
  }

  if (story.rankPosition != null && story.rankPosition > 0) {
    const crawlLabel = story.rankName?.trim();
    badges.push(
      <span key="crawl-rank" className="story-meta-icon-badge story-meta-rank story-meta-rank-source">
        <Flame size={12} aria-hidden="true" />
        {compact
          ? `#${story.rankPosition}`
          : crawlLabel
            ? `${crawlLabel} #${story.rankPosition}`
            : `Nguồn #${story.rankPosition}`}
      </span>,
    );
  }

  if (badges.length === 0) return null;
  return <>{badges}</>;
}
