import { revalidatePath, revalidateTag } from "next/cache";

/** Tags attached to public catalog / story / reader unstable_cache entries. */
export const AUTHOR_PUBLIC_CACHE_TAGS = {
  catalog: "author-public-catalog",
  story: (storyId: string) => `author-story:${storyId}`,
  readerPayload: (storyId: string) => `author-reader:${storyId}`
} as const;

/**
 * Purge ISR + tagged Data Cache after author publish / unpublish / delete.
 * CDN s-maxage for crawl content may still hold briefly; UGC APIs should prefer no-store.
 */
export function revalidateAuthorPublicCaches(storyId: string) {
  revalidateTag(AUTHOR_PUBLIC_CACHE_TAGS.catalog);
  revalidateTag(AUTHOR_PUBLIC_CACHE_TAGS.story(storyId));
  revalidateTag(AUTHOR_PUBLIC_CACHE_TAGS.readerPayload(storyId));

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/updates");
  revalidatePath("/rankings");
  revalidatePath("/categories");
  revalidatePath(`/stories/${storyId}`);
  revalidatePath(`/stories/${storyId}`, "layout");
}
