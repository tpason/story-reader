import { notFound } from "next/navigation";
import { getReaderPayload } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";
import { ReaderClient } from "@/components/ReaderClient";

export const revalidate = 300;

export default async function ReaderPage({
  params
}: {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}) {
  const { storyId: storyKey, chapterNumber } = await params;
  const storyId = storyKeyToId(storyKey);
  const parsedChapter = Number(chapterNumber);
  if (!isStoryUuid(storyId) || !Number.isInteger(parsedChapter) || parsedChapter < 1) notFound();

  const payload = await getReaderPayload(storyId, parsedChapter);

  return <ReaderClient payload={payload} />;
}
