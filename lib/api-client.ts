"use client";

import type { StoredReaderUser } from "@/lib/identity";
import type { ReaderBookmarkItem } from "@/lib/bookmarks";
import type { FollowedStoryItem } from "@/lib/follows";
import type { ParagraphBookmark } from "@/lib/paragraph-bookmarks";
import type { ReaderStyleConfig } from "@/lib/reader-preferences";
import type { ReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { sanitizeReaderStyleConfig } from "@/lib/reader-preferences";
import type { ReadingHistoryItem } from "@/lib/reading-history";

export type RemoteReaderPreferences = {
  readerStyle: ReaderStyleConfig;
  performanceMode: ReaderPerformanceMode;
  focusModeDefault: boolean;
};

function sanitizePerformanceMode(value: unknown): ReaderPerformanceMode {
  if (value === "battery_saver" || value === "full_effects" || value === "balanced") return value;
  return "balanced";
}

export async function fetchRemoteReaderPreferences(): Promise<RemoteReaderPreferences | null> {
  const response = await fetch("/api/reader/preferences");
  if (!response.ok) return null;
  const data = (await response.json().catch(() => ({}))) as {
    preferences?: {
      readerStyle?: ReaderStyleConfig;
      performanceMode?: unknown;
      focusModeDefault?: unknown;
    } | null;
  };
  if (!data.preferences) return null;
  return {
    readerStyle: sanitizeReaderStyleConfig(data.preferences.readerStyle),
    performanceMode: sanitizePerformanceMode(data.preferences.performanceMode),
    focusModeDefault: Boolean(data.preferences.focusModeDefault)
  };
}

export async function fetchReaderPreferences() {
  const remote = await fetchRemoteReaderPreferences();
  return remote?.readerStyle ?? null;
}

export async function saveReaderPreferencesOnServer(input: {
  readerStyle?: ReaderStyleConfig;
  performanceMode?: ReaderPerformanceMode;
  focusModeDefault?: boolean;
}) {
  await fetch("/api/reader/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  }).catch(() => undefined);
}

export async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me");
  if (!response.ok) throw new Error("Unable to fetch current user.");
  const data = (await response.json().catch(() => ({}))) as { user?: StoredReaderUser | null };
  return data.user ?? null;
}

export async function fetchReadingProgress(signal?: AbortSignal) {
  const response = await fetch("/api/reading-progress", { signal });
  const data = (await response.json().catch(() => ({}))) as { items?: ReadingHistoryItem[] };
  return data.items ?? [];
}

export async function saveReadingSessionOnServer(payload: unknown) {
  await fetch("/api/reader/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => undefined);
}

export async function fetchBookmarks() {
  const response = await fetch("/api/bookmarks");
  const data = (await response.json().catch(() => ({}))) as { items?: ReaderBookmarkItem[] };
  return data.items ?? [];
}

export async function saveBookmarkOnServer(item: ReaderBookmarkItem) {
  const response = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  const data = (await response.json().catch(() => ({}))) as { item?: ReaderBookmarkItem };
  return data.item ?? null;
}

export async function deleteBookmarkOnServer(storyId: string, chapterNumber: number) {
  await fetch("/api/bookmarks", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId, chapterNumber })
  }).catch(() => undefined);
}

export async function fetchParagraphBookmarks(storyId?: string, chapterNumber?: number) {
  const params = new URLSearchParams();
  if (storyId) params.set("storyId", storyId);
  if (chapterNumber) params.set("chapterNumber", String(chapterNumber));
  const response = await fetch(`/api/paragraph-bookmarks${params.size > 0 ? `?${params.toString()}` : ""}`);
  if (!response.ok) return [];
  const data = (await response.json().catch(() => ({}))) as { items?: ParagraphBookmark[] };
  return data.items ?? [];
}

export async function saveParagraphBookmarkOnServer(item: ParagraphBookmark) {
  const response = await fetch("/api/paragraph-bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item)
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => ({}))) as { item?: ParagraphBookmark };
  return data.item ?? null;
}

export async function deleteParagraphBookmarkOnServer(storyId: string, chapterNumber: number, paragraphIndex: number) {
  await fetch("/api/paragraph-bookmarks", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId, chapterNumber, paragraphIndex })
  }).catch(() => undefined);
}

export async function fetchFollowedStories() {
  const response = await fetch("/api/follows");
  const data = (await response.json().catch(() => ({}))) as { items?: FollowedStoryItem[] };
  return data.items ?? [];
}

export async function syncFollowedStoriesToServer(storyIds: string[]) {
  if (storyIds.length === 0) return [];
  const response = await fetch("/api/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyIds })
  });
  const data = (await response.json().catch(() => ({}))) as { items?: FollowedStoryItem[] };
  return data.items ?? [];
}

export async function followStoryOnServer(storyId: string) {
  const response = await fetch("/api/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId })
  });
  const data = (await response.json().catch(() => ({}))) as { items?: FollowedStoryItem[] };
  return data.items ?? [];
}

export async function unfollowStoryOnServer(storyId: string) {
  await fetch("/api/follows", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId })
  }).catch(() => undefined);
}
