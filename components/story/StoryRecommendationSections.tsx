import { Sparkles, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { getCachedRecommendedStories, listStoriesCursor } from "@/lib/stories";
import type { StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";

export function RecommendationsSkeleton() {
  return (
    <section className="library-list-section" aria-hidden="true">
      <div className="section-heading-row story-list-heading" style={{ marginBottom: 16 }}>
        <div>
          <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 8 }} />
          <div className="xi-skel" style={{ height: 20, width: 160 }} />
        </div>
      </div>
      <div className="recommendation-row">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="recommendation-card xi-skel-card">
            <div className="xi-skel xi-skel-cover" />
            <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="xi-skel xi-skel-line" />
              <div className="xi-skel xi-skel-line xi-skel-line-mid" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function StoryRecommendationsSection({ storyId }: { storyId: string }) {
  const recommendations = await getCachedRecommendedStories(storyId, 8);
  if (recommendations.length === 0) return null;

  return (
    <section className="library-list-section" aria-label="Recommended stories">
      <div className="section-heading-row story-list-heading">
        <div>
          <p className="eyebrow">Đạo hữu trên con đường tương tự</p>
          <h2>Linh quyển cùng đạo</h2>
        </div>
        <span className="discovery-badge">
          <Sparkles size={15} />
          {recommendations.length} truyện
        </span>
      </div>
      <StoryRecommendationRow items={recommendations} />
    </section>
  );
}

export function SameAuthorSkeleton() {
  return (
    <section className="library-list-section" aria-hidden="true">
      <div className="section-heading-row story-list-heading" style={{ marginBottom: 16 }}>
        <div>
          <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 8 }} />
          <div className="xi-skel" style={{ height: 20, width: 200 }} />
        </div>
      </div>
      <div className="recommendation-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="recommendation-card xi-skel-card">
            <div className="xi-skel xi-skel-cover" />
            <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="xi-skel xi-skel-line" />
              <div className="xi-skel xi-skel-line xi-skel-line-mid" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function SameAuthorStoriesSection({
  author,
  excludeStoryId,
}: {
  author: string;
  excludeStoryId: string;
}) {
  const page = await listStoriesCursor({ author, limit: 9 });
  const others = page.items.filter((s) => s.id !== excludeStoryId).slice(0, 8);
  if (others.length === 0) return null;

  const authorHref = `/?author=${encodeURIComponent(author)}` as Route;

  return (
    <section className="library-list-section" aria-label={`Cùng tác giả ${author}`}>
      <div className="section-heading-row story-list-heading">
        <div>
          <p className="eyebrow">Cùng tác giả</p>
          <h2>
            <Link href={authorHref} className="same-author-link">
              <User size={16} aria-hidden="true" />
              {author}
            </Link>
          </h2>
        </div>
        <Link href={authorHref} className="discovery-badge same-author-more">
          <Sparkles size={15} />
          Xem tất cả
        </Link>
      </div>
      <StoryRecommendationRow items={others} />
    </section>
  );
}

function StoryRecommendationRow({ items }: { items: StorySummary[] }) {
  return (
    <div className="recommendation-row">
      {items.map((item) => (
        <Link className="recommendation-card" href={storyHref(item)} key={item.id}>
          <StoryCover src={item.coverImageUrl} title={item.title} />
          <div>
            <h3>{item.title}</h3>
            <div className="discovery-meta">
              {item.author ? <span>{item.author}</span> : null}
              <span>{item.totalChapters} chương</span>
              {item.primaryCategoryName ? <span>{item.primaryCategoryName}</span> : null}
              {item.isCompleted ? <span>Hoàn thành</span> : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
