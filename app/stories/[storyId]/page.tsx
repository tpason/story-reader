import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StoryDetailClient } from "@/components/StoryDetailClient";
import {
  RecommendationsSkeleton,
  SameAuthorSkeleton,
  SameAuthorStoriesSection,
  StoryRecommendationsSection,
} from "@/components/story/StoryRecommendationSections";
import { getCurrentUser } from "@/lib/auth";
import { buildStoryMetadata } from "@/lib/metadata";
import { buildStoryBookJsonLd } from "@/lib/json-ld";
import { JsonLdScript } from "@/components/JsonLdScript";
import { getCachedStory, getCachedStoryChapterList, getStory, listChapters } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  if (!isStoryUuid(storyId)) return {};

  try {
    const user = await getCurrentUser();
    const story = await getStory(storyId, { viewerUserId: user?.id });
    return buildStoryMetadata(story);
  } catch {
    return {};
  }
}

export default async function StoryLanding({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  if (!isStoryUuid(storyId)) notFound();

  const user = await getCurrentUser();
  const [story, chapters] = await Promise.all([
    user ? getStory(storyId, { viewerUserId: user.id }) : getCachedStory(storyId),
    user
      ? listChapters(storyId, { pageSize: 80, viewerUserId: user.id })
      : getCachedStoryChapterList(storyId, 80),
  ]);

  return (
    <>
      <JsonLdScript data={buildStoryBookJsonLd(story)} />
      <StoryDetailClient
        story={story}
        chapters={chapters.items}
        totalChapters={chapters.total}
        recommendationsSlot={
          <Suspense fallback={<RecommendationsSkeleton />}>
            <StoryRecommendationsSection storyId={storyId} />
          </Suspense>
        }
        sameAuthorSlot={
          story.author ? (
            <Suspense fallback={<SameAuthorSkeleton />}>
              <SameAuthorStoriesSection author={story.author} excludeStoryId={storyId} />
            </Suspense>
          ) : null
        }
      />
    </>
  );
}
