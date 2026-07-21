import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";
import { formatChapterLabel } from "@/lib/chapter-title";
import type { ChapterSummary, StorySummary } from "@/lib/types";
import { absoluteSiteUrl, truncateMetaDescription } from "@/lib/seo-text";
import { storyDisplayDescription } from "@/lib/story-description";
import { storyHref, storyKey } from "@/lib/urls";

export { getSiteUrl } from "@/lib/seo-text";
export { SITE_NAME } from "@/lib/brand";

function storyCoverImage(story: Pick<StorySummary, "coverImageUrl">) {
  const url = story.coverImageUrl?.trim();
  if (!url) return undefined;
  return url.startsWith("http") ? url : absoluteSiteUrl(url.startsWith("/") ? url : `/${url}`);
}

export function buildStoryMetadata(story: StorySummary): Metadata {
  const description = truncateMetaDescription(storyDisplayDescription(story));
  const path = storyHref(story);
  const image = storyCoverImage(story);

  return {
    title: story.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title: story.title,
      description,
      url: absoluteSiteUrl(path),
      images: image ? [{ url: image, alt: story.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: story.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildChapterMetadata(
  story: StorySummary,
  chapter: Pick<ChapterSummary, "chapterNumber" | "title">,
): Metadata {
  const chapterLabel = formatChapterLabel(chapter.chapterNumber, chapter.title);
  const description = truncateMetaDescription(
    `${chapterLabel} · ${story.title}${story.author ? ` · ${story.author}` : ""}. Đọc trên ${SITE_NAME}.`,
  );
  const path = storyHref(story, chapter.chapterNumber);
  const title = `${chapterLabel} | ${story.title}`;
  const image = storyCoverImage(story);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteSiteUrl(path),
      images: image ? [{ url: image, alt: story.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildCategoryMetadata(name: string, storyCount: number, slug: string): Metadata {
  const description = truncateMetaDescription(
    `${storyCount.toLocaleString("vi")} truyện thể loại ${name} trên ${SITE_NAME}. Đọc tiên hiệp, tu luyện và theo dõi chương mới.`,
  );
  const path = `/categories/${slug}`;

  return {
    title: `${name} · thể loại`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title: `${name} · thể loại truyện`,
      description,
      url: absoluteSiteUrl(path),
    },
  };
}

export function storyPathKey(story: Pick<StorySummary, "id" | "title">) {
  return storyKey(story);
}
