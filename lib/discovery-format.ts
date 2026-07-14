import { formatChapterLabel } from "@/lib/chapter-title";
import type { StoryDiscoveryItem } from "@/lib/types";

const ABSOLUTE_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const ABSOLUTE_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export function formatDiscoveryChapterLabel(story: Pick<StoryDiscoveryItem, "latestChapterNumber" | "latestChapterTitle">) {
  if (!story.latestChapterNumber) return "Chưa có chương";
  return formatChapterLabel(story.latestChapterNumber, story.latestChapterTitle);
}

export function formatRelativeActivity(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Vừa cập nhật";

  const delta = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < hour) return `${Math.max(1, Math.floor(delta / minute))} phút trước`;
  if (delta < day) return `${Math.floor(delta / hour)} giờ trước`;
  if (delta < day * 7) return `${Math.floor(delta / day)} ngày trước`;

  return ABSOLUTE_DATE_FORMATTER.format(timestamp);
}

export function formatAbsoluteActivity(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Vừa cập nhật";
  return ABSOLUTE_DATE_TIME_FORMATTER.format(date);
}
