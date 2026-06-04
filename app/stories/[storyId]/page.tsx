import { notFound } from "next/navigation";
import { StoryDetailClient } from "@/components/StoryDetailClient";
import { getStory, listChapters, listRecommendedStories } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function StoryLanding({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  if (!isStoryUuid(storyId)) notFound();

  const [story, chapters, recommendations] = await Promise.all([
    getStory(storyId),
    listChapters(storyId, { pageSize: 80 }),
    listRecommendedStories(storyId, 8)
  ]);

  return <StoryDetailClient story={story} chapters={chapters.items} totalChapters={chapters.total} recommendations={recommendations} />;
}
