import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buildChapterMetadata } from "@/lib/metadata";
import { buildChapterArticleJsonLd } from "@/lib/json-ld";
import { JsonLdScript } from "@/components/JsonLdScript";
import { ReaderOfflineCacheProvider } from "@/components/reader/ReaderOfflineCacheProvider";
import { getCachedChapterHead, getCachedStory, getReaderPayload, getStory } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

/** Route `loading.tsx` covers RSC wait — no second skeleton while the client chunk loads. */
const ReaderClient = dynamic(() => import("@/components/ReaderClient").then((mod) => mod.ReaderClient));

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}): Promise<Metadata> {
  const { storyId: storyKey, chapterNumber } = await params;
  const storyId = storyKeyToId(storyKey);
  const parsedChapter = Number(chapterNumber);
  if (!isStoryUuid(storyId) || !Number.isInteger(parsedChapter) || parsedChapter < 1) return {};

  try {
    const user = await getCurrentUser();
    const [story, chapter] = await Promise.all([
      user ? getStory(storyId, { viewerUserId: user.id }) : getCachedStory(storyId),
      getCachedChapterHead(storyId, parsedChapter),
    ]);
    if (!chapter) return {};
    return buildChapterMetadata(story, chapter);
  } catch {
    return {};
  }
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}) {
  const { storyId: storyKey, chapterNumber } = await params;
  const storyId = storyKeyToId(storyKey);
  const parsedChapter = Number(chapterNumber);
  if (!isStoryUuid(storyId) || !Number.isInteger(parsedChapter) || parsedChapter < 1) notFound();

  const user = await getCurrentUser();
  const payload = await getReaderPayload(storyId, parsedChapter, {
    viewerUserId: user?.id
  });

  return (
    <>
      <JsonLdScript data={buildChapterArticleJsonLd(payload.story, payload.chapter)} />
      <ReaderOfflineCacheProvider storyId={payload.story.id}>
        <ReaderClient payload={payload} />
      </ReaderOfflineCacheProvider>
    </>
  );
}
