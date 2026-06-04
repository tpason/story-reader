"use client";

import type { ReadingHistoryItem } from "@/lib/reading-history";
import type { StorySummary } from "@/lib/types";

export type FollowedStoryItem = {
  storyId: string;
  storyTitle: string;
  coverImageUrl: string | null;
  author: string | null;
  primaryCategoryName: string | null;
  totalChapters: number;
  lastKnownChapterNumber: number;
  updatedAt: string;
  followedAt: string;
};

const FOLLOWS_KEY = "reader:follows";
const MAX_FOLLOWS = 200;

export function storyToFollowItem(story: StorySummary, followedAt = new Date().toISOString()): FollowedStoryItem {
  return {
    storyId: story.id,
    storyTitle: story.title,
    coverImageUrl: story.coverImageUrl,
    author: story.author,
    primaryCategoryName: story.primaryCategoryName,
    totalChapters: story.totalChapters,
    lastKnownChapterNumber: story.totalChapters,
    updatedAt: story.updatedAt,
    followedAt
  };
}

export function historyToFollowItem(item: ReadingHistoryItem): FollowedStoryItem {
  return {
    storyId: item.storyId,
    storyTitle: item.storyTitle,
    coverImageUrl: item.coverImageUrl,
    author: null,
    primaryCategoryName: null,
    totalChapters: item.totalChapters,
    lastKnownChapterNumber: item.totalChapters,
    updatedAt: item.lastReadAt,
    followedAt: item.lastReadAt
  };
}

export function readLocalFollows(): FollowedStoryItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FOLLOWS_KEY) ?? "[]") as FollowedStoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.storyId && item?.storyTitle)
      .sort((a, b) => Date.parse(b.followedAt) - Date.parse(a.followedAt));
  } catch {
    return [];
  }
}

export function writeLocalFollows(items: FollowedStoryItem[]) {
  window.localStorage.setItem(FOLLOWS_KEY, JSON.stringify(items.slice(0, MAX_FOLLOWS)));
}

export function mergeFollowedStories(current: FollowedStoryItem[], incoming: FollowedStoryItem[]) {
  const byStory = new Map(current.map((item) => [item.storyId, item]));

  incoming.forEach((item) => {
    const existing = byStory.get(item.storyId);
    byStory.set(item.storyId, {
      ...existing,
      ...item,
      followedAt: existing?.followedAt ?? item.followedAt,
      totalChapters: Math.max(existing?.totalChapters ?? 0, item.totalChapters),
      lastKnownChapterNumber: Math.max(existing?.lastKnownChapterNumber ?? 0, item.lastKnownChapterNumber)
    });
  });

  return [...byStory.values()]
    .sort((a, b) => Date.parse(b.followedAt) - Date.parse(a.followedAt))
    .slice(0, MAX_FOLLOWS);
}
