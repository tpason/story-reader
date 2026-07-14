import type { StorySummary } from "@/lib/types";

const COMPLETED_STATUS = /^(full|hoàn\s*thành|completed|finished|done|end)$/i;
const PLACEHOLDER_AUTHOR = /^(đang cập nhật|updating|unknown|n\/a|null|none)$/i;
const GENERIC_ONGOING = /^(đang cập nhật|ongoing|updating|in\s*progress)$/i;

export function displayStoryAuthor(author?: string | null): string {
  const trimmed = author?.trim();
  if (!trimmed || PLACEHOLDER_AUTHOR.test(trimmed)) return "Vô danh tác giả";
  return trimmed;
}

export function resolveStoryStatusBadge(story: Pick<StorySummary, "isCompleted" | "status">): {
  completed: boolean;
  label: string;
} {
  const status = story.status?.trim() ?? "";
  if (story.isCompleted || COMPLETED_STATUS.test(status)) {
    return { completed: true, label: "Hoàn thành" };
  }
  if (!status || GENERIC_ONGOING.test(status)) {
    return { completed: false, label: "Đang cập nhật" };
  }
  return { completed: false, label: status };
}
