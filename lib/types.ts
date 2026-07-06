export type StorySummary = {
  id: string;
  title: string;
  originalTitle: string | null;
  author: string | null;
  category: string | null;
  status: string | null;
  description: string | null;
  coverImageUrl: string | null;
  rankName: string | null;
  rankPosition: number | null;
  readerRank: number | null;
  readerScore: number | null;
  readerCountTotal: number;
  readerCount30d: number;
  guestCountTotal: number;
  guestCount30d: number;
  totalChapters: number;
  isCompleted: boolean;
  sourceCode: string;
  primaryCategoryName: string | null;
  primaryCategorySlug: string | null;
  updatedAt: string;
};

export type TrendingPeriod = "day" | "week" | "month" | "year";

export type StoryTrendingItem = StorySummary & {
  trendRank: number;
  uniqueReaders: number;
  uniqueMembers: number;
  uniqueGuests: number;
  sessionCount: number;
  readSeconds: number;
};

export type ReaderLeaderboardScope = "members" | "guests";

export type ReaderLeaderboardItem = {
  rank: number;
  scope: ReaderLeaderboardScope;
  userId: string | null;
  anonymousId: string | null;
  displayName: string;
  isAdmin: boolean;
  sessionCount: number;
  readSeconds: number;
  storyCount: number;
  chaptersReached: number;
  cultivationLevel: number;
  cultivationRealm: string;
  readerScore: number;
};

export type StoryDiscoveryItem = StorySummary & {
  latestChapterNumber: number | null;
  latestChapterTitle: string | null;
  latestActivityAt: string;
  polishedChapterCount: number;
};

export type ChapterSummary = {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  isDownloaded: boolean;
  isPolished: boolean;
  isTranslated: boolean;
  isAudioGenerated: boolean;
  hasDbText: boolean;
  textSource: "polished" | "translated" | "raw" | null;
  hasAudio: boolean;
  updatedAt: string | null;
};

import type { BilingualParagraphPair } from "@/lib/reader-bilingual-pairs";

export type ChapterDetail = ChapterSummary & {
  content: string | null;
  isContentPreformatted: boolean;
  textPath: string | null;
  audioUrl: string | null;
  audioHlsUrl: string | null;
  contentLayer?: "raw" | "translated" | "polished";
  availableContentLayers?: Array<"raw" | "translated" | "polished">;
  bilingualPairs?: BilingualParagraphPair[];
  bilingualEnabled?: boolean;
};

export type ReaderFetchOptions = {
  primaryLayer?: "raw" | "translated" | "polished";
  secondaryLayer?: "raw" | "translated" | "polished" | null;
  displayMode?: "single" | "interleaved" | "secondary_hidden";
};

export type ReaderPayload = {
  story: StorySummary;
  chapter: ChapterDetail;
  chapters: ChapterSummary[];
  previousChapter: ChapterSummary | null;
  nextChapter: ChapterSummary | null;
  previousChapterRecap: string | null;
  previousChapterCursor: string | null;
  chapterCursor: string | null;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  storyCount: number;
};

export type CursorPage<T> = {
  items: T[];
  previousCursor?: string | null;
  nextCursor: string | null;
  pageSize: number;
  total?: number;
};
