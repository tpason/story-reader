import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";
import { buildPreviousChapterRecap } from "@/lib/reader-chapter-recap";
import { buildBilingualParagraphPairs } from "@/lib/reader-bilingual-pairs";
import { layerLanguage, listAvailableLayers, resolvePrimaryLayer } from "@/lib/reader-content-layers";
import { layerToParagraphs } from "@/lib/reader-content-layers-server";
import { supportsBilingualReader } from "@/lib/reader-source-language";
import type { BilingualParagraphPair } from "@/lib/reader-bilingual-pairs";
import type { ChapterDetail, ChapterSummary, CursorPage, Paginated, ReaderFetchOptions, ReaderPayload } from "@/lib/types";
import {
  READER_CHAPTER_PAGE_SIZE,
  chapterPageCursor,
  decodeCursor,
  encodeCursor,
  limitParams,
  mapChapter,
  pageParams,
  readProjectTextFile,
  readerFormattedContent,
  textContent,
  textPath,
  type ChapterRow
} from "./_internal";
import { getStory } from "./catalog";

export async function listChapters(storyId: string, options: { page?: number; pageSize?: number } = {}): Promise<Paginated<ChapterSummary>> {
  const { page, pageSize, offset } = pageParams(options.page, options.pageSize);
  // Run count and data queries in parallel — avoids N+1 while keeping correct total on out-of-range pages.
  const [countRows, rows] = await Promise.all([
    query<{ count: string }>("SELECT COUNT(*)::text AS count FROM chapters WHERE story_id = $1", [storyId]),
    query<ChapterRow>(
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
    ),
  ]);

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

export async function getReaderPayload(
  storyId: string,
  chapterNumber: number,
  options: ReaderFetchOptions = {}
): Promise<ReaderPayload> {
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
      WHERE c.story_id = $1 AND c.chapter_number < $2
      ORDER BY c.chapter_number DESC
      LIMIT 1
    `,
    [storyId, chapterNumber, READER_CONTENT_FORMAT_VERSION]
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
  const row = currentRows[0];
  const availableLayers = listAvailableLayers(row);
  const bilingualAllowed = supportsBilingualReader(story.sourceCode);
  const primaryLayer = resolvePrimaryLayer(availableLayers, options.primaryLayer);
  const secondaryLayer =
    bilingualAllowed &&
    options.secondaryLayer &&
    options.secondaryLayer !== primaryLayer &&
    availableLayers.includes(options.secondaryLayer)
      ? options.secondaryLayer
      : null;
  const displayMode = options.displayMode ?? "single";
  const bilingualActive = Boolean(secondaryLayer && displayMode !== "single");

  const primaryParagraphs = layerToParagraphs({ row, layer: primaryLayer, chapterTitle: current.title });
  const formattedContent = primaryLayer === "polished" ? readerFormattedContent(row) : null;
  const contentPath = textPath(row);
  const content =
    formattedContent ??
    (primaryParagraphs.length > 0 ? primaryParagraphs.join("\n\n") : null) ??
    textContent(row) ??
    (await readProjectTextFile(contentPath));

  let bilingualPairs: BilingualParagraphPair[] | undefined;
  if (bilingualActive && secondaryLayer) {
    const secondaryParagraphs = layerToParagraphs({ row, layer: secondaryLayer, chapterTitle: current.title });
    bilingualPairs = buildBilingualParagraphPairs({
      primaryParagraphs,
      secondaryParagraphs,
      primaryLayer,
      secondaryLayer,
      primaryLang: layerLanguage(primaryLayer, story.sourceCode),
      secondaryLang: layerLanguage(secondaryLayer, story.sourceCode)
    });
  }

  const chapter: ChapterDetail = {
    ...current,
    content,
    isContentPreformatted: Boolean(formattedContent),
    textPath: contentPath,
    audioUrl: current.hasAudio ? `/api/chapters/${current.id}/audio` : null,
    audioHlsUrl: current.hasAudio ? `/api/chapters/${current.id}/audio/hls/master.m3u8` : null,
    contentLayer: primaryLayer,
    availableContentLayers: availableLayers,
    bilingualPairs,
    bilingualEnabled: bilingualActive
  };

  let previousChapterRecap: string | null = null;
  if (previousRows[0]) {
    const previousFormatted = readerFormattedContent(previousRows[0]);
    const previousContent =
      previousFormatted ??
      textContent(previousRows[0]) ??
      (await readProjectTextFile(textPath(previousRows[0])));
    previousChapterRecap = buildPreviousChapterRecap(previousContent);
  }

  return {
    story,
    chapter,
    chapters: chapterPage.items,
    previousChapter: previousRows[0] ? mapChapter(previousRows[0]) : null,
    nextChapter: nextRows[0] ? mapChapter(nextRows[0]) : null,
    previousChapterRecap,
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

export type StoryContentSearchHit = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphIndex: number;
  excerpt: string;
};

export async function searchStoryChapterContent(
  storyId: string,
  search: string,
  options: { limit?: number } = {}
): Promise<StoryContentSearchHit[]> {
  const queryText = search.trim();
  const maxHits = Math.min(30, Math.max(1, options.limit ?? 20));
  if (queryText.length < 2) return [];

  const rows = await query<{
    id: string;
    chapter_number: number;
    title: string;
    content: string | null;
  }>(
    `
      SELECT
        c.id,
        c.chapter_number,
        c.title,
        COALESCE(c.polished_text_content, c.translated_text_content, c.raw_text_content) AS content
      FROM chapters c
      WHERE c.story_id = $1
        AND COALESCE(c.polished_text_content, c.translated_text_content, c.raw_text_content, '') ILIKE '%' || $2 || '%'
      ORDER BY c.chapter_number ASC
      LIMIT 24
    `,
    [storyId, queryText]
  );

  const needle = queryText.toLowerCase();
  const hits: StoryContentSearchHit[] = [];

  for (const row of rows) {
    if (!row.content) continue;
    const paragraphs = row.content.replace(/\r\n/g, "\n").split(/\n{2,}/);
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
      const paragraph = paragraphs[paragraphIndex]?.trim() ?? "";
      if (!paragraph || !paragraph.toLowerCase().includes(needle)) continue;
      const matchIndex = paragraph.toLowerCase().indexOf(needle);
      const start = Math.max(0, matchIndex - 48);
      const end = Math.min(paragraph.length, matchIndex + queryText.length + 48);
      const excerpt = `${start > 0 ? "…" : ""}${paragraph.slice(start, end).trim()}${end < paragraph.length ? "…" : ""}`;
      hits.push({
        chapterId: row.id,
        chapterNumber: row.chapter_number,
        chapterTitle: row.title,
        paragraphIndex,
        excerpt
      });
      if (hits.length >= maxHits) return hits;
    }
  }

  return hits;
}

export const getCachedChapterHead = unstable_cache(
  async (storyId: string, chapterNumber: number) => {
    const rows = await query<{ chapter_number: number; title: string }>(
      `SELECT chapter_number, title FROM chapters WHERE story_id = $1 AND chapter_number = $2 LIMIT 1`,
      [storyId, chapterNumber],
    );
    if (!rows[0]) return null;
    return { chapterNumber: rows[0].chapter_number, title: rows[0].title };
  },
  ["chapter-head"],
  { revalidate: 300 },
);
