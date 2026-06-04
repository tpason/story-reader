import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type RecommendationRow = {
  id: string;
  title: string;
  display_title: string | null;
  author: string | null;
  cover_image_url: string | null;
  total_chapters: number;
  primary_category_name: string | null;
  score: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });

  const rows = await query<RecommendationRow>(
    `
      WITH user_categories AS (
        SELECT sc.category_id, COUNT(*) AS weight
        FROM reader_reading_progress rp
        JOIN story_categories sc ON sc.story_id = rp.story_id
        WHERE rp.user_id = $1
        GROUP BY sc.category_id
      ),
      read_stories AS (
        SELECT story_id FROM reader_reading_progress WHERE user_id = $1
        UNION
        SELECT story_id FROM reader_story_follows WHERE user_id = $1
      ),
      ranked AS (
        SELECT
          s.id, s.title, s.display_title, s.author, s.cover_image_url, s.total_chapters,
          pc.name AS primary_category_name,
          COALESCE(SUM(uc.weight), 0) + LEAST(s.total_chapters, 800) / 200.0 AS score
        FROM stories s
        LEFT JOIN story_categories sc ON sc.story_id = s.id
        LEFT JOIN user_categories uc ON uc.category_id = sc.category_id
        LEFT JOIN categories pc ON pc.id = s.primary_category_id
        WHERE NOT EXISTS (SELECT 1 FROM read_stories rs WHERE rs.story_id = s.id)
          AND s.total_chapters > 0
        GROUP BY s.id, pc.name
      )
      SELECT id, title, display_title, author, cover_image_url, total_chapters, primary_category_name, score::text
      FROM ranked
      ORDER BY score DESC, total_chapters DESC, title ASC
      LIMIT 12
    `,
    [user.id]
  );

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      title: row.display_title || row.title,
      author: row.author,
      coverImageUrl: row.cover_image_url,
      totalChapters: row.total_chapters,
      primaryCategoryName: row.primary_category_name,
      score: Number(row.score)
    }))
  });
}
