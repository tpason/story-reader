import type { ChapterSummary, StorySummary } from "./types.ts";
import { absoluteSiteUrl } from "./seo-text.ts";
import { storyDisplayDescription } from "./story-description.ts";
import { storyHref } from "./urls.ts";

const SITE_NAME = "Linh Quyển Các";

function storyImage(story: Pick<StorySummary, "coverImageUrl">) {
  const url = story.coverImageUrl?.trim();
  if (!url) return undefined;
  return url.startsWith("http") ? url : absoluteSiteUrl(url.startsWith("/") ? url : `/${url}`);
}

export function buildStoryBookJsonLd(story: StorySummary) {
  const url = absoluteSiteUrl(storyHref(story));
  const image = storyImage(story);

  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: story.title,
    author: story.author ? { "@type": "Person", name: story.author } : undefined,
    description: storyDisplayDescription(story),
    url,
    image,
    inLanguage: "vi",
    publisher: { "@type": "Organization", name: SITE_NAME },
    numberOfPages: story.totalChapters > 0 ? story.totalChapters : undefined,
  };
}

export function buildChapterArticleJsonLd(
  story: StorySummary,
  chapter: Pick<ChapterSummary, "chapterNumber" | "title" | "updatedAt">
) {
  const chapterLabel = `Chương ${chapter.chapterNumber}${chapter.title ? `: ${chapter.title}` : ""}`;
  const url = absoluteSiteUrl(storyHref(story, chapter.chapterNumber));

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: chapterLabel,
    name: chapterLabel,
    isPartOf: {
      "@type": "Book",
      name: story.title,
      url: absoluteSiteUrl(storyHref(story)),
    },
    author: story.author ? { "@type": "Person", name: story.author } : undefined,
    url,
    inLanguage: "vi",
    dateModified: chapter.updatedAt ?? undefined,
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
}
