import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReaderClient } from "@/components/ReaderClient";
import { buildChapterMetadata } from "@/lib/metadata";
import { buildChapterArticleJsonLd } from "@/lib/json-ld";
import { JsonLdScript } from "@/components/JsonLdScript";
import { getCachedChapterHead, getCachedStory, getReaderPayload } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

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
    const [story, chapter] = await Promise.all([
      getCachedStory(storyId),
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

  const payload = await getReaderPayload(storyId, parsedChapter);

  return (
    <>
      <JsonLdScript data={buildChapterArticleJsonLd(payload.story, payload.chapter)} />
      <ReaderClient payload={payload} />
    </>
  );
}
