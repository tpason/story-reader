import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";
import { listCategories, listStoriesCursor } from "@/lib/stories";
import { storyHref } from "@/lib/urls";

const STATIC_PATHS = ["/", "/discover", "/updates", "/reading-history", "/categories", "/login", "/signup"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "hourly" : "daily",
    priority: path === "/" ? 1 : 0.6,
  }));

  const [categories, storiesPage] = await Promise.all([
    listCategories(100),
    listStoriesCursor({ limit: 500, sort: "updated" }),
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
