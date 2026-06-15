import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

type RatingRow = {
  story_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: Date;
  updated_at: Date;
  avg_rating: string;
  total_ratings: string;
};

// GET /api/stories/[storyId]/rating — fetch aggregate + current user rating
export async function GET(_: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  if (!isStoryUuid(storyId)) return NextResponse.json({ error: "Invalid story" }, { status: 404 });

  const user = await getCurrentUser();

  const [agg] = await query<{ avg_rating: string; total_ratings: string }>(
    `SELECT
       ROUND(AVG(rating)::numeric, 2)::text AS avg_rating,
       COUNT(*)::text AS total_ratings
     FROM story_ratings WHERE story_id = $1`,
    [storyId]
  );

  let userRating: { rating: number; reviewText: string | null } | null = null;
  if (user) {
    const [row] = await query<{ rating: number; review_text: string | null }>(
      `SELECT rating, review_text FROM story_ratings WHERE story_id = $1 AND user_id = $2`,
      [storyId, user.id]
    );
    if (row) userRating = { rating: row.rating, reviewText: row.review_text };
  }

  return NextResponse.json({
    avgRating: agg?.avg_rating ? Number(agg.avg_rating) : null,
    totalRatings: agg?.total_ratings ? Number(agg.total_ratings) : 0,
    userRating
  });
}

// POST /api/stories/[storyId]/rating — upsert rating + optional review
export async function POST(request: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  if (!isStoryUuid(storyId)) return NextResponse.json({ error: "Invalid story" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }
  const reviewText = typeof body.reviewText === "string" ? body.reviewText.trim().slice(0, 2000) || null : null;

  await query(
    `INSERT INTO story_ratings (story_id, user_id, rating, review_text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (story_id, user_id)
     DO UPDATE SET rating = $3, review_text = $4, updated_at = now()`,
    [storyId, user.id, rating, reviewText]
  );

  const [agg] = await query<{ avg_rating: string; total_ratings: string }>(
    `SELECT ROUND(AVG(rating)::numeric, 2)::text AS avg_rating, COUNT(*)::text AS total_ratings
     FROM story_ratings WHERE story_id = $1`,
    [storyId]
  );

  return NextResponse.json({
    avgRating: agg?.avg_rating ? Number(agg.avg_rating) : null,
    totalRatings: agg?.total_ratings ? Number(agg.total_ratings) : 0,
    userRating: { rating, reviewText }
  });
}

// DELETE /api/stories/[storyId]/rating — remove user rating
export async function DELETE(_: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  if (!isStoryUuid(storyId)) return NextResponse.json({ error: "Invalid story" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query(`DELETE FROM story_ratings WHERE story_id = $1 AND user_id = $2`, [storyId, user.id]);
  return NextResponse.json({ ok: true });
}
