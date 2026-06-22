"use client";

import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { formatAbsoluteActivity, formatDiscoveryChapterLabel } from "@/lib/discovery-format";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import type { StoryDiscoveryItem } from "@/lib/types";
import { storyHref } from "@/lib/urls";

type DiscoverListClientProps = {
  items: StoryDiscoveryItem[];
  kind: "polished" | "updated";
};

export function DiscoverListClient({ items, kind }: DiscoverListClientProps) {
  const { isFresh } = useFreshStoryRealtime({
    refreshProgress: true,
    refreshRoute: true,
    invalidateQueryKeys: [["home-recommendations"]]
  });

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <p>Chưa có truyện phù hợp với bộ lọc này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discover-list">
      {items.map((story) => (
        <Link
          className={`discover-list-card ${isFresh(story.id) ? "discover-list-card-fresh" : ""}`.trim()}
          href={storyHref(story)}
          key={story.id}
        >
          <StoryCover src={story.coverImageUrl} title={story.title} />
          <div>
            <div className="discovery-kicker">
              <span>{kind === "polished" ? "Vừa polish" : "Chương mới"}</span>
              <small>{formatAbsoluteActivity(story.latestActivityAt)}</small>
            </div>
            <h3>{story.title}</h3>
            <p>{formatDiscoveryChapterLabel(story)}</p>
            <div className="discovery-meta">
              <span>{story.author || "Unknown author"}</span>
              <span>{story.totalChapters} chương</span>
              {story.polishedChapterCount > 0 ? <span>{story.polishedChapterCount} chương polish</span> : null}
              {story.isCompleted ? <span>Hoàn thành</span> : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
