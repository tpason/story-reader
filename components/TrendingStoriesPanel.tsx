import type { Route } from "next";
import Link from "next/link";
import { ScrollText, Sparkles, Trophy } from "lucide-react";
import type { StoryTrendingItem, TrendingPeriod } from "@/lib/types";
import { StoryCover } from "@/components/StoryCover";
import { RankCalligraphySeal } from "@/components/RankCalligraphySeal";
import { storyHref } from "@/lib/urls";

type TrendingStoriesPanelProps = {
  items: StoryTrendingItem[];
  period?: TrendingPeriod;
};

const PERIOD_LABEL: Record<TrendingPeriod, string> = {
  day: "nhật bang",
  week: "tuần bang",
  month: "nguyệt bang",
  year: "niên bang"
};

const RANK_TIER = ["gold", "silver", "bronze"] as const;

export function TrendingStoriesPanel({ items, period = "week" }: TrendingStoriesPanelProps) {
  if (!items.length) {
    return (
      <section className="trending-section trending-section-empty" aria-label="Truyện thịnh hành">
        <div className="section-heading-row">
          <div>
            <h2>Phong vân {PERIOD_LABEL[period]} · chưa có linh quyển lên bảng</h2>
            <p className="trending-empty-copy">Tu đọc vài chương hoặc xem thiên bảng tích lũy để khám phá top truyện.</p>
          </div>
        </div>
        <div className="xianxia-empty-actions">
          <Link className="chip chip-inverted" href={"/rankings?tab=betterbox" as Route}>
            <Trophy size={14} aria-hidden />
            Thiên bảng
          </Link>
          <Link className="chip" href={"/rankings?tab=trending&period=" + period as Route}>
            Phong vân đầy đủ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="trending-section" aria-label="Truyện thịnh hành">
      <div className="section-heading-row">
        <div>
          <h2>Phong vân {PERIOD_LABEL[period]} · đạo hữu tu đọc nhiều nhất</h2>
        </div>
        <Link className="chip chip-inverted rankings-home-cta" href={"/rankings?tab=trending&period=" + period as Route}>
          <Trophy size={14} aria-hidden />
          Xem thiên bảng
        </Link>
      </div>

      <div className="trending-scroll-shell">
        <div className="trending-row">
          {items.slice(0, 8).map((story, index) => {
            const tier = RANK_TIER[index] ?? "jade";
            const rank = index + 1;
            return (
              <Link key={story.id} className={`trending-card trending-card-${tier}`} href={storyHref(story)}>
                {rank <= 3 ? (
                  <span aria-hidden>
                    <RankCalligraphySeal rank={rank} size="trending" />
                  </span>
                ) : (
                  <span className="trending-rank" aria-hidden>
                    <span className="trending-rank-glow" />
                    {rank}
                  </span>
                )}
                <StoryCover src={story.coverImageUrl} title={story.title} />
                <div className="trending-card-body">
                  <h3>{story.title}</h3>
                  <small>
                    <Sparkles size={12} aria-hidden />
                    {story.uniqueMembers} đạo hữu
                    {story.uniqueGuests > 0 ? ` · ${story.uniqueGuests} tán tu` : ""}
                  </small>
                  <span className="trending-card-sessions">{story.sessionCount} phiên tu đọc</span>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="trending-scroll-hint" aria-hidden>
          <ScrollText size={12} />
          Vuốt ngang để xem thêm hạng
        </p>
      </div>
    </section>
  );
}
