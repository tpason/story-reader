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
  const excerpt = blurb.length > 160 ? `${blurb.slice(0, 157).trim()}…` : blurb;
  const updated = formatRelativeActivity(story.updatedAt);
  const href = storyHref(story);

  return (
    <article className="home-featured" aria-label={`${kicker}: ${story.title}`}>
      <Link className="home-featured-cover-link" href={href}>
        <StoryCover src={story.coverImageUrl} title={story.title} className="home-featured-cover" priority />
      </Link>
      <div className="home-featured-body">
        <p className="home-featured-kicker">
          <Sparkles size={13} aria-hidden />
          {kicker}
        </p>
        <h2 className="home-featured-title">
          <Link href={href}>{story.title}</Link>
        </h2>
        <p className="home-featured-meta">
          <span>{storyCategoryLabel(story)}</span>
          {story.author ? <span>· {story.author}</span> : null}
          <span>· {story.totalChapters} chương</span>
          {story.isCompleted ? <span>· Hoàn thành</span> : null}
          {updated ? <span>· {updated}</span> : null}
        </p>
        <p className="home-featured-blurb">{excerpt}</p>
        <Link className="home-featured-cta" href={href}>
          <BookOpen size={15} aria-hidden />
          Đọc ngay
        </Link>
      </div>
    </article>
  );
}
