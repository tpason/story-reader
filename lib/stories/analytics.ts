import { unstable_cache } from "next/cache";
import { cultivationFromTotalXp, effectiveCultivationLevel, maxCultivationProfile, XP_PER_CHAPTER } from "@/lib/cultivation";
import { query } from "@/lib/db";
import type { ReaderLeaderboardItem, ReaderLeaderboardScope, StoryTrendingItem, TrendingPeriod } from "@/lib/types";
import {
  limitParams,
  mapStory,
  type StoryRow
} from "./_internal";

export type TrendingRow = StoryRow & {
  trend_rank: number;
  unique_members: string;
  unique_guests: string;
  unique_readers: string;
  session_count: string;
  read_seconds: string;
  reader_rank: number | null;
  reader_score: string | null;
  reader_count_total: number | null;
  reader_count_30d: number | null;
  guest_count_total: number | null;
  guest_count_30d: number | null;
};

function periodInterval(period: TrendingPeriod): string {
  switch (period) {
    case "day":
      return "1 day";
    case "week":
      return "7 days";
    case "month":
      return "30 days";
    case "year":
      return "365 days";
    default:
      return "7 days";
  }
}

function mapTrendingRow(row: TrendingRow, index: number): StoryTrendingItem {
  const uniqueMembers = Number(row.unique_members ?? 0);
  const uniqueGuests = Number(row.unique_guests ?? 0);
  return {
    ...mapStory(row),
    trendRank: row.trend_rank || index + 1,
    uniqueMembers,
    uniqueGuests,
    uniqueReaders: Number(row.unique_readers ?? uniqueMembers + uniqueGuests),
    sessionCount: Number(row.session_count ?? 0),
    readSeconds: Number(row.read_seconds ?? 0),
    readerRank: row.reader_rank,
    readerScore: row.reader_score != null ? Number(row.reader_score) : null,
    readerCountTotal: row.reader_count_total ?? 0,
    readerCount30d: row.reader_count_30d ?? 0,
    guestCountTotal: row.guest_count_total ?? 0,
    guestCount30d: row.guest_count_30d ?? 0
  };
}

const STORY_SELECT = `
  s.id, COALESCE(NULLIF(s.display_title, ''), s.title) AS title, s.original_title, s.author, s.category, s.status, s.description,
  s.cover_image_url, s.rank_name, s.rank_position, s.total_chapters, s.is_completed,
  s.updated_at, src.code AS source_code, cat.name AS primary_category_name, cat.slug AS primary_category_slug,
  s.reader_rank, s.reader_score::text, s.reader_count_total, s.reader_count_30d,
  s.guest_count_total, s.guest_count_30d
`;

export async function listTrendingStories(
  period: TrendingPeriod = "week",
  limit = 20
): Promise<StoryTrendingItem[]> {
  const safeLimit = limitParams(limit, 20);
  const interval = periodInterval(period);

  const rows = await query<TrendingRow>(
    `
      WITH activity AS (
        SELECT
          rs.story_id,
          COUNT(DISTINCT rs.user_id) FILTER (WHERE rs.user_id IS NOT NULL)::text AS unique_members,
          COUNT(DISTINCT rs.anonymous_id) FILTER (WHERE rs.user_id IS NULL AND rs.anonymous_id IS NOT NULL)::text AS unique_guests,
          (
            COUNT(DISTINCT rs.user_id) FILTER (WHERE rs.user_id IS NOT NULL)
            + COUNT(DISTINCT rs.anonymous_id) FILTER (WHERE rs.user_id IS NULL AND rs.anonymous_id IS NOT NULL)
          )::text AS unique_readers,
          COUNT(*)::text AS session_count,
          COALESCE(SUM(rs.duration_seconds), 0)::text AS read_seconds,
          (
            COUNT(DISTINCT rs.user_id) FILTER (WHERE rs.user_id IS NOT NULL) * 12
            + COUNT(DISTINCT rs.anonymous_id) FILTER (WHERE rs.user_id IS NULL AND rs.anonymous_id IS NOT NULL) * 8
            + COUNT(*) * 2
            + COALESCE(SUM(rs.duration_seconds), 0) / 3600.0
          ) AS trend_score
        FROM reader_reading_sessions rs
        WHERE rs.started_at >= now() - $1::interval
        GROUP BY rs.story_id
      ),
      progress_only AS (
        SELECT
          rp.story_id,
          COUNT(DISTINCT rp.user_id)::text AS unique_members,
          '0'::text AS unique_guests,
          COUNT(DISTINCT rp.user_id)::text AS unique_readers,
          '0'::text AS session_count,
          '0'::text AS read_seconds,
          COUNT(DISTINCT rp.user_id) * 8.0 AS trend_score
        FROM reader_reading_progress rp
        WHERE rp.last_read_at >= now() - $1::interval
          AND NOT EXISTS (SELECT 1 FROM activity a WHERE a.story_id = rp.story_id)
        GROUP BY rp.story_id
      ),
      merged AS (
        SELECT * FROM activity
        UNION ALL
        SELECT * FROM progress_only
      )
      SELECT
        ${STORY_SELECT},
        m.unique_members, m.unique_guests, m.unique_readers, m.session_count, m.read_seconds,
        ROW_NUMBER() OVER (ORDER BY m.trend_score DESC, m.unique_readers::int DESC, s.reader_score DESC NULLS LAST, s.id ASC)::int AS trend_rank
      FROM merged m
      JOIN stories s ON s.id = m.story_id
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE s.is_active = TRUE
      ORDER BY m.trend_score DESC, m.unique_readers::int DESC, s.reader_score DESC NULLS LAST, s.id ASC
      LIMIT $2
    `,
    [interval, safeLimit]
  );

  return rows.map((row, index) => mapTrendingRow(row, index));
}

export async function listBetterBoxRankings(limit = 50, offset = 0): Promise<StoryTrendingItem[]> {
  const safeLimit = limitParams(limit, 50);
  const safeOffset = Math.max(0, offset);

  const rows = await query<TrendingRow>(
    `
      SELECT
        ${STORY_SELECT},
        '0'::text AS unique_members,
        '0'::text AS unique_guests,
        '0'::text AS unique_readers,
        '0'::text AS session_count,
        '0'::text AS read_seconds,
        COALESCE(s.reader_rank, 999999) AS trend_rank
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE s.is_active = TRUE
        AND s.reader_rank IS NOT NULL
      ORDER BY s.reader_rank ASC, s.reader_score DESC, s.id ASC
      LIMIT $1 OFFSET $2
    `,
    [safeLimit, safeOffset]
  );

  return rows.map((row, index) => mapTrendingRow(row, safeOffset + index));
}

export type SourceRankBoard = {
  sourceCode: string;
  rankName: string;
  storyCount: number;
};

export async function listSourceRankBoards(limit = 12): Promise<SourceRankBoard[]> {
  const rows = await query<{ source_code: string; rank_name: string; story_count: string }>(
    `
      SELECT src.code AS source_code, COALESCE(s.rank_name, 'general') AS rank_name, COUNT(*)::text AS story_count
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      WHERE s.is_active = TRUE
        AND s.rank_position IS NOT NULL
      GROUP BY src.code, COALESCE(s.rank_name, 'general')
      ORDER BY COUNT(*) DESC, src.code ASC, rank_name ASC
      LIMIT $1
    `,
    [limitParams(limit, 12)]
  );

  return rows.map((row) => ({
    sourceCode: row.source_code,
    rankName: row.rank_name,
    storyCount: Number(row.story_count)
  }));
}

export async function listSourceRankedStories(options: {
  sourceCode?: string;
  rankName?: string;
  limit?: number;
} = {}): Promise<StoryTrendingItem[]> {
  const safeLimit = limitParams(options.limit, 30);
  const where: string[] = ["s.is_active = TRUE", "s.rank_position IS NOT NULL"];
  const values: unknown[] = [];

  if (options.sourceCode) {
    values.push(options.sourceCode);
    where.push(`src.code = $${values.length}`);
  }
  if (options.rankName) {
    values.push(options.rankName);
    where.push(`COALESCE(s.rank_name, 'general') = $${values.length}`);
  }

  values.push(safeLimit);
  const rows = await query<TrendingRow>(
    `
      SELECT
        ${STORY_SELECT},
        '0'::text AS unique_members,
        '0'::text AS unique_guests,
        '0'::text AS unique_readers,
        '0'::text AS session_count,
        '0'::text AS read_seconds,
        s.rank_position AS trend_rank
      FROM stories s
      JOIN sources src ON src.id = s.source_id
      LEFT JOIN categories cat ON cat.id = s.primary_category_id
      WHERE ${where.join(" AND ")}
      ORDER BY s.rank_position ASC NULLS LAST, s.updated_at DESC, s.id ASC
      LIMIT $${values.length}
    `,
    values
  );

  return rows.map((row, index) => mapTrendingRow(row, index));
}

type MemberLeaderboardRow = {
  user_id: string;
  username: string;
  is_admin: boolean;
  session_count: number;
  read_seconds: string;
  story_count: number;
  chapters_reached: number;
  reader_score: string;
  rank: number;
};

type GuestLeaderboardRow = {
  anonymous_id: string;
  session_count: number;
  read_seconds: string;
  story_count: number;
  reader_score: string;
  rank: number;
};

function mapMemberRow(row: MemberLeaderboardRow): ReaderLeaderboardItem {
  const isAdmin = Boolean(row.is_admin);
  const chaptersReached = Number(row.chapters_reached ?? 0);
  const readingXp = chaptersReached * XP_PER_CHAPTER;
  const profile = isAdmin ? maxCultivationProfile() : cultivationFromTotalXp(readingXp);
  return {
    rank: row.rank,
    scope: "members",
    userId: row.user_id,
    anonymousId: null,
    displayName: row.username,
    isAdmin,
    sessionCount: Number(row.session_count ?? 0),
    readSeconds: Number(row.read_seconds ?? 0),
    storyCount: Number(row.story_count ?? 0),
    chaptersReached,
    cultivationLevel: effectiveCultivationLevel(profile.level, isAdmin),
    cultivationRealm: profile.realm,
    readerScore: Number(row.reader_score ?? 0)
  };
}

function mapGuestRow(row: GuestLeaderboardRow): ReaderLeaderboardItem {
  const suffix = row.anonymous_id.slice(-4);
  return {
    rank: row.rank,
    scope: "guests",
    userId: null,
    anonymousId: row.anonymous_id,
    displayName: `Tán tu ·${suffix}`,
    isAdmin: false,
    sessionCount: Number(row.session_count ?? 0),
    readSeconds: Number(row.read_seconds ?? 0),
    storyCount: Number(row.story_count ?? 0),
    chaptersReached: 0,
    cultivationLevel: 1,
    cultivationRealm: "Tán tu",
    readerScore: Number(row.reader_score ?? 0)
  };
}

export async function listTopReaders(
  scope: ReaderLeaderboardScope,
  period: TrendingPeriod = "week",
  limit = 30
): Promise<ReaderLeaderboardItem[]> {
  const safeLimit = limitParams(limit, 30);
  const interval = periodInterval(period);

  if (scope === "guests") {
    const rows = await query<GuestLeaderboardRow>(
      `
        WITH activity AS (
          SELECT
            rs.anonymous_id,
            COUNT(*)::int AS session_count,
            COALESCE(SUM(rs.duration_seconds), 0)::bigint AS read_seconds,
            COUNT(DISTINCT rs.story_id)::int AS story_count,
            (
              COUNT(*) * 3
              + COALESCE(SUM(rs.duration_seconds), 0) / 60.0
              + COUNT(DISTINCT rs.story_id) * 8
            ) AS reader_score
          FROM reader_reading_sessions rs
          WHERE rs.user_id IS NULL
            AND rs.anonymous_id IS NOT NULL
            AND rs.started_at >= now() - $1::interval
            AND COALESCE(rs.duration_seconds, 0) >= 5
          GROUP BY rs.anonymous_id
        )
        SELECT
          anonymous_id,
          session_count,
          read_seconds::text,
          story_count,
          reader_score::text,
          ROW_NUMBER() OVER (ORDER BY reader_score DESC, session_count DESC, read_seconds DESC, anonymous_id ASC)::int AS rank
        FROM activity
        ORDER BY reader_score DESC, session_count DESC, read_seconds DESC, anonymous_id ASC
        LIMIT $2
      `,
      [interval, safeLimit]
    );
    return rows.map(mapGuestRow);
  }

  const rows = await query<MemberLeaderboardRow>(
    `
      WITH activity AS (
        SELECT
          rs.user_id,
          COUNT(*)::int AS session_count,
          COALESCE(SUM(rs.duration_seconds), 0)::bigint AS read_seconds,
          COUNT(DISTINCT rs.story_id)::int AS story_count,
          (
            COUNT(*) * 3
            + COALESCE(SUM(rs.duration_seconds), 0) / 60.0
            + COUNT(DISTINCT rs.story_id) * 8
          ) AS reader_score
        FROM reader_reading_sessions rs
        WHERE rs.user_id IS NOT NULL
          AND rs.started_at >= now() - $1::interval
          AND COALESCE(rs.duration_seconds, 0) >= 5
        GROUP BY rs.user_id
      ),
      progress AS (
        SELECT user_id, COALESCE(SUM(max_read_chapter_number), 0)::int AS chapters_reached
        FROM reader_reading_progress
        GROUP BY user_id
      ),
      scored AS (
        SELECT
          a.user_id,
          a.session_count,
          a.read_seconds,
          a.story_count,
          COALESCE(p.chapters_reached, 0) AS chapters_reached,
          (a.reader_score + COALESCE(p.chapters_reached, 0) * 1.5) AS reader_score
        FROM activity a
        LEFT JOIN progress p ON p.user_id = a.user_id
      )
      SELECT
        u.id AS user_id,
        u.username,
        (u.role = 'admin') AS is_admin,
        s.session_count,
        s.read_seconds::text,
        s.story_count,
        s.chapters_reached,
        s.reader_score::text,
        ROW_NUMBER() OVER (ORDER BY s.reader_score DESC, s.session_count DESC, s.read_seconds DESC, u.username ASC)::int AS rank
      FROM scored s
      JOIN reader_users u ON u.id = s.user_id
      ORDER BY s.reader_score DESC, s.session_count DESC, s.read_seconds DESC, u.username ASC
      LIMIT $2
    `,
    [interval, safeLimit]
  );

  return rows.map(mapMemberRow);
}

export const getCachedTopReaders = unstable_cache(
  (scope: ReaderLeaderboardScope, period: TrendingPeriod, limit: number) => listTopReaders(scope, period, limit),
  ["top-readers-v1"],
  { revalidate: 300 }
);

export const getCachedTrendingStories = unstable_cache(
  (period: TrendingPeriod, limit: number) => listTrendingStories(period, limit),
  ["trending-stories-v2"],
  { revalidate: 300 }
);

export const getCachedBetterBoxRankings = unstable_cache(
  (limit: number) => listBetterBoxRankings(limit, 0),
  ["betterbox-rankings-v2"],
  { revalidate: 600 }
);
