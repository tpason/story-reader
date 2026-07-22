import type { Route } from "next";
import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import { CoverRailSlide } from "@/components/CoverRailSlide";
import { TrendingPeriodChips } from "@/components/TrendingPeriodChips";
import { TRENDING_PERIOD_BANG_LABELS } from "@/lib/trending-period";
import type { StoryTrendingItem, TrendingPeriod } from "@/lib/types";
import { StoryCover } from "@/components/StoryCover";
import { RankCalligraphySeal } from "@/components/RankCalligraphySeal";
import { storyHref } from "@/lib/urls";

type TrendingStoriesPanelProps = {
  items: StoryTrendingItem[];
  period?: TrendingPeriod;
  hrefForPeriod?: (period: TrendingPeriod) => Route;
  /** Home bookstore: larger covers, quieter meta. */
  density?: "default" | "bookstore";
};

const RANK_TIER = ["gold", "silver", "bronze"] as const;

export function TrendingStoriesPanel({
  items,
  period = "week",
  hrefForPeriod,
  density = "default",
}: TrendingStoriesPanelProps) {
  const periodLabel = TRENDING_PERIOD_BANG_LABELS[period];
  const isBookstore = density === "bookstore";
  const sectionClass = [
    "trending-section",
    isBookstore ? "trending-section--bookstore" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!items.length) {
    return (
      <section className={`${sectionClass} trending-section-empty`} aria-label="Truyện thịnh hành">
        {hrefForPeriod ? <TrendingPeriodChips period={period} hrefForPeriod={hrefForPeriod} /> : null}
        <div className="section-heading-row">
          <div>
            <h2>Phong vân {periodLabel} · chưa có linh quyển lên bảng</h2>
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
    <section className={sectionClass} aria-label="Truyện thịnh hành">
      <div className="section-heading-row trending-heading-row">
        <div>
          <h2>
            {isBookstore ? (
              <>
                Phong vân {periodLabel}
                <span className="trending-heading-aside"> · đạo hữu tu đọc nhiều nhất</span>
              </>
            ) : (
              <>Phong vân {periodLabel} · đạo hữu tu đọc nhiều nhất</>
            )}
          </h2>
        </div>
        <Link className="chip chip-inverted rankings-home-cta" href={"/rankings?tab=trending&period=" + period as Route}>
          <Trophy size={14} aria-hidden />
          {isBookstore ? "Thiên bảng" : "Xem thiên bảng"}
        </Link>
      </div>

      {hrefForPeriod ? (
        <div className="trending-controls-row">
          <TrendingPeriodChips period={period} hrefForPeriod={hrefForPeriod} />
        </div>
      ) : null}

      <CoverRailSlide
        label={`Phong vân ${periodLabel}`}
        className="trending-cover-rail-slide"
      >
        {items.slice(0, 8).map((story, index) => {
          const tier = RANK_TIER[index] ?? "jade";
          const rank = index + 1;
          return (
            <Link
              key={story.id}
              className={`trending-card trending-card-${tier}`}
              href={storyHref(story)}
              role="listitem"
            >
              <span aria-hidden>
                <RankCalligraphySeal rank={rank} size="trending" />
              </span>
              <StoryCover src={story.coverImageUrl} title={story.title} />
              <div className="trending-card-body">
                <h3>{story.title}</h3>
                <small>
                  <Sparkles size={12} aria-hidden />
                  {story.uniqueMembers} đạo hữu
                  {story.uniqueGuests > 0 ? ` · ${story.uniqueGuests} tán tu` : ""}
                </small>
                {!isBookstore ? (
                  <span className="trending-card-sessions">{story.sessionCount} phiên tu đọc</span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </CoverRailSlide>
    </section>
  );
}
