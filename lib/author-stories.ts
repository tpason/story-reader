import { createHash, randomUUID } from "node:crypto";
import { revalidateAuthorPublicCaches } from "@/lib/author-cache";
import { query, withTransaction } from "@/lib/db";
import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";

export type StoryPublishStatus = "draft" | "published" | "hidden";
export type ChapterPublishStatus = "draft" | "published";

export type AuthorStory = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  author: string | null;
  totalChapters: number;
  isCompleted: boolean;
  publishStatus: StoryPublishStatus;
  primaryCategoryId: string | null;
  primaryCategoryName: string | null;
  updatedAt: string;
  createdAt: string;
};

export type AuthorChapter = {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  publishStatus: ChapterPublishStatus;
  content: string;
  wordCount: number;
  updatedAt: string;
};

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_CHAPTER_TITLE = 200;
const MAX_CHAPTER_CHARS = 200_000;
const MAX_CHAPTERS_PER_STORY = 500;

type StoryOwnerRow = {
  id: string;
  owner_user_id: string | null;
  publish_status: StoryPublishStatus;
  title: string;
  is_active: boolean;
};

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").trim().slice(0, max);
}

export function normalizePublishStatus(value: unknown, fallback: StoryPublishStatus = "draft"): StoryPublishStatus {
  if (value === "draft" || value === "published" || value === "hidden") return value;
  return fallback;
}

export function normalizeChapterStatus(value: unknown, fallback: ChapterPublishStatus = "draft"): ChapterPublishStatus {
  if (value === "draft" || value === "published") return value;
  return fallback;
}

function buildReaderFormatted(content: string, chapterTitle: string) {
  const paragraphs = formatNovelContent(content, undefined, chapterTitle);
  return paragraphs.join("\n\n");
}

function contentHash(content: string) {
  return createHash("md5").update(content).digest("hex");
}

async function getSelfPublishSourceId() {
  const rows = await query<{ id: string }>(
    `SELECT id::text AS id FROM sources WHERE code = 'self_publish' LIMIT 1`
  );
  if (!rows[0]) {
    throw new Error("Thiếu nguồn self_publish — chạy migration 037");
  }
  return rows[0].id;
}

export async function requireOwnedStory(storyId: string, userId: string): Promise<StoryOwnerRow> {
  const rows = await query<StoryOwnerRow>(
    `
      SELECT id::text AS id, owner_user_id::text AS owner_user_id, publish_status, title, is_active
      FROM stories
      WHERE id = $1
      LIMIT 1
    `,
    [storyId]
  );
  const row = rows[0];
  if (!row || row.owner_user_id !== userId) {
    const err = new Error("Không tìm thấy truyện hoặc không có quyền");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  return row;
}

export async function listAuthorStories(userId: string): Promise<AuthorStory[]> {
  const rows = await query<{
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    author: string | null;
    total_chapters: number;
    is_completed: boolean;
    publish_status: StoryPublishStatus;
    primary_category_id: string | null;
    primary_category_name: string | null;
    updated_at: Date;
    created_at: Date;
  }>(
    `
      SELECT
        s.id::text AS id,
        COALESCE(NULLIF(s.display_title, ''), s.title) AS title,
        s.description,
        s.cover_image_url,
        s.author,
        s.total_chapters,
        s.is_completed,
        s.publish_status,
        s.primary_category_id::text AS primary_category_id,
        cat.name AS primary_category_name,
        s.updated_at,
        s.created_at
      FROM stories s
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE s.owner_user_id = $1
      ORDER BY s.updated_at DESC
      LIMIT 200
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    author: row.author,
    totalChapters: row.total_chapters,
    isCompleted: row.is_completed,
    publishStatus: row.publish_status,
    primaryCategoryId: row.primary_category_id,
    primaryCategoryName: row.primary_category_name,
    updatedAt: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString()
  }));
}

export async function createAuthorStory(input: {
  userId: string;
  username: string;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  primaryCategoryId?: string | null;
  publishStatus?: StoryPublishStatus;
}): Promise<AuthorStory> {
  const title = cleanText(input.title, MAX_TITLE);
  if (title.length < 2) {
    throw Object.assign(new Error("Tiêu đề cần ít nhất 2 ký tự"), { status: 400 });
  }
  const description = cleanText(input.description ?? "", MAX_DESCRIPTION) || null;
  const coverImageUrl = cleanText(input.coverImageUrl ?? "", 500) || null;
  const publishStatus = normalizePublishStatus(input.publishStatus, "draft");
  const sourceId = await getSelfPublishSourceId();
  const storyKey = randomUUID();
  const sourceUrl = `self://u/${input.userId}/s/${storyKey}`;

  const rows = await query<{
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    author: string | null;
    total_chapters: number;
    is_completed: boolean;
    publish_status: StoryPublishStatus;
    primary_category_id: string | null;
    updated_at: Date;
    created_at: Date;
  }>(
    `
      INSERT INTO stories (
        source_id, source_story_id, title, original_title, display_title, author,
        language, source_url, description, cover_image_url, primary_category_id,
        owner_user_id, publish_status, total_chapters, is_completed, is_active, status
      )
      VALUES (
        $1, $2, $3, $3, $3, $4,
        'vi', $5, $6, $7, $8::uuid,
        $9::uuid, $10, 0, FALSE, TRUE, 'ongoing'
      )
      RETURNING
        id::text AS id, title, description, cover_image_url, author, total_chapters,
        is_completed, publish_status, primary_category_id::text AS primary_category_id,
        updated_at, created_at
    `,
    [
      sourceId,
      storyKey,
      title,
      input.username,
      sourceUrl,
      description,
      coverImageUrl,
      input.primaryCategoryId || null,
      input.userId,
      publishStatus
    ]
  );

  const row = rows[0]!;
  if (publishStatus === "published") {
    revalidateAuthorPublicCaches(row.id);
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    author: row.author,
    totalChapters: row.total_chapters,
    isCompleted: row.is_completed,
    publishStatus: row.publish_status,
    primaryCategoryId: row.primary_category_id,
    primaryCategoryName: null,
    updatedAt: row.updated_at.toISOString(),
    createdAt: row.created_at.toISOString()
  };
}

export async function updateAuthorStory(
  storyId: string,
  userId: string,
  patch: {
    title?: string;
    description?: string | null;
    coverImageUrl?: string | null;
    primaryCategoryId?: string | null;
    publishStatus?: StoryPublishStatus;
    isCompleted?: boolean;
  }
): Promise<AuthorStory> {
  await requireOwnedStory(storyId, userId);

  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [];

  if (patch.title !== undefined) {
    const title = cleanText(patch.title, MAX_TITLE);
    if (title.length < 2) throw Object.assign(new Error("Tiêu đề cần ít nhất 2 ký tự"), { status: 400 });
    values.push(title);
    sets.push(`title = $${values.length}`, `display_title = $${values.length}`, `original_title = $${values.length}`);
  }
  if (patch.description !== undefined) {
    values.push(cleanText(patch.description ?? "", MAX_DESCRIPTION) || null);
    sets.push(`description = $${values.length}`);
  }
  if (patch.coverImageUrl !== undefined) {
    values.push(cleanText(patch.coverImageUrl ?? "", 500) || null);
    sets.push(`cover_image_url = $${values.length}`);
  }
  if (patch.primaryCategoryId !== undefined) {
    values.push(patch.primaryCategoryId || null);
    sets.push(`primary_category_id = $${values.length}::uuid`);
  }
  if (patch.publishStatus !== undefined) {
    const status = normalizePublishStatus(patch.publishStatus, "draft");
    values.push(status);
    sets.push(`publish_status = $${values.length}`);
    if (status === "hidden") {
      sets.push("is_active = FALSE");
    } else if (status === "published" || status === "draft") {
      sets.push("is_active = TRUE");
    }
  }
  if (typeof patch.isCompleted === "boolean") {
    values.push(patch.isCompleted);
    sets.push(`is_completed = $${values.length}`);
  }

  values.push(storyId);
  await query(`UPDATE stories SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  revalidateAuthorPublicCaches(storyId);

  const listed = await listAuthorStories(userId);
  const found = listed.find((s) => s.id === storyId);
  if (!found) throw Object.assign(new Error("Không tìm thấy truyện"), { status: 404 });
  return found;
}

export async function listAuthorChapters(storyId: string, userId: string): Promise<AuthorChapter[]> {
  await requireOwnedStory(storyId, userId);
  const rows = await query<{
    id: string;
    story_id: string;
    chapter_number: number;
    title: string;
    publish_status: ChapterPublishStatus;
    content: string | null;
    updated_at: Date;
  }>(
    `
      SELECT
        id::text AS id,
        story_id::text AS story_id,
        chapter_number,
        title,
        publish_status,
        COALESCE(polished_text_content, raw_text_content, '') AS content,
        updated_at
      FROM chapters
      WHERE story_id = $1
      ORDER BY chapter_number ASC
    `,
    [storyId]
  );

  return rows.map((row) => {
    const content = row.content ?? "";
    return {
      id: row.id,
      storyId: row.story_id,
      chapterNumber: row.chapter_number,
      title: row.title,
      publishStatus: row.publish_status,
      content,
      wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
      updatedAt: row.updated_at.toISOString()
    };
  });
}

export async function getAuthorChapter(
  storyId: string,
  chapterNumber: number,
  userId: string
): Promise<AuthorChapter | null> {
  await requireOwnedStory(storyId, userId);
  const rows = await query<{
    id: string;
    story_id: string;
    chapter_number: number;
    title: string;
    publish_status: ChapterPublishStatus;
    content: string | null;
    updated_at: Date;
  }>(
    `
      SELECT
        id::text AS id,
        story_id::text AS story_id,
        chapter_number,
        title,
        publish_status,
        COALESCE(polished_text_content, raw_text_content, '') AS content,
        updated_at
      FROM chapters
      WHERE story_id = $1 AND chapter_number = $2
      LIMIT 1
    `,
    [storyId, chapterNumber]
  );
  const row = rows[0];
  if (!row) return null;
  const content = row.content ?? "";
  return {
    id: row.id,
    storyId: row.story_id,
    chapterNumber: row.chapter_number,
    title: row.title,
    publishStatus: row.publish_status,
    content,
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
    updatedAt: row.updated_at.toISOString()
  };
}

async function nextChapterNumber(storyId: string) {
  const rows = await query<{ n: string }>(
    `SELECT COALESCE(MAX(chapter_number), 0)::text AS n FROM chapters WHERE story_id = $1`,
    [storyId]
  );
  return Number(rows[0]?.n ?? 0) + 1;
}

async function refreshStoryChapterCount(storyId: string) {
  await query(
    `
      UPDATE stories
      SET total_chapters = (
            SELECT COUNT(*)::int FROM chapters WHERE story_id = $1 AND publish_status = 'published'
          ),
          updated_at = now()
      WHERE id = $1
    `,
    [storyId]
  );
}

export async function createAuthorChapter(
  storyId: string,
  userId: string,
  input: {
    title?: string;
    content: string;
    publishStatus?: ChapterPublishStatus;
    chapterNumber?: number;
  }
): Promise<AuthorChapter> {
  await requireOwnedStory(storyId, userId);
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM chapters WHERE story_id = $1`,
    [storyId]
  );
  if (Number(countRows[0]?.count ?? 0) >= MAX_CHAPTERS_PER_STORY) {
    throw Object.assign(new Error(`Tối đa ${MAX_CHAPTERS_PER_STORY} chương / truyện`), { status: 400 });
  }

  const content = cleanText(input.content, MAX_CHAPTER_CHARS);
  if (content.length < 20) {
    throw Object.assign(new Error("Nội dung chương quá ngắn"), { status: 400 });
  }
  const chapterNumber = input.chapterNumber && input.chapterNumber > 0
    ? Math.floor(input.chapterNumber)
    : await nextChapterNumber(storyId);
  const title = cleanText(input.title ?? `Chương ${chapterNumber}`, MAX_CHAPTER_TITLE) || `Chương ${chapterNumber}`;
  const publishStatus = normalizeChapterStatus(input.publishStatus, "draft");
  const formatted = buildReaderFormatted(content, title);
  const hash = contentHash(content);
  const sourceUrl = `self://s/${storyId}/c/${chapterNumber}`;

  const rows = await query<{
    id: string;
    story_id: string;
    chapter_number: number;
    title: string;
    publish_status: ChapterPublishStatus;
    updated_at: Date;
  }>(
    `
      INSERT INTO chapters (
        story_id, chapter_number, title, source_url, raw_language,
        raw_text_content, polished_text_content,
        reader_formatted_text_content, reader_formatted_content_version,
        reader_formatted_source_hash, reader_formatted_source, reader_formatted_at,
        is_downloaded, is_translated, is_polished, downloaded_at, polished_at,
        publish_status
      )
      VALUES (
        $1::uuid, $2, $3, $4, 'vi',
        $5, $5,
        $6, $7,
        $8, 'polished', now(),
        TRUE, TRUE, TRUE, now(), now(),
        $9
      )
      RETURNING id::text AS id, story_id::text AS story_id, chapter_number, title, publish_status, updated_at
    `,
    [storyId, chapterNumber, title, sourceUrl, content, formatted, READER_CONTENT_FORMAT_VERSION, hash, publishStatus]
  );

  await refreshStoryChapterCount(storyId);
  revalidateAuthorPublicCaches(storyId);
  const row = rows[0]!;
  return {
    id: row.id,
    storyId: row.story_id,
    chapterNumber: row.chapter_number,
    title: row.title,
    publishStatus: row.publish_status,
    content,
    wordCount: content.trim().split(/\s+/).length,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function updateAuthorChapter(
  storyId: string,
  chapterNumber: number,
  userId: string,
  patch: {
    title?: string;
    content?: string;
    publishStatus?: ChapterPublishStatus;
  }
): Promise<AuthorChapter> {
  await requireOwnedStory(storyId, userId);
  const existing = await getAuthorChapter(storyId, chapterNumber, userId);
  if (!existing) throw Object.assign(new Error("Không tìm thấy chương"), { status: 404 });

  const title = patch.title !== undefined
    ? cleanText(patch.title, MAX_CHAPTER_TITLE) || existing.title
    : existing.title;
  const content = patch.content !== undefined
    ? cleanText(patch.content, MAX_CHAPTER_CHARS)
    : existing.content;
  if (content.length < 20) {
    throw Object.assign(new Error("Nội dung chương quá ngắn"), { status: 400 });
  }
  const publishStatus = patch.publishStatus !== undefined
    ? normalizeChapterStatus(patch.publishStatus, existing.publishStatus)
    : existing.publishStatus;
  const formatted = buildReaderFormatted(content, title);
  const hash = contentHash(content);

  await query(
    `
      UPDATE chapters
      SET title = $3,
          raw_text_content = $4,
          polished_text_content = $4,
          reader_formatted_text_content = $5,
          reader_formatted_content_version = $6,
          reader_formatted_source_hash = $7,
          reader_formatted_source = 'polished',
          reader_formatted_at = now(),
          publish_status = $8,
          is_downloaded = TRUE,
          is_translated = TRUE,
          is_polished = TRUE,
          updated_at = now()
      WHERE story_id = $1 AND chapter_number = $2
    `,
    [storyId, chapterNumber, title, content, formatted, READER_CONTENT_FORMAT_VERSION, hash, publishStatus]
  );

  await refreshStoryChapterCount(storyId);
  revalidateAuthorPublicCaches(storyId);
  const updated = await getAuthorChapter(storyId, chapterNumber, userId);
  if (!updated) throw Object.assign(new Error("Không tìm thấy chương"), { status: 404 });
  return updated;
}

export async function deleteAuthorChapter(storyId: string, chapterNumber: number, userId: string) {
  await requireOwnedStory(storyId, userId);
  const result = await query<{ id: string }>(
    `DELETE FROM chapters WHERE story_id = $1 AND chapter_number = $2 RETURNING id::text AS id`,
    [storyId, chapterNumber]
  );
  if (!result[0]) throw Object.assign(new Error("Không tìm thấy chương"), { status: 404 });
  await refreshStoryChapterCount(storyId);
  revalidateAuthorPublicCaches(storyId);
}

export async function deleteAuthorStory(storyId: string, userId: string) {
  await requireOwnedStory(storyId, userId);
  await query(`DELETE FROM stories WHERE id = $1 AND owner_user_id = $2`, [storyId, userId]);
  revalidateAuthorPublicCaches(storyId);
}

export async function importAuthorChapters(
  storyId: string,
  userId: string,
  chapters: Array<{ title: string; content: string }>,
  options: { publishStatus?: ChapterPublishStatus; replaceDrafts?: boolean } = {}
) {
  await requireOwnedStory(storyId, userId);
  if (chapters.length === 0) {
    throw Object.assign(new Error("Không có chương để import"), { status: 400 });
  }
  if (chapters.length > 50) {
    throw Object.assign(new Error("Tối đa 50 chương mỗi lần import"), { status: 400 });
  }

  const publishStatus = normalizeChapterStatus(options.publishStatus, "draft");
  const created: AuthorChapter[] = [];

  await withTransaction(async (client) => {
    if (options.replaceDrafts) {
      await client.query(
        `DELETE FROM chapters WHERE story_id = $1 AND publish_status = 'draft'`,
        [storyId]
      );
    }
    let next = Number(
      (
        await client.query<{ n: string }>(
          `SELECT COALESCE(MAX(chapter_number), 0)::text AS n FROM chapters WHERE story_id = $1`,
          [storyId]
        )
      ).rows[0]?.n ?? 0
    );

    for (const chapter of chapters) {
      next += 1;
      const content = cleanText(chapter.content, MAX_CHAPTER_CHARS);
      if (content.length < 20) continue;
      const title = cleanText(chapter.title, MAX_CHAPTER_TITLE) || `Chương ${next}`;
      const formatted = buildReaderFormatted(content, title);
      const hash = contentHash(content);
      const sourceUrl = `self://s/${storyId}/c/${next}`;
      const inserted = await client.query<{
        id: string;
        story_id: string;
        chapter_number: number;
        title: string;
        publish_status: ChapterPublishStatus;
        updated_at: Date;
      }>(
        `
          INSERT INTO chapters (
            story_id, chapter_number, title, source_url, raw_language,
            raw_text_content, polished_text_content,
            reader_formatted_text_content, reader_formatted_content_version,
            reader_formatted_source_hash, reader_formatted_source, reader_formatted_at,
            is_downloaded, is_translated, is_polished, downloaded_at, polished_at,
            publish_status
          )
          VALUES (
            $1::uuid, $2, $3, $4, 'vi',
            $5, $5,
            $6, $7,
            $8, 'polished', now(),
            TRUE, TRUE, TRUE, now(), now(),
            $9
          )
          RETURNING id::text AS id, story_id::text AS story_id, chapter_number, title, publish_status, updated_at
        `,
        [storyId, next, title, sourceUrl, content, formatted, READER_CONTENT_FORMAT_VERSION, hash, publishStatus]
      );
      const row = inserted.rows[0]!;
      created.push({
        id: row.id,
        storyId: row.story_id,
        chapterNumber: row.chapter_number,
        title: row.title,
        publishStatus: row.publish_status,
        content,
        wordCount: content.trim().split(/\s+/).length,
        updatedAt: row.updated_at.toISOString()
      });
    }

    await client.query(
      `
        UPDATE stories
        SET total_chapters = (
              SELECT COUNT(*)::int FROM chapters WHERE story_id = $1 AND publish_status = 'published'
            ),
            updated_at = now()
        WHERE id = $1
      `,
      [storyId]
    );
  });

  if (created.length === 0) {
    throw Object.assign(new Error("Không có chương hợp lệ để import"), { status: 400 });
  }
  revalidateAuthorPublicCaches(storyId);
  return created;
}
