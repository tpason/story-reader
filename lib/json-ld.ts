import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_DESCRIPTION } from "./brand.ts";
import { formatChapterLabel } from "./chapter-title.ts";
import type { ChapterSummary, StorySummary } from "./types.ts";
import { absoluteSiteUrl, getSiteUrl } from "./seo-text.ts";
import { storyDisplayDescription } from "./story-description.ts";
import { storyHref } from "./urls.ts";

function storyImage(story: Pick<StorySummary, "coverImageUrl">) {
  const url = story.coverImageUrl?.trim();
  if (!url) return undefined;
  return url.startsWith("http") ? url : absoluteSiteUrl(url.startsWith("/") ? url : `/${url}`);
}

export function buildOrganizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: SITE_NAME,
    url,
    logo: absoluteSiteUrl("/icons/icon-512.png"),
    description: SITE_DESCRIPTION,
  };
}

export function buildWebSiteJsonLd() {
  const url = getSiteUrl();
  return {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name: SITE_NAME,
    url,
    description: SITE_OG_DESCRIPTION,
    inLanguage: "vi",
    publisher: { "@id": `${url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Homepage graph: Organization + WebSite (SearchAction). */
export function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationJsonLd(), buildWebSiteJsonLd()],
  };
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
  const chapterLabel = formatChapterLabel(chapter.chapterNumber, chapter.title);
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
