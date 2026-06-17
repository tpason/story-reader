import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";
import type { CategorySummary, ChapterDetail, ChapterSummary, CursorPage, Paginated, ReaderPayload, StoryDiscoveryItem, StorySummary } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 80;
const READER_CHAPTER_PAGE_SIZE = 80;
const PROJECT_ROOT_CANDIDATES = Array.from(new Set([process.cwd(), resolve(process.cwd(), "..")]));

type StoryRow = {
  id: string;
  title: string;
  original_title: string | null;
  author: string | null;
  category: string | null;
  status: string | null;
  description: string | null;
  cover_image_url: string | null;
  rank_name: string | null;
  rank_position: number | null;
  total_chapters: number;
  is_completed: boolean;
  source_code: string;
  primary_category_name: string | null;
  primary_category_slug: string | null;
  updated_at: Date;
};

type StoryDiscoveryRow = StoryRow & {
  latest_chapter_number: number | null;
  latest_chapter_title: string | null;
  latest_activity_at: Date;
  polished_chapter_count: string;
};

type ChapterRow = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  is_downloaded: boolean;
  is_polished: boolean;
  is_translated: boolean;
  is_audio_generated: boolean;
  raw_text_path: string | null;
  translated_text_path: string | null;
  polished_text_path: string | null;
  raw_text_content?: string | null;
  translated_text_content?: string | null;
  polished_text_content?: string | null;
  reader_formatted_text_content?: string | null;
  reader_formatted_content_version?: number | null;
  has_audio: boolean;
  chapter_updated_at: Date | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  story_count: string;
};

function pageParams(page?: number, pageSize?: number) {
  const cleanPage = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
  const cleanPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(pageSize) ? Number(pageSize) : DEFAULT_PAGE_SIZE));
  return {
    page: cleanPage,
    pageSize: cleanPageSize,
    offset: (cleanPage - 1) * cleanPageSize
  };
}

function limitParams(limit?: number, fallback = DEFAULT_PAGE_SIZE) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(limit) ? Number(limit) : fallback));
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset?: unknown };
    return Math.max(0, typeof parsed.offset === "number" ? parsed.offset : 0);
  } catch {
    return 0;
  }
}

function chapterPageCursor(chapterNumber: number, pageSize: number) {
  const cleanChapterNumber = Math.max(1, Number.isFinite(chapterNumber) ? Math.floor(chapterNumber) : 1);
  const cleanPageSize = Math.max(1, pageSize);
  return Math.floor((cleanChapterNumber - 1) / cleanPageSize) * cleanPageSize;
}

function textSource(row: Pick<ChapterRow, "polished_text_path" | "translated_text_path" | "raw_text_path">) {
  if (row.polished_text_path) return "polished";
  if (row.translated_text_path) return "translated";
  if (row.raw_text_path) return "raw";
  return null;
}

function contentSource(row: Pick<ChapterRow, "polished_text_content" | "translated_text_content" | "raw_text_content" | "polished_text_path" | "translated_text_path" | "raw_text_path">) {
  if (row.polished_text_content) return "polished";
  if (row.translated_text_content) return "translated";
  if (row.raw_text_content) return "raw";
  if (row.polished_text_path) return "polished";
  if (row.translated_text_path) return "translated";
  if (row.raw_text_path) return "raw";
  return null;
}

function textContent(row: Pick<ChapterRow, "polished_text_content" | "translated_text_content" | "raw_text_content">) {
  return row.polished_text_content ?? row.translated_text_content ?? row.raw_text_content ?? null;
}

function readerFormattedContent(row: Pick<ChapterRow, "reader_formatted_text_content" | "reader_formatted_content_version">) {
  if (row.reader_formatted_content_version !== READER_CONTENT_FORMAT_VERSION) return null;
  return row.reader_formatted_text_content ?? null;
}

function textPath(row: Pick<ChapterRow, "polished_text_path" | "translated_text_path" | "raw_text_path">) {
  return row.polished_text_path ?? row.translated_text_path ?? row.raw_text_path ?? null;
}

async function readProjectTextFile(path: string | null): Promise<string | null> {
  if (!path) return null;

  for (const projectRoot of PROJECT_ROOT_CANDIDATES) {
    const absolutePath = isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);
    if (!absolutePath.startsWith(projectRoot)) continue;

    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      continue;
    }
  }

  return null;
}

function mapStory(row: StoryRow): StorySummary {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    author: row.author,
    category: row.category,
    status: row.status,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    rankName: row.rank_name,
    rankPosition: row.rank_position,
    totalChapters: row.total_chapters,
    isCompleted: row.is_completed,
    sourceCode: row.source_code,
    primaryCategoryName: row.primary_category_name,
    primaryCategorySlug: row.primary_category_slug ?? null,
    updatedAt: row.updated_at.toISOString()
  };
}

function mapDiscoveryStory(row: StoryDiscoveryRow): StoryDiscoveryItem {
  return {
    ...mapStory(row),
    latestChapterNumber: row.latest_chapter_number,
    latestChapterTitle: row.latest_chapter_title,
    latestActivityAt: row.latest_activity_at.toISOString(),
    polishedChapterCount: Number(row.polished_chapter_count ?? 0)
  };
}

function mapChapter(row: ChapterRow): ChapterSummary {
  return {
    id: row.id,
    storyId: row.story_id,
    chapterNumber: row.chapter_number,
    title: row.title,
    isDownloaded: row.is_downloaded,
    isPolished: row.is_polished,
    isTranslated: row.is_translated,
    isAudioGenerated: row.is_audio_generated,
    hasDbText: Boolean(textContent(row) ?? textPath(row)),
    textSource: contentSource(row),
    hasAudio: row.has_audio,
    updatedAt: row.chapter_updated_at?.toISOString() ?? null
  };
}

function storyOrderSql(sort?: "updated" | "chapters" | "hot" | "title") {
  switch (sort) {
    case "chapters":
      return "s.total_chapters DESC, s.updated_at DESC, s.id ASC";
    case "hot":
      return "s.rank_position NULLS LAST, s.total_chapters DESC, s.updated_at DESC, s.id ASC";
    case "title":
      return "COALESCE(NULLIF(s.display_title, ''), s.title) ASC, s.id ASC";
    case "updated":
    default:
      return "s.updated_at DESC, s.created_at DESC, s.id ASC";
  }
}

export async function listStories(options: {
  page?: number;
  pageSize?: number;
  category?: string;
  completed?: boolean;
  hot?: boolean;
  queryText?: string;
  minChapters?: number;
  maxChapters?: number;
  hasPolished?: boolean;
  hasAudio?: boolean;
  sort?: "updated" | "chapters" | "hot" | "title";
} = {}): Promise<Paginated<StorySummary>> {
  const { page, pageSize, offset } = pageParams(options.page, options.pageSize);
  const where = ["s.is_active = TRUE"];
  const values: unknown[] = [];
  let searchParamRef: number | null = null;

  if (options.category) {
    values.push(options.category);
    where.push(`(
      cat.slug = $${values.length}
      OR cat.normalized_name = $${values.length}
      OR EXISTS (
        SELECT 1
        FROM story_categories sc_filter
        JOIN categories cat_filter ON cat_filter.id = sc_filter.category_id
        WHERE sc_filter.story_id = s.id
          AND (cat_filter.slug = $${values.length} OR cat_filter.normalized_name = $${values.length})
      )
    )`);
  }

  if (typeof options.completed === "boolean") {
    values.push(options.completed);
    where.push("s.is_completed = $" + values.length);
  }

  if (options.hot) {
    where.push("s.rank_position IS NOT NULL");
  }

  if (Number.isFinite(options.minChapters) && Number(options.minChapters) > 0) {
    values.push(Math.floor(Number(options.minChapters)));
    where.push("s.total_chapters >= $" + values.length);
  }

  if (Number.isFinite(options.maxChapters) && Number(options.maxChapters) > 0) {
    values.push(Math.floor(Number(options.maxChapters)));
    where.push("s.total_chapters <= $" + values.length);
  }

  if (options.hasPolished) {
    where.push(`EXISTS (
      SELECT 1 FROM chapters c_polished
      WHERE c_polished.story_id = s.id
        AND (c_polished.is_polished = TRUE OR c_polished.polished_text_path IS NOT NULL OR c_polished.polished_text_content IS NOT NULL)
    )`);
  }

  if (options.hasAudio) {
    where.push(`EXISTS (
      SELECT 1 FROM chapters c_audio
      WHERE c_audio.story_id = s.id
        AND (c_audio.is_audio_generated = TRUE OR c_audio.audio_path IS NOT NULL)
    )`);
  }

  if (options.queryText) {
    const searchIndex = values.push(options.queryText.trim());
    searchParamRef = searchIndex;
    where.push(`(
      s.title ILIKE '%' || $${searchIndex} || '%'
      OR s.display_title ILIKE '%' || $${searchIndex} || '%'
      OR s.original_title ILIKE '%' || $${searchIndex} || '%'
      OR s.author ILIKE '%' || $${searchIndex} || '%'
      OR s.description ILIKE '%' || $${searchIndex} || '%'
      OR s.category ILIKE '%' || $${searchIndex} || '%'
      OR cat.name ILIKE '%' || $${searchIndex} || '%'
      OR similarity(s.title, $${searchIndex}) > 0.18
      OR similarity(COALESCE(s.display_title, ''), $${searchIndex}) > 0.18
      OR similarity(COALESCE(s.original_title, ''), $${searchIndex}) > 0.18
      OR similarity(COALESCE(s.author, ''), $${searchIndex}) > 0.2
      OR similarity(COALESCE(s.description, ''), $${searchIndex}) > 0.08
      OR similarity(COALESCE(s.category, ''), $${searchIndex}) > 0.12
      OR similarity(COALESCE(cat.name, ''), $${searchIndex}) > 0.12
    )`);
  }

  const whereSql = where.join(" AND ");
  const countRows = await query<{ count: string }>(
    `
      SELECT COUNT(DISTINCT s.id)::text AS count
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE ${whereSql}
    `,
    values
  );

  values.push(pageSize, offset);
  const rows = await query<StoryRow>(
    `
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE ${whereSql}
      ORDER BY
        ${searchParamRef ? `
        CASE
          WHEN s.title ILIKE '%' || $${searchParamRef} || '%' THEN 0
          WHEN s.display_title ILIKE '%' || $${searchParamRef} || '%' THEN 0
          WHEN s.original_title ILIKE '%' || $${searchParamRef} || '%' THEN 1
          WHEN s.author ILIKE '%' || $${searchParamRef} || '%' THEN 2
          ELSE 3
        END,
        GREATEST(
          similarity(s.title, $${searchParamRef}),
          similarity(COALESCE(s.display_title, ''), $${searchParamRef}),
          similarity(COALESCE(s.original_title, ''), $${searchParamRef}),
          similarity(COALESCE(s.author, ''), $${searchParamRef}),
          similarity(COALESCE(s.description, ''), $${searchParamRef}),
          similarity(COALESCE(s.category, ''), $${searchParamRef}),
          similarity(COALESCE(cat.name, ''), $${searchParamRef})
        ) DESC,` : ""}
        ${storyOrderSql(options.sort ?? (options.hot ? "hot" : undefined))}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  const total = Number(countRows[0]?.count ?? 0);
  return {
    items: rows.map(mapStory),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function listStoriesCursor(options: {
  cursor?: string | null;
  limit?: number;
  category?: string;
  completed?: boolean;
  hot?: boolean;
  queryText?: string;
  author?: string;
  minChapters?: number;
  maxChapters?: number;
  hasPolished?: boolean;
  hasAudio?: boolean;
  sort?: "updated" | "chapters" | "hot" | "title";
} = {}): Promise<CursorPage<StorySummary>> {
  const limit = limitParams(options.limit, DEFAULT_PAGE_SIZE);
  const offset = decodeCursor(options.cursor);
  const where = ["s.is_active = TRUE"];
  const values: unknown[] = [];
  let searchParamRef: number | null = null;

  if (options.category) {
    values.push(options.category);
    where.push(`(
      cat.slug = $${values.length}
      OR cat.normalized_name = $${values.length}
      OR EXISTS (
        SELECT 1
        FROM story_categories sc_filter
        JOIN categories cat_filter ON cat_filter.id = sc_filter.category_id
        WHERE sc_filter.story_id = s.id
          AND (cat_filter.slug = $${values.length} OR cat_filter.normalized_name = $${values.length})
      )
    )`);
  }

  if (typeof options.completed === "boolean") {
    values.push(options.completed);
    where.push("s.is_completed = $" + values.length);
  }

  if (options.hot) {
    where.push("s.rank_position IS NOT NULL");
  }

  if (Number.isFinite(options.minChapters) && Number(options.minChapters) > 0) {
    values.push(Math.floor(Number(options.minChapters)));
    where.push("s.total_chapters >= $" + values.length);
  }

  if (Number.isFinite(options.maxChapters) && Number(options.maxChapters) > 0) {
    values.push(Math.floor(Number(options.maxChapters)));
    where.push("s.total_chapters <= $" + values.length);
  }

  if (options.hasPolished) {
    where.push(`EXISTS (
      SELECT 1 FROM chapters c_polished
      WHERE c_polished.story_id = s.id
        AND (c_polished.is_polished = TRUE OR c_polished.polished_text_path IS NOT NULL OR c_polished.polished_text_content IS NOT NULL)
    )`);
  }

  if (options.hasAudio) {
    where.push(`EXISTS (
      SELECT 1 FROM chapters c_audio
      WHERE c_audio.story_id = s.id
        AND (c_audio.is_audio_generated = TRUE OR c_audio.audio_path IS NOT NULL)
    )`);
  }


  if (options.author) {
    const authorIndex = values.push(`%${options.author.trim()}%`);
    where.push(`s.author ILIKE $${authorIndex}`);
  }

  if (options.queryText) {
    const searchIndex = values.push(options.queryText.trim());
    searchParamRef = searchIndex;
    where.push(`(
      s.title ILIKE '%' || $${searchIndex} || '%'
      OR s.display_title ILIKE '%' || $${searchIndex} || '%'
      OR s.original_title ILIKE '%' || $${searchIndex} || '%'
      OR s.author ILIKE '%' || $${searchIndex} || '%'
      OR s.description ILIKE '%' || $${searchIndex} || '%'
      OR s.category ILIKE '%' || $${searchIndex} || '%'
      OR cat.name ILIKE '%' || $${searchIndex} || '%'
      OR similarity(s.title, $${searchIndex}) > 0.18
      OR similarity(COALESCE(s.display_title, ''), $${searchIndex}) > 0.18
      OR similarity(COALESCE(s.original_title, ''), $${searchIndex}) > 0.18
      OR similarity(COALESCE(s.author, ''), $${searchIndex}) > 0.2
      OR similarity(COALESCE(s.description, ''), $${searchIndex}) > 0.08
      OR similarity(COALESCE(s.category, ''), $${searchIndex}) > 0.12
      OR similarity(COALESCE(cat.name, ''), $${searchIndex}) > 0.12
    )`);
  }

  const whereSql = where.join(" AND ");
  const countRows = await query<{ count: string }>(
    `
      SELECT COUNT(DISTINCT s.id)::text AS count
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE ${whereSql}
    `,
    values
  );

  values.push(limit + 1, offset);
  const rows = await query<StoryRow>(
    `
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE ${whereSql}
      ORDER BY
        ${searchParamRef ? `
        CASE
          WHEN s.title ILIKE '%' || $${searchParamRef} || '%' THEN 0
          WHEN s.display_title ILIKE '%' || $${searchParamRef} || '%' THEN 0
          WHEN s.original_title ILIKE '%' || $${searchParamRef} || '%' THEN 1
          WHEN s.author ILIKE '%' || $${searchParamRef} || '%' THEN 2
          ELSE 3
        END,
        GREATEST(
          similarity(s.title, $${searchParamRef}),
          similarity(COALESCE(s.display_title, ''), $${searchParamRef}),
          similarity(COALESCE(s.original_title, ''), $${searchParamRef}),
          similarity(COALESCE(s.author, ''), $${searchParamRef}),
          similarity(COALESCE(s.description, ''), $${searchParamRef}),
          similarity(COALESCE(s.category, ''), $${searchParamRef}),
          similarity(COALESCE(cat.name, ''), $${searchParamRef})
        ) DESC,` : ""}
        ${storyOrderSql(options.sort ?? (options.hot ? "hot" : undefined))}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  const pageRows = rows.slice(0, limit);
  const nextOffset = offset + pageRows.length;
  const total = Number(countRows[0]?.count ?? 0);
  return {
    items: pageRows.map(mapStory),
    nextCursor: rows.length > limit ? encodeCursor(nextOffset) : null,
    pageSize: limit,
    total
  };
}

export async function listCategories(limit = 16): Promise<CategorySummary[]> {
  const rows = await query<CategoryRow>(
    `
      SELECT cat.id, cat.slug, cat.name, COUNT(s.id)::text AS story_count
      FROM categories cat
      LEFT JOIN story_categories sc ON sc.category_id = cat.id
      LEFT JOIN stories s ON s.id = sc.story_id AND s.is_active = TRUE
      WHERE cat.is_excluded = FALSE
      GROUP BY cat.id
      HAVING COUNT(s.id) > 0
      ORDER BY COUNT(s.id) DESC, cat.name ASC
      LIMIT $1
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    storyCount: Number(row.story_count)
  }));
}

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  const rows = await query<CategoryRow>(
    `
      SELECT cat.id, cat.slug, cat.name, COUNT(s.id)::text AS story_count
      FROM categories cat
      LEFT JOIN story_categories sc ON sc.category_id = cat.id
      LEFT JOIN stories s ON s.id = sc.story_id AND s.is_active = TRUE
      WHERE cat.is_excluded = FALSE
        AND (cat.slug = $1 OR cat.normalized_name = $1)
      GROUP BY cat.id
      LIMIT 1
    `,
    [slug]
  );
  if (!rows[0]) return null;
  return { id: rows[0].id, slug: rows[0].slug, name: rows[0].name, storyCount: Number(rows[0].story_count) };
}

export async function listRecentlyPolishedStories(limit = 8): Promise<StoryDiscoveryItem[]> {
  const rows = await query<StoryDiscoveryRow>(
    `
      WITH recent AS (
        SELECT DISTINCT ON (c.story_id)
          c.story_id,
          c.chapter_number AS latest_chapter_number,
          c.title AS latest_chapter_title,
          COALESCE(c.polished_at, c.updated_at) AS latest_activity_at
        FROM chapters c
        WHERE c.is_polished = TRUE
          AND (c.polished_at IS NOT NULL OR c.updated_at IS NOT NULL)
        ORDER BY c.story_id, COALESCE(c.polished_at, c.updated_at) DESC, c.chapter_number DESC
      ),
      counts AS (
        SELECT story_id, COUNT(*)::text AS polished_chapter_count
        FROM chapters
        WHERE is_polished = TRUE
        GROUP BY story_id
      )
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug,
        r.latest_chapter_number, r.latest_chapter_title, r.latest_activity_at,
        COALESCE(cnt.polished_chapter_count, '0') AS polished_chapter_count
      FROM recent r
      JOIN stories s ON s.id = r.story_id
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      LEFT JOIN counts cnt ON cnt.story_id = s.id
      WHERE s.is_active = TRUE
      ORDER BY r.latest_activity_at DESC, s.updated_at DESC
      LIMIT $1
    `,
    [limitParams(limit, 8)]
  );

  return rows.map(mapDiscoveryStory);
}

export async function listRecentlyUpdatedStories(limit = 8): Promise<StoryDiscoveryItem[]> {
  const rows = await query<StoryDiscoveryRow>(
    `
      WITH recent AS (
        SELECT DISTINCT ON (c.story_id)
          c.story_id,
          c.chapter_number AS latest_chapter_number,
          c.title AS latest_chapter_title,
          COALESCE(c.downloaded_at, c.updated_at, c.created_at) AS latest_activity_at
        FROM chapters c
        WHERE c.is_downloaded = TRUE
           OR c.raw_text_path IS NOT NULL
           OR c.translated_text_path IS NOT NULL
           OR c.polished_text_path IS NOT NULL
        ORDER BY c.story_id, COALESCE(c.downloaded_at, c.updated_at, c.created_at) DESC, c.chapter_number DESC
      ),
      counts AS (
        SELECT story_id, COUNT(*)::text AS polished_chapter_count
        FROM chapters
        WHERE is_polished = TRUE
        GROUP BY story_id
      )
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug,
        r.latest_chapter_number, r.latest_chapter_title, GREATEST(r.latest_activity_at, s.updated_at) AS latest_activity_at,
        COALESCE(cnt.polished_chapter_count, '0') AS polished_chapter_count
      FROM recent r
      JOIN stories s ON s.id = r.story_id
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      LEFT JOIN counts cnt ON cnt.story_id = s.id
      WHERE s.is_active = TRUE
      ORDER BY GREATEST(r.latest_activity_at, s.updated_at) DESC, r.latest_chapter_number DESC
      LIMIT $1
    `,
    [limitParams(limit, 8)]
  );

  return rows.map(mapDiscoveryStory);
}

export const getCachedPolishedStories = unstable_cache(
  (limit: number) => listRecentlyPolishedStories(limit),
  ["polished-stories"],
  { revalidate: 300 }
);

export const getCachedUpdatedStories = unstable_cache(
  (limit: number) => listRecentlyUpdatedStories(limit),
  ["updated-stories"],
  { revalidate: 300 }
);

export const getCachedStory = unstable_cache(
  (storyId: string) => getStory(storyId),
  ["story"],
  { revalidate: 120 }
);

export const getCachedRecommendedStories = unstable_cache(
  (storyId: string, limit: number) => listRecommendedStories(storyId, limit),
  ["recommended-stories"],
  { revalidate: 300 }
);

export const getCachedCategories = unstable_cache(
  (limit: number) => listCategories(limit),
  ["categories"],
  { revalidate: 600 }
);

export async function listRecentlyPolishedStoriesPage(options: { page?: number; pageSize?: number; today?: boolean; completed?: boolean } = {}): Promise<Paginated<StoryDiscoveryItem>> {
  const { page, pageSize, offset } = pageParams(options.page, options.pageSize);
  const todaySql = options.today ? "AND r.latest_activity_at >= date_trunc('day', now())" : "";
  const completedSql = options.completed === true ? "AND s.is_completed = TRUE" : options.completed === false ? "AND s.is_completed = FALSE" : "";

  const countRows = await query<{ count: string }>(
    `
      WITH recent AS (
        SELECT DISTINCT ON (c.story_id)
          c.story_id,
          c.chapter_number AS latest_chapter_number,
          c.title AS latest_chapter_title,
          COALESCE(c.polished_at, c.updated_at) AS latest_activity_at
        FROM chapters c
        WHERE c.is_polished = TRUE
          AND (c.polished_at IS NOT NULL OR c.updated_at IS NOT NULL)
        ORDER BY c.story_id, COALESCE(c.polished_at, c.updated_at) DESC, c.chapter_number DESC
      )
      SELECT COUNT(*)::text AS count
      FROM recent r
      JOIN stories s ON s.id = r.story_id
      WHERE s.is_active = TRUE
        ${todaySql}
        ${completedSql}
    `
  );

  const rows = await query<StoryDiscoveryRow>(
    `
      WITH recent AS (
        SELECT DISTINCT ON (c.story_id)
          c.story_id,
          c.chapter_number AS latest_chapter_number,
          c.title AS latest_chapter_title,
          COALESCE(c.polished_at, c.updated_at) AS latest_activity_at
        FROM chapters c
        WHERE c.is_polished = TRUE
          AND (c.polished_at IS NOT NULL OR c.updated_at IS NOT NULL)
        ORDER BY c.story_id, COALESCE(c.polished_at, c.updated_at) DESC, c.chapter_number DESC
      ),
      counts AS (
        SELECT story_id, COUNT(*)::text AS polished_chapter_count
        FROM chapters
        WHERE is_polished = TRUE
        GROUP BY story_id
      )
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug,
        r.latest_chapter_number, r.latest_chapter_title, r.latest_activity_at,
        COALESCE(cnt.polished_chapter_count, '0') AS polished_chapter_count
      FROM recent r
      JOIN stories s ON s.id = r.story_id
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      LEFT JOIN counts cnt ON cnt.story_id = s.id
      WHERE s.is_active = TRUE
        ${todaySql}
        ${completedSql}
      ORDER BY r.latest_activity_at DESC, s.updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    [pageSize, offset]
  );

  const total = Number(countRows[0]?.count ?? 0);
  return {
    items: rows.map(mapDiscoveryStory),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function listRecentlyUpdatedStoriesPage(options: { page?: number; pageSize?: number; today?: boolean; completed?: boolean } = {}): Promise<Paginated<StoryDiscoveryItem>> {
  const { page, pageSize, offset } = pageParams(options.page, options.pageSize);
  const todaySql = options.today ? "AND GREATEST(r.latest_activity_at, s.updated_at) >= date_trunc('day', now())" : "";
  const completedSql = options.completed === true ? "AND s.is_completed = TRUE" : options.completed === false ? "AND s.is_completed = FALSE" : "";

  const countRows = await query<{ count: string }>(
    `
      WITH recent AS (
        SELECT DISTINCT ON (c.story_id)
          c.story_id,
          c.chapter_number AS latest_chapter_number,
          c.title AS latest_chapter_title,
          COALESCE(c.downloaded_at, c.updated_at, c.created_at) AS latest_activity_at
        FROM chapters c
        WHERE c.is_downloaded = TRUE
           OR c.raw_text_path IS NOT NULL
           OR c.translated_text_path IS NOT NULL
           OR c.polished_text_path IS NOT NULL
        ORDER BY c.story_id, COALESCE(c.downloaded_at, c.updated_at, c.created_at) DESC, c.chapter_number DESC
      )
      SELECT COUNT(*)::text AS count
      FROM recent r
      JOIN stories s ON s.id = r.story_id
      WHERE s.is_active = TRUE
        ${todaySql}
        ${completedSql}
    `
  );

  const rows = await query<StoryDiscoveryRow>(
    `
      WITH recent AS (
        SELECT DISTINCT ON (c.story_id)
          c.story_id,
          c.chapter_number AS latest_chapter_number,
          c.title AS latest_chapter_title,
          COALESCE(c.downloaded_at, c.updated_at, c.created_at) AS latest_activity_at
        FROM chapters c
        WHERE c.is_downloaded = TRUE
           OR c.raw_text_path IS NOT NULL
           OR c.translated_text_path IS NOT NULL
           OR c.polished_text_path IS NOT NULL
        ORDER BY c.story_id, COALESCE(c.downloaded_at, c.updated_at, c.created_at) DESC, c.chapter_number DESC
      ),
      counts AS (
        SELECT story_id, COUNT(*)::text AS polished_chapter_count
        FROM chapters
        WHERE is_polished = TRUE
        GROUP BY story_id
      )
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug,
        r.latest_chapter_number, r.latest_chapter_title, GREATEST(r.latest_activity_at, s.updated_at) AS latest_activity_at,
        COALESCE(cnt.polished_chapter_count, '0') AS polished_chapter_count
      FROM recent r
      JOIN stories s ON s.id = r.story_id
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      LEFT JOIN counts cnt ON cnt.story_id = s.id
      WHERE s.is_active = TRUE
        ${todaySql}
        ${completedSql}
      ORDER BY GREATEST(r.latest_activity_at, s.updated_at) DESC, r.latest_chapter_number DESC
      LIMIT $1 OFFSET $2
    `,
    [pageSize, offset]
  );

  const total = Number(countRows[0]?.count ?? 0);
  return {
    items: rows.map(mapDiscoveryStory),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getStory(storyId: string): Promise<StorySummary> {
  const rows = await query<StoryRow>(
    `
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE s.id = $1 AND s.is_active = TRUE
      LIMIT 1
    `,
    [storyId]
  );

  if (!rows[0]) {
    notFound();
  }

  return mapStory(rows[0]);
}

export async function listRecommendedStories(storyId: string, limit = 6): Promise<StorySummary[]> {
  const rows = await query<StoryRow>(
    `
      WITH current_story AS (
        SELECT id, author, primary_category_id
        FROM stories
        WHERE id = $1
        LIMIT 1
      ),
      current_categories AS (
        SELECT category_id
        FROM story_categories
        WHERE story_id = $1
      )
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug
      FROM stories s
      CROSS JOIN current_story cs
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE s.is_active = TRUE
        AND s.id <> $1
        AND (
          (cs.author IS NOT NULL AND s.author = cs.author)
          OR (cs.primary_category_id IS NOT NULL AND s.primary_category_id = cs.primary_category_id)
          OR EXISTS (
            SELECT 1
            FROM story_categories sc
            WHERE sc.story_id = s.id
              AND sc.category_id IN (SELECT category_id FROM current_categories)
          )
        )
      ORDER BY
        CASE WHEN cs.author IS NOT NULL AND s.author = cs.author THEN 0 ELSE 1 END,
        s.rank_position NULLS LAST,
        s.updated_at DESC,
        s.total_chapters DESC
      LIMIT $2
    `,
    [storyId, limitParams(limit, 6)]
  );

  return rows.map(mapStory);
}

export async function listChapters(storyId: string, options: { page?: number; pageSize?: number } = {}): Promise<Paginated<ChapterSummary>> {
  const { page, pageSize, offset } = pageParams(options.page, options.pageSize);
  const countRows = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM chapters WHERE story_id = $1", [storyId]);
  const rows = await query<ChapterRow>(
    `
      SELECT
        c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
        c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
        c.raw_text_content, c.translated_text_content, c.polished_text_content,
        (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
        COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
      FROM chapters c
      WHERE c.story_id = $1
      ORDER BY c.chapter_number ASC
      LIMIT $2 OFFSET $3
    `,
    [storyId, pageSize, offset]
  );

  const total = Number(countRows[0]?.count ?? 0);
  return {
    items: rows.map(mapChapter),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function listChaptersCursor(
  storyId: string,
  options: { cursor?: string | null; limit?: number; chapterNumber?: number; direction?: "next" | "previous" } = {}
): Promise<CursorPage<ChapterSummary>> {
  const limit = limitParams(options.limit, 60);
  const direction = options.direction ?? "next";
  const cursorChapter = Number.isFinite(options.chapterNumber)
    ? chapterPageCursor(Number(options.chapterNumber), limit)
    : decodeCursor(options.cursor);

  if (direction === "previous") {
    const rows = await query<ChapterRow>(
      `
        SELECT
          c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
          c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
          c.raw_text_content, c.translated_text_content, c.polished_text_content,
          (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
          COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
        FROM chapters c
        WHERE c.story_id = $1
          AND c.chapter_number < $2
        ORDER BY c.chapter_number DESC
        LIMIT $3
      `,
      [storyId, cursorChapter, limit + 1]
    );

    const pageRows = rows.slice(0, limit).reverse();
    const firstChapter = pageRows[0]?.chapter_number ?? cursorChapter;
    const lastChapter = pageRows.at(-1)?.chapter_number ?? cursorChapter;
    return {
      items: pageRows.map(mapChapter),
      previousCursor: rows.length > limit ? encodeCursor(firstChapter) : null,
      nextCursor: encodeCursor(lastChapter),
      pageSize: limit
    };
  }

  const rows = await query<ChapterRow>(
    `
      SELECT
        c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
        c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
        c.raw_text_content, c.translated_text_content, c.polished_text_content,
        (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
        COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
      FROM chapters c
      WHERE c.story_id = $1
        AND c.chapter_number > $2
      ORDER BY c.chapter_number ASC
      LIMIT $3
    `,
    [storyId, cursorChapter, limit + 1]
  );

  const pageRows = rows.slice(0, limit);
  const firstChapter = pageRows[0]?.chapter_number ?? cursorChapter;
  const lastChapter = pageRows.at(-1)?.chapter_number ?? cursorChapter;
  return {
    items: pageRows.map(mapChapter),
    previousCursor: firstChapter > 1 ? encodeCursor(firstChapter) : null,
    nextCursor: rows.length > limit ? encodeCursor(lastChapter) : null,
    pageSize: limit
  };
}

export async function searchChapters(storyId: string, search: string, options: { limit?: number } = {}): Promise<CursorPage<ChapterSummary>> {
  const limit = limitParams(options.limit, 60);
  const queryText = search.trim();
  if (!queryText) {
    return {
      items: [],
      nextCursor: null,
      pageSize: limit
    };
  }

  const chapterNumber = Number(queryText);
  const params: unknown[] = [storyId, limit];
  const conditions = ["c.title ILIKE '%' || $3 || '%'"];
  params.push(queryText);

  if (Number.isFinite(chapterNumber)) {
    params.push(Math.max(1, Math.floor(chapterNumber)));
    conditions.unshift(`c.chapter_number = $${params.length}`);
  }

  const rows = await query<ChapterRow>(
    `
      SELECT
        c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
        c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
        c.raw_text_content, c.translated_text_content, c.polished_text_content,
        (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
        COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
      FROM chapters c
      WHERE c.story_id = $1
        AND (${conditions.join(" OR ")})
      ORDER BY c.chapter_number ASC
      LIMIT $2
    `,
    params
  );

  return {
    items: rows.map(mapChapter),
    nextCursor: null,
    pageSize: limit
  };
}

export async function getReaderPayload(storyId: string, chapterNumber: number): Promise<ReaderPayload> {
  const story = await getStory(storyId);
  const currentRows = await query<ChapterRow>(
    `
      SELECT
        c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
        c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
        c.raw_text_content, c.translated_text_content, c.polished_text_content,
        CASE
          WHEN c.reader_formatted_content_version = $3
           AND (
             c.reader_formatted_source_hash = md5(COALESCE(c.polished_text_content, c.translated_text_content, c.raw_text_content, ''))
             OR COALESCE(c.polished_text_content, c.translated_text_content, c.raw_text_content) IS NULL
           )
          THEN c.reader_formatted_text_content
          ELSE NULL
        END AS reader_formatted_text_content,
        c.reader_formatted_content_version,
        (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
        COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
      FROM chapters c
      WHERE c.story_id = $1
        AND c.chapter_number = $2
      LIMIT 1
    `,
    [storyId, chapterNumber, READER_CONTENT_FORMAT_VERSION]
  );

  if (!currentRows[0]) {
    notFound();
  }

  const current = mapChapter(currentRows[0]);
  const previousRows = await query<ChapterRow>(
    `
      SELECT
        c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
        c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
        (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
        COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
      FROM chapters c
      WHERE c.story_id = $1 AND c.chapter_number < $2
      ORDER BY c.chapter_number DESC
      LIMIT 1
    `,
    [storyId, chapterNumber]
  );
  const nextRows = await query<ChapterRow>(
    `
      SELECT
        c.id, c.story_id, c.chapter_number, c.title, c.is_downloaded, c.is_polished, c.is_translated,
        c.is_audio_generated, c.raw_text_path, c.translated_text_path, c.polished_text_path,
        c.raw_text_content, c.translated_text_content, c.polished_text_content,
        (c.is_audio_generated = TRUE AND c.audio_path IS NOT NULL) AS has_audio,
        COALESCE(c.polished_at, c.downloaded_at, c.updated_at, c.created_at) AS chapter_updated_at
      FROM chapters c
      WHERE c.story_id = $1 AND c.chapter_number > $2
      ORDER BY c.chapter_number ASC
      LIMIT 1
    `,
    [storyId, chapterNumber]
  );
  const chapterPage = await listChaptersCursor(storyId, {
    chapterNumber,
    limit: READER_CHAPTER_PAGE_SIZE
  });
  const contentPath = textPath(currentRows[0]);
  const formattedContent = readerFormattedContent(currentRows[0]);
  const content = formattedContent ?? textContent(currentRows[0]) ?? (await readProjectTextFile(contentPath));
  const chapter: ChapterDetail = {
    ...current,
    content,
    isContentPreformatted: Boolean(formattedContent),
    textPath: contentPath,
    audioUrl: current.hasAudio ? `/api/chapters/${current.id}/audio` : null,
    audioHlsUrl: current.hasAudio ? `/api/chapters/${current.id}/audio/hls/master.m3u8` : null
  };

  return {
    story,
    chapter,
    chapters: chapterPage.items,
    previousChapter: previousRows[0] ? mapChapter(previousRows[0]) : null,
    nextChapter: nextRows[0] ? mapChapter(nextRows[0]) : null,
    previousChapterCursor: chapterPage.previousCursor ?? null,
    chapterCursor: chapterPage.nextCursor
  };
}

export async function getFirstChapterNumber(storyId: string): Promise<number | null> {
  const rows = await query<{ chapter_number: number }>(
    "SELECT chapter_number FROM chapters WHERE story_id = $1 ORDER BY chapter_number ASC LIMIT 1",
    [storyId]
  );
  return rows[0]?.chapter_number ?? null;
}

export async function getChapterAudioPath(chapterId: string): Promise<string | null> {
  const rows = await query<{ audio_path: string | null }>(
    "SELECT audio_path FROM chapters WHERE id = $1 AND is_audio_generated = TRUE AND audio_path IS NOT NULL LIMIT 1",
    [chapterId]
  );
  return rows[0]?.audio_path ?? null;
}
