"use client";

import { Clock3, Sparkles, WandSparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CoverRailSlide } from "@/components/CoverRailSlide";
import { StoryCover } from "@/components/StoryCover";
import { useCardTiltHandlers } from "@/hooks/useCardTiltHandlers";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { formatDiscoveryChapterLabel, formatRelativeActivity } from "@/lib/discovery-format";
import {
  DISCOVERY_POLISHED_KICKER,
  DISCOVERY_POLISHED_RAIL_TITLE,
  DISCOVERY_UPDATED_KICKER,
  discoveryPolishedChapterLabel
} from "@/lib/discovery-labels";
import { prefetchStorySummaryQuery } from "@/lib/reader-query";
import { storyDisplayDescription } from "@/lib/story-description";
import { resolveStoryStatusBadge } from "@/lib/story-status";
import type { StoryDiscoveryItem } from "@/lib/types";
import { storyHref } from "@/lib/urls";

type DiscoveryLayout = "list" | "coverRail";

type DiscoveryGroupProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: StoryDiscoveryItem[];
  variant: "polished" | "updated";
  href: Route;
  isFresh: (storyId: string) => boolean;
  layout: DiscoveryLayout;
};

type StoryDiscoveryRailProps = {
  polishedStories: StoryDiscoveryItem[];
  updatedStories: StoryDiscoveryItem[];
  /** Home bookstore: portrait cover rails. List keeps legacy row cards. */
  layout?: DiscoveryLayout;
};

function DiscoveryGroup({
  eyebrow,
  title,
  description,
  items,
  variant,
  href,
  isFresh,
  layout,
}: DiscoveryGroupProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tiltHandlers = useCardTiltHandlers(0.9);
  if (items.length === 0) return null;

  const Icon = variant === "polished" ? WandSparkles : Clock3;
  const isCoverRail = layout === "coverRail";

  function warmStoryNav(story: StoryDiscoveryItem) {
    const target = storyHref(story);
    router.prefetch(target);
    void prefetchStorySummaryQuery(queryClient, story.id);
  }

  return (
    <section
      className={`discovery-panel discovery-panel-${variant}${isCoverRail ? " discovery-panel--cover-rail" : ""}`}
      aria-label={title}
    >
      <div className="section-heading-row discovery-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {!isCoverRail ? <p>{description}</p> : null}
        </div>
        <Link className="discovery-more" href={href}>
          <Icon size={15} />
          Xem thêm
        </Link>
      </div>

      {isCoverRail ? (
        <CoverRailSlide label={title} className="discovery-cover-rail-slide">
          {items.map((story) => (
            <Link
              className={`discovery-cover-card ${isFresh(story.id) ? "discovery-cover-card-fresh" : ""}`.trim()}
              href={storyHref(story)}
              key={`${variant}-${story.id}`}
              role="listitem"
              onMouseEnter={() => warmStoryNav(story)}
              onFocus={() => warmStoryNav(story)}
            >
              <StoryCover src={story.coverImageUrl} title={story.title} />
              <div className="discovery-cover-card-meta">
                <span className="discovery-cover-card-kicker">
                  {variant === "polished" ? DISCOVERY_POLISHED_KICKER : DISCOVERY_UPDATED_KICKER}
                </span>
                <h3>{story.title}</h3>
                <small>{formatRelativeActivity(story.latestActivityAt)}</small>
              </div>
            </Link>
          ))}
        </CoverRailSlide>
      ) : (
        <div className="discovery-row">
          {items.map((story) => (
            <Link
              className={`discovery-card ${isFresh(story.id) ? "discovery-card-fresh" : ""}`.trim()}
              href={storyHref(story)}
              key={`${variant}-${story.id}`}
              onMouseEnter={() => warmStoryNav(story)}
              onFocus={() => warmStoryNav(story)}
              {...tiltHandlers}
            >
              <StoryCover src={story.coverImageUrl} title={story.title} />
              <div className="discovery-card-body">
                <div className="discovery-kicker">
                  <span>{variant === "polished" ? DISCOVERY_POLISHED_KICKER : DISCOVERY_UPDATED_KICKER}</span>
                  <small>{formatRelativeActivity(story.latestActivityAt)}</small>
                </div>
                <h3>{story.title}</h3>
                <p>
                  {formatDiscoveryChapterLabel(story)} · {storyDisplayDescription(story)}
                </p>
                <div className="discovery-meta">
                  <span>{story.author || "Unknown author"}</span>
                  {story.polishedChapterCount > 0 ? (
                    <span>{discoveryPolishedChapterLabel(story.polishedChapterCount)}</span>
                  ) : null}
                  {resolveStoryStatusBadge(story).completed ? <span>Hoàn thành</span> : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const HOME_DISCOVERY_CARD_BUDGET = 6;

export function StoryDiscoveryRail({
  polishedStories,
  updatedStories,
  layout = "coverRail",
}: StoryDiscoveryRailProps) {
  const { isFresh } = useFreshStoryRealtime({ refreshRoute: true });
  const polished = polishedStories.slice(0, HOME_DISCOVERY_CARD_BUDGET);
  const updated = updatedStories.slice(0, HOME_DISCOVERY_CARD_BUDGET);

  if (polished.length === 0 && updated.length === 0) return null;

  return (
    <div className={`discovery-section${layout === "coverRail" ? " discovery-section--cover-rail" : ""}`}>
      <div className="discovery-section-title">
        <Sparkles size={17} />
        <span>Khám phá nhanh</span>
      </div>
      <div className="discovery-grid">
        <DiscoveryGroup
          eyebrow="Bản đọc mượt hơn"
          title={DISCOVERY_POLISHED_RAIL_TITLE}
          description="Ưu tiên các truyện đã có chương được làm sạch để đọc dễ chịu hơn."
          items={polished}
          variant="polished"
          href="/discover?kind=polished"
          isFresh={isFresh}
          layout={layout}
        />
        <DiscoveryGroup
          eyebrow="Theo dõi chương mới"
          title="Vừa cập nhật"
          description="Các truyện có chương mới tải về hoặc nội dung vừa thay đổi trong database."
          items={updated}
          variant="updated"
          href="/discover?kind=updated"
          isFresh={isFresh}
          layout={layout}
        />
      </div>
    </div>
  );
}
