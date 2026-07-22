import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import type { CategorySummary, CursorPage, Paginated, StorySummary } from "@/lib/types";
import {
  DEFAULT_PAGE_SIZE,
  STORY_HAS_DB_CHAPTERS_SQL,
  decodeCursor,
  encodeCursor,
  limitParams,
  mapStory,
  pageParams,
  storyOrderSql,
  type CategoryRow,
  type StoryRow
} from "./_internal";

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
  sort?: "updated" | "chapters" | "hot" | "title" | "trending" | "reader_rank";
} = {}): Promise<Paginated<StorySummary>> {
  const { page, pageSize, offset } = pageParams(options.page, options.pageSize);
  const where = ["s.is_active = TRUE", STORY_HAS_DB_CHAPTERS_SQL];
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
    where.push("(s.reader_rank IS NOT NULL OR s.rank_position IS NOT NULL)");
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
        s.cover_image_url, s.rank_name, s.rank_position,
        s.reader_rank, s.reader_score, s.reader_count_total, s.reader_count_30d,
        s.guest_count_total, s.guest_count_30d,
        s.total_chapters, s.is_completed,
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
  sort?: "updated" | "chapters" | "hot" | "title" | "trending" | "reader_rank";
} = {}): Promise<CursorPage<StorySummary>> {
  const limit = limitParams(options.limit, DEFAULT_PAGE_SIZE);
  const offset = decodeCursor(options.cursor);
  const where = ["s.is_active = TRUE", STORY_HAS_DB_CHAPTERS_SQL];
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
    where.push("(s.reader_rank IS NOT NULL OR s.rank_position IS NOT NULL)");
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
        s.cover_image_url, s.rank_name, s.rank_position,
        s.reader_rank, s.reader_score, s.reader_count_total, s.reader_count_30d,
        s.guest_count_total, s.guest_count_30d,
        s.total_chapters, s.is_completed,
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
      LEFT JOIN stories s ON s.id = sc.story_id
        AND s.is_active = TRUE
        AND ${STORY_HAS_DB_CHAPTERS_SQL}
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
      LEFT JOIN stories s ON s.id = sc.story_id
        AND s.is_active = TRUE
        AND ${STORY_HAS_DB_CHAPTERS_SQL}
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

export async function getStory(storyId: string): Promise<StorySummary> {
  const rows = await query<StoryRow>(
    `
      SELECT
        s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
        s.cover_image_url, s.rank_name, s.rank_position,
        s.reader_rank, s.reader_score, s.reader_count_total, s.reader_count_30d,
        s.guest_count_total, s.guest_count_30d,
        s.total_chapters, s.is_completed,
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
        s.cover_image_url, s.rank_name, s.rank_position,
        s.reader_rank, s.reader_score, s.reader_count_total, s.reader_count_30d,
        s.guest_count_total, s.guest_count_30d,
        s.total_chapters, s.is_completed,
        s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug
      FROM stories s
      CROSS JOIN current_story cs
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE s.is_active = TRUE
        AND s.id <> $1
        AND ${STORY_HAS_DB_CHAPTERS_SQL}
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

/** Default homepage catalog page 1 (no search/filters) — TTL matches `app/page.tsx` revalidate. */
export const getCachedDefaultHomeStories = unstable_cache(
  () => listStoriesCursor({ limit: 24, minChapters: 1 }),
  ["home-stories-default"],
  { revalidate: 60 }
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
