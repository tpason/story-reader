"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { StoryCover } from "@/components/StoryCover";
import { useAppSelector } from "@/lib/store-hooks";
import { storyHref } from "@/lib/urls";

type RecommendationItem = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  totalChapters: number;
  primaryCategoryName: string | null;
};

export function HomeRecommendationsPanel() {
  const user = useAppSelector((s) => s.identity.user);
  const hydrated = useAppSelector((s) => s.identity.hydrated);

  const { data, isLoading } = useQuery<{ items: RecommendationItem[] }>({
    queryKey: ["home-recommendations"],
    queryFn: () => fetch("/api/reader/recommendations").then((r) => r.json()),
    enabled: hydrated && !!user,
    staleTime: 5 * 60_000,
  });

  if (!hydrated) return null;
  if (!user) return null;
  if (isLoading) return <RecommendationsSkeleton />;
  if (!data?.items?.length) return null;

  return (
    <section className="recommendations-section" aria-label="Linh quyển dành riêng">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Dựa theo hành trình tu luyện</p>
          <h2>Linh quyển dành riêng</h2>
        </div>
      </div>
      <div className="recommendations-row">
        {data.items.slice(0, 6).map((story) => (
          <Link
            key={story.id}
            className="recommendation-card"
            href={storyHref(story)}
          >
            <StoryCover src={story.coverImageUrl} title={story.title} />
            <div className="recommendation-card-body">
              <h3>{story.title}</h3>
              <small>
                {story.primaryCategoryName ?? story.author ?? "Linh quyển"} · {story.totalChapters} chương
              </small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="recommendations-section" aria-hidden="true">
      <div className="section-heading-row">
        <div style={{ flex: 1 }}>
          <div className="xi-skel xi-skel-eyebrow" />
          <div className="xi-skel xi-skel-heading" />
        </div>
      </div>
      <div className="recommendations-row">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="recommendation-card xi-skel-card">
            <div className="xi-skel xi-skel-cover" />
            <div className="recommendation-card-body">
              <div className="xi-skel xi-skel-line" />
              <div className="xi-skel xi-skel-line xi-skel-line-short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
