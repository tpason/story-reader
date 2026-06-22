import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";
import type { Paginated, StoryDiscoveryItem } from "@/lib/types";
import {
  limitParams,
  mapDiscoveryStory,
  pageParams,
  type StoryDiscoveryRow
} from "./_internal";

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
