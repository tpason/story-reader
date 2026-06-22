"use client";

import { Clock3, Sparkles, WandSparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { PointerEvent as ReactPointerEvent } from "react";
import { StoryCover } from "@/components/StoryCover";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { formatDiscoveryChapterLabel, formatRelativeActivity } from "@/lib/discovery-format";
import { storyDisplayDescription } from "@/lib/story-description";
import type { StoryDiscoveryItem } from "@/lib/types";
import { storyHref } from "@/lib/urls";

type DiscoveryGroupProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: StoryDiscoveryItem[];
  variant: "polished" | "updated";
  href: Route;
  isFresh: (storyId: string) => boolean;
};

type StoryDiscoveryRailProps = {
  polishedStories: StoryDiscoveryItem[];
  updatedStories: StoryDiscoveryItem[];
};

function updateDiscoveryTilt(event: ReactPointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  card.style.setProperty("--tilt-x", `${(0.5 - y) * 8}deg`);
  card.style.setProperty("--tilt-y", `${(x - 0.5) * 9}deg`);
  card.style.setProperty("--tilt-glow-x", `${x * 100}%`);
  card.style.setProperty("--tilt-glow-y", `${y * 100}%`);
}

function resetDiscoveryTilt(event: ReactPointerEvent<HTMLElement>) {
  const card = event.currentTarget;
  card.style.setProperty("--tilt-x", "0deg");
  card.style.setProperty("--tilt-y", "0deg");
  card.style.setProperty("--tilt-glow-x", "50%");
  card.style.setProperty("--tilt-glow-y", "50%");
}

function DiscoveryGroup({ eyebrow, title, description, items, variant, href, isFresh }: DiscoveryGroupProps) {
  if (items.length === 0) return null;

  const Icon = variant === "polished" ? WandSparkles : Clock3;

  return (
    <section className={`discovery-panel discovery-panel-${variant}`} aria-label={title}>
      <div className="section-heading-row discovery-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Link className="discovery-more" href={href}>
          <Icon size={15} />
          Xem thêm
        </Link>
      </div>

      <div className="discovery-row">
        {items.map((story) => (
          <Link
            className={`discovery-card ${isFresh(story.id) ? "discovery-card-fresh" : ""}`.trim()}
            href={storyHref(story)}
            key={`${variant}-${story.id}`}
            onPointerMove={updateDiscoveryTilt}
            onPointerLeave={resetDiscoveryTilt}
          >
            <StoryCover src={story.coverImageUrl} title={story.title} />
            <div className="discovery-card-body">
              <div className="discovery-kicker">
                <span>{variant === "polished" ? "Vừa polish" : "Chương mới"}</span>
                <small>{formatRelativeActivity(story.latestActivityAt)}</small>
              </div>
              <h3>{story.title}</h3>
              <p>{formatDiscoveryChapterLabel(story)} · {storyDisplayDescription(story)}</p>
              <div className="discovery-meta">
                <span>{story.author || "Unknown author"}</span>
                {story.polishedChapterCount > 0 ? <span>{story.polishedChapterCount} chương polish</span> : null}
                {story.isCompleted ? <span>Hoàn thành</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StoryDiscoveryRail({ polishedStories, updatedStories }: StoryDiscoveryRailProps) {
  const { isFresh } = useFreshStoryRealtime({ refreshRoute: true });

  if (polishedStories.length === 0 && updatedStories.length === 0) return null;

  return (
    <div className="discovery-section">
      <div className="discovery-section-title">
        <Sparkles size={17} />
        <span>Khám phá nhanh</span>
      </div>
      <div className="discovery-grid">
        <DiscoveryGroup
          eyebrow="Bản đọc mượt hơn"
          title="Vừa được polish"
          description="Ưu tiên các truyện đã có chương được làm sạch để đọc dễ chịu hơn."
          items={polishedStories}
          variant="polished"
          href="/discover?kind=polished"
          isFresh={isFresh}
        />
        <DiscoveryGroup
          eyebrow="Theo dõi chương mới"
          title="Vừa cập nhật"
          description="Các truyện có chương mới tải về hoặc nội dung vừa thay đổi trong database."
          items={updatedStories}
          variant="updated"
          href="/discover?kind=updated"
          isFresh={isFresh}
        />
      </div>
    </div>
  );
}
