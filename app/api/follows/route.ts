import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type FollowRow = {
  story_id: string;
  story_title: string;
  cover_image_url: string | null;
  author: string | null;
  primary_category_name: string | null;
  total_chapters: number;
  updated_at: Date;
  followed_at: Date;
};

function mapFollow(row: FollowRow) {
  return {
    storyId: row.story_id,
    storyTitle: row.story_title,
    coverImageUrl: row.cover_image_url,
    author: row.author,
    primaryCategoryName: row.primary_category_name,
    totalChapters: row.total_chapters,
    lastKnownChapterNumber: row.total_chapters,
    updatedAt: row.updated_at.toISOString(),
    followedAt: row.followed_at.toISOString()
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });

  const rows = await query<FollowRow>(
    `
      SELECT
        f.story_id::text AS story_id,
        COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title,
        s.cover_image_url,
        s.author,
        cat.name AS primary_category_name,
        s.total_chapters,
        s.updated_at,
        f.followed_at
      FROM reader_story_follows f
      JOIN stories s ON s.id = f.story_id
      LEFT JOIN LATERAL (
        SELECT c.name
        FROM story_categories sc
        JOIN categories c ON c.id = sc.category_id
        WHERE sc.story_id = s.id
        ORDER BY (sc.category_id = s.primary_category_id) DESC, c.name ASC
        LIMIT 1
      ) cat ON TRUE
      WHERE f.user_id = $1
      ORDER BY f.followed_at DESC
      LIMIT 200
    `,
    [user.id]
  );

  return NextResponse.json({ items: rows.map(mapFollow) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần nhập môn để sync truyện theo dõi vào database" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { storyId?: unknown; storyIds?: unknown };
  const storyIds = Array.isArray(body.storyIds)
    ? body.storyIds.filter((item): item is string => typeof item === "string")
    : typeof body.storyId === "string"
      ? [body.storyId]
      : [];

  const uniqueStoryIds = [...new Set(storyIds)].slice(0, 200);
  if (uniqueStoryIds.length === 0) {
    return NextResponse.json({ error: "Invalid follow payload" }, { status: 400 });
  }

  const values: unknown[] = [user.id];
  const tuples = uniqueStoryIds.map((storyId) => {
    values.push(storyId);
    return `($1::uuid, $${values.length}::uuid, now(), now())`;
  });

  await query(
    `
      INSERT INTO reader_story_follows (user_id, story_id, followed_at, updated_at)
      VALUES ${tuples.join(", ")}
      ON CONFLICT (user_id, story_id)
      DO UPDATE SET updated_at = now()
    `,
    values
  );

  return GET();
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần nhập môn để sync truyện theo dõi vào database" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { storyId?: unknown };
  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  if (!storyId) return NextResponse.json({ error: "Invalid follow payload" }, { status: 400 });

  await query(
    `
      DELETE FROM reader_story_follows
      WHERE user_id = $1
        AND story_id = $2
    `,
    [user.id, storyId]
  );

  return NextResponse.json({ ok: true });
}
