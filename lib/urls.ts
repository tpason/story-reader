import type { Route } from "next";
import type { StorySummary } from "@/lib/types";

const UUID_AT_END = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStoryUuid(value: string) {
  return UUID_AT_END.test(value);
}

export function storyKeyToId(value: string) {
  const match = value.match(UUID_AT_END);
  return match ? match[0] : value;
}

export function slugify(value: string) {
  const withoutMarks = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  return (
    withoutMarks
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "story"
  );
}

export function storyKey(story: Pick<StorySummary, "id" | "title">) {
  return `${slugify(story.title)}-${story.id}`;
}

export function storyHref(story: Pick<StorySummary, "id" | "title">, chapterNumber?: number) {
  const base = `/stories/${storyKey(story)}`;
  return (chapterNumber ? `${base}/chapters/${chapterNumber}` : base) as Route;
}
