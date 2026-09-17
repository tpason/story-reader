"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { StoryCover } from "@/components/StoryCover";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { formatAbsoluteActivity, formatDiscoveryChapterLabel } from "@/lib/discovery-format";
import {
  DISCOVERY_POLISHED_KICKER,
  DISCOVERY_UPDATED_KICKER,
  discoveryPolishedChapterLabel
} from "@/lib/discovery-labels";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { warmReaderNavLinkProps } from "@/lib/warm-reader-nav";
import { armStoryCoverViewTransition } from "@/lib/story-cover-view-transition";
import { resolveStoryStatusBadge } from "@/lib/story-status";
import type { StoryDiscoveryItem } from "@/lib/types";
import { storyHref } from "@/lib/urls";

type DiscoverListClientProps = {
  items: StoryDiscoveryItem[];
  kind: "polished" | "updated";
};

export function DiscoverListClient({ items, kind }: DiscoverListClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isFresh } = useFreshStoryRealtime({
    refreshProgress: true,
    refreshRoute: true,
    invalidateQueryKeys: [["home-recommendations"]]
  });

  if (items.length === 0) {
    return (
      <XianxiaEmptyState
        title="Thiên hạ yên tĩnh. Chưa có linh quyển phù hợp bộ lọc."
        hint="Thử đổi tab hoặc bỏ lọc Hôm nay."
      />
    );
  }

  const kicker = kind === "polished" ? DISCOVERY_POLISHED_KICKER : DISCOVERY_UPDATED_KICKER;

  return (
    <div className="discover-cover-grid xi-discover-shelf" role="list">
      {items.map((story) => {
        const href = storyHref(story);
        const warmProps = warmReaderNavLinkProps(router, queryClient, {
          href,
          storyId: story.id,
          warmChunk: false,
        });
        return (
        <Link
          className={`discover-cover-card ${isFresh(story.id) ? "discover-cover-card-fresh" : ""}`.trim()}
          href={href}
          key={story.id}
          role="listitem"
          {...warmProps}
          onClick={(event) => armStoryCoverViewTransition(event.currentTarget)}
        >
          <StoryCover src={story.coverImageUrl} title={story.title} variant="card" />
          <div className="discover-cover-card-meta">
            <div className="discover-cover-card-kicker-row">
              <span className="discover-cover-card-kicker">{kicker}</span>
              <small>{formatAbsoluteActivity(story.latestActivityAt)}</small>
            </div>
            <h3>{story.title}</h3>
            <p>{formatDiscoveryChapterLabel(story)}</p>
            <div className="discover-cover-card-foot">
              <span>{story.author || "Unknown author"}</span>
              {story.polishedChapterCount > 0 ? (
                <span>{discoveryPolishedChapterLabel(story.polishedChapterCount)}</span>
              ) : null}
              {resolveStoryStatusBadge(story).completed ? <span>Hoàn thành</span> : null}
            </div>
          </div>
        </Link>
        );
      })}
    </div>
  );
}
