import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { listCategories, listStoriesCursor } from "@/lib/stories";
import { storyHref } from "@/lib/urls";

/** Public marketing/browse URLs only — no auth or personal shelves. */
const STATIC_PATHS = [
  "/",
  "/discover",
  "/rankings",
  "/updates",
  "/categories",
  "/dao-luan",
];

// DB is not available during `docker build`; generate sitemap at request time instead.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" || path === "/rankings" ? "hourly" : "daily",
    priority: path === "/" ? 1 : path === "/rankings" || path === "/discover" ? 0.85 : 0.6,
  }));

  const [categories, storiesPage] = await Promise.all([
    listCategories(100),
    listStoriesCursor({ limit: 500, sort: "updated", minChapters: 1 }),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/categories/${category.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const storyEntries: MetadataRoute.Sitemap = storiesPage.items.map((story) => ({
    url: `${base}${storyHref(story)}`,
    lastModified: story.updatedAt ? new Date(story.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...storyEntries];
}
