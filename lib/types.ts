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
  totalChapters: number;
  isCompleted: boolean;
  sourceCode: string;
  primaryCategoryName: string | null;
  primaryCategorySlug: string | null;
  updatedAt: string;
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

export type ChapterDetail = ChapterSummary & {
  content: string | null;
  isContentPreformatted: boolean;
  textPath: string | null;
  audioUrl: string | null;
  audioHlsUrl: string | null;
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
