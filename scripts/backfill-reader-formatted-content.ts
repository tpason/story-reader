import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "../lib/formatNovelContent";

const DEFAULT_DATABASE_URL = "postgresql://betterbox:betterbox@127.0.0.1:54329/betterbox_story";
const PROJECT_ROOT = resolve(process.cwd(), "..");

type ChapterRow = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  raw_text_path: string | null;
  translated_text_path: string | null;
  polished_text_path: string | null;
  raw_text_content: string | null;
  translated_text_content: string | null;
  polished_text_content: string | null;
  reader_formatted_content_version: number | null;
  reader_formatted_source_hash: string | null;
  reader_formatted_text_content: string | null;
};

type Options = {
  limit: number;
  storyId: string | null;
  overwrite: boolean;
  dryRun: boolean;
  migrate: boolean;
  migrateOnly: boolean;
  polishedOnly: boolean;
};

function readOptions(): Options {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : null;
  };

  return {
    limit: Math.max(1, Number(option("--limit") ?? 100)),
    storyId: option("--story-id"),
    overwrite: args.includes("--overwrite"),
    dryRun: args.includes("--dry-run"),
    migrate: args.includes("--migrate"),
    migrateOnly: args.includes("--migrate-only"),
    polishedOnly: args.includes("--polished-only"),
  };
}

async function migrate(pool: Pool) {
  await pool.query(`
    ALTER TABLE chapters
      ADD COLUMN IF NOT EXISTS reader_formatted_text_content TEXT,
      ADD COLUMN IF NOT EXISTS reader_formatted_content_version INTEGER,
      ADD COLUMN IF NOT EXISTS reader_formatted_source TEXT,
      ADD COLUMN IF NOT EXISTS reader_formatted_source_hash TEXT,
      ADD COLUMN IF NOT EXISTS reader_formatted_at TIMESTAMPTZ
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chapters_reader_formatted_content
      ON chapters(story_id, chapter_number)
      WHERE reader_formatted_text_content IS NOT NULL
        AND reader_formatted_content_version IS NOT NULL
  `);
}

async function fetchCandidates(pool: Pool, options: Options) {
  const values: unknown[] = [READER_CONTENT_FORMAT_VERSION, options.overwrite, options.limit];
  const where = [
    `(
      $2::boolean
      OR reader_formatted_text_content IS NULL
      OR reader_formatted_content_version IS DISTINCT FROM $1::integer
      OR reader_formatted_source_hash IS DISTINCT FROM md5(COALESCE(polished_text_content, translated_text_content, raw_text_content, ''))
    )`,
    `(
      raw_text_content IS NOT NULL
      OR translated_text_content IS NOT NULL
      OR polished_text_content IS NOT NULL
      OR raw_text_path IS NOT NULL
      OR translated_text_path IS NOT NULL
      OR polished_text_path IS NOT NULL
    )`
  ];

  if (options.storyId) {
    values.push(options.storyId);
    where.push(`story_id = $${values.length}`);
  }

  if (options.polishedOnly) {
    where.push(`is_polished = TRUE`);
  }

  const rows = await pool.query<ChapterRow>(
    `
      SELECT
        id, story_id, chapter_number, title,
        raw_text_path, translated_text_path, polished_text_path,
        raw_text_content, translated_text_content, polished_text_content,
        reader_formatted_text_content, reader_formatted_content_version, reader_formatted_source_hash
      FROM chapters
      WHERE ${where.join(" AND ")}
      ORDER BY story_id, chapter_number
      LIMIT $3
    `,
    values
  );

  return rows.rows;
}

async function readProjectTextFile(pathValue: string | null) {
  if (!pathValue) return null;
  const absolutePath = resolve(PROJECT_ROOT, pathValue);
  if (!absolutePath.startsWith(PROJECT_ROOT)) return null;

  try {
    return await readFile(absolutePath, "utf8");
  } catch {
    return null;
  }
}

async function sourceText(row: ChapterRow) {
  if (row.polished_text_content) return { source: "polished", text: row.polished_text_content };
  if (row.translated_text_content) return { source: "translated", text: row.translated_text_content };
  if (row.raw_text_content) return { source: "raw", text: row.raw_text_content };
  if (row.polished_text_path) return { source: "polished", text: await readProjectTextFile(row.polished_text_path) };
  if (row.translated_text_path) return { source: "translated", text: await readProjectTextFile(row.translated_text_path) };
  if (row.raw_text_path) return { source: "raw", text: await readProjectTextFile(row.raw_text_path) };
  return { source: null, text: null };
}

function hashText(text: string) {
  return createHash("md5").update(text).digest("hex");
}

async function updateChapter(pool: Pool, row: ChapterRow, source: string, sourceHash: string, formattedContent: string, dryRun: boolean) {
  console.log(`[FORMAT] chapter=${row.id} story=${row.story_id} number=${row.chapter_number} source=${source}`);
  if (dryRun) return;

  await pool.query(
    `
      UPDATE chapters
      SET reader_formatted_text_content = $2,
          reader_formatted_content_version = $3,
          reader_formatted_source = $4,
          reader_formatted_source_hash = $5,
          reader_formatted_at = now(),
          updated_at = now()
      WHERE id = $1
    `,
    [row.id, formattedContent, READER_CONTENT_FORMAT_VERSION, source, sourceHash]
  );
}

async function main() {
  const options = readOptions();
  const pool = new Pool({ connectionString: process.env.STORY_DATABASE_URL ?? DEFAULT_DATABASE_URL });

  try {
    if (options.migrate) await migrate(pool);
    if (options.migrateOnly) {
      console.log("reader_formatted_content_schema=ready");
      return;
    }

    const rows = await fetchCandidates(pool, options);
    let changed = 0;
    let skipped = 0;
    let missing = 0;

    for (const row of rows) {
      const source = await sourceText(row);
      if (!source.source || !source.text) {
        missing += 1;
        continue;
      }

      const sourceHash = hashText(source.text);
      if (
        !options.overwrite &&
        row.reader_formatted_text_content &&
        row.reader_formatted_content_version === READER_CONTENT_FORMAT_VERSION &&
        row.reader_formatted_source_hash === sourceHash
      ) {
        skipped += 1;
        continue;
      }

      const formattedContent = formatNovelContent(source.text, undefined, row.title).join("\n\n");
      if (!formattedContent) {
        skipped += 1;
        continue;
      }

      changed += 1;
      await updateChapter(pool, row, source.source, sourceHash, formattedContent, options.dryRun);
    }

    console.log(
      `chapters_checked=${rows.length} chapters_changed=${changed} skipped=${skipped} missing_source=${missing} version=${READER_CONTENT_FORMAT_VERSION} dry_run=${options.dryRun}`
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
