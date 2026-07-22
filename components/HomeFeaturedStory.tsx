import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { StoryCover } from "@/components/StoryCover";
import { storyCategoryLabel, storyDisplayDescription } from "@/lib/story-description";
import { formatRelativeActivity } from "@/lib/content-timestamps";
import { storyHref } from "@/lib/urls";
import type { StorySummary } from "@/lib/types";

type HomeFeaturedStoryProps = {
  story: StorySummary;
  /** Short kicker, e.g. Phong vân / Mới tinh luyện */
  kicker?: string;
};

/** Single bookstore spotlight — fills desktop density without a marketing hero. */
export function HomeFeaturedStory({ story, kicker = "Linh quyển nổi" }: HomeFeaturedStoryProps) {
  const blurb = storyDisplayDescription(story);
  const excerpt = blurb.length > 120 ? `${blurb.slice(0, 117).trim()}…` : blurb;
  const updated = formatRelativeActivity(story.updatedAt);
  const href = storyHref(story);
  const meta = [
    storyCategoryLabel(story),
    `${story.totalChapters} chương`,
    story.isCompleted ? "Hoàn thành" : null,
    updated || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="home-featured" aria-label={`${kicker}: ${story.title}`}>
      <p className="home-featured-kicker">
        <Sparkles size={13} aria-hidden />
        {kicker}
      </p>

      <div className="home-featured-main">
        <Link className="home-featured-cover-link" href={href}>
          <StoryCover src={story.coverImageUrl} title={story.title} className="home-featured-cover" priority />
        </Link>
        <div className="home-featured-body">
          <h2 className="home-featured-title">
            <Link href={href}>{story.title}</Link>
          </h2>
          {story.author ? <p className="home-featured-author">{story.author}</p> : null}
          <p className="home-featured-meta">{meta}</p>
        </div>
      </div>

      <p className="home-featured-blurb">{excerpt}</p>

      <Link className="home-featured-cta" href={href}>
        <BookOpen size={15} aria-hidden />
        Đọc ngay
      </Link>
    </article>
  );
}
