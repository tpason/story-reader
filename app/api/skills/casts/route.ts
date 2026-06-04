import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getCultivationLevelFromXp, resolveRealm } from "@/lib/cultivation";
import { effectiveSkillCooldownSeconds, effectiveSkillDurationMs, effectiveSkillIntensity, getSkill, visibleSkillsForAdmin } from "@/lib/skills";

export const dynamic = "force-dynamic";

type ChapterRow = {
  id: string;
  story_id: string;
};

type CastRow = {
  id: string;
  user_id: string;
  username: string;
  story_id: string;
  chapter_id: string;
  skill_id: string;
  target_scope: "chapter" | "story";
  caster_level: number;
  duration_ms: number;
  intensity: number;
  created_at: Date;
};

type CooldownRow = {
  skill_id: string;
  last_cast_at: Date;
};

type XpRow = {
  total_xp: string;
};

type CountRow = {
  active_count: string;
};

const MAX_ACTIVE_SKILL_CASTS = 2;
const ADMIN_MAX_ACTIVE_SKILL_CASTS = 5;
const ACTIVE_CAST_WINDOW_SECONDS = 10;

function castPayload(row: CastRow) {
  const skill = getSkill(row.skill_id);
  const realm = resolveRealm(row.caster_level);
  return {
    id: row.id,
    skillId: row.skill_id,
    skillName: skill?.name ?? row.skill_id,
    icon: skill?.icon ?? "leaf",
    storyId: row.story_id,
    chapterId: row.chapter_id,
    targetScope: row.target_scope,
    durationMs: row.duration_ms,
    intensity: row.intensity,
    createdAt: row.created_at.toISOString(),
    caster: {
      id: row.user_id,
      username: row.username,
      level: row.caster_level,
      ...realm
    }
  };
}

async function userLevel(userId: string) {
  const rows = await query<XpRow>(
    `
      SELECT (COALESCE(SUM(max_read_chapter_number), 0) * 100)::text AS total_xp
      FROM reader_reading_progress
      WHERE user_id = $1
    `,
    [userId]
  );
  return getCultivationLevelFromXp(Number(rows[0]?.total_xp ?? 0));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const chapterId = url.searchParams.get("chapterId");
  const storyId = url.searchParams.get("storyId");
  const after = url.searchParams.get("after");
  const afterDate = after ? new Date(after) : new Date(Date.now() - 30_000);

  if (!chapterId && !storyId) {
    return NextResponse.json({ items: [], skills: visibleSkillsForAdmin(Boolean(user?.isAdmin)), cooldowns: {} });
  }

  const rows = await query<CastRow>(
    `
      SELECT
        c.id, c.user_id, u.username, c.story_id, c.chapter_id, c.skill_id,
        c.target_scope, c.caster_level, c.duration_ms, c.intensity, c.created_at
      FROM reader_skill_casts c
      JOIN reader_users u ON u.id = c.user_id
      WHERE c.created_at > $1
        AND (
          ($2::uuid IS NOT NULL AND c.chapter_id = $2::uuid)
          OR ($3::uuid IS NOT NULL AND c.story_id = $3::uuid AND c.target_scope = 'story')
        )
      ORDER BY c.created_at ASC
      LIMIT 30
    `,
    [afterDate, chapterId, storyId]
  );

  let cooldowns: Record<string, number> = {};
  if (user) {
    const cooldownRows = await query<CooldownRow>(
      `
        SELECT DISTINCT ON (skill_id) skill_id, created_at AS last_cast_at
        FROM reader_skill_casts
        WHERE user_id = $1
        ORDER BY skill_id, created_at DESC
      `,
      [user.id]
    );
    cooldowns = Object.fromEntries(
      cooldownRows
        .map((row) => {
          const skill = getSkill(row.skill_id);
          if (!skill) return null;
          const elapsedSeconds = Math.floor((Date.now() - row.last_cast_at.getTime()) / 1000);
          return [row.skill_id, Math.max(0, effectiveSkillCooldownSeconds(skill, user.isAdmin) - elapsedSeconds)] as const;
        })
        .filter((entry): entry is readonly [string, number] => Boolean(entry && entry[1] > 0))
    );
  }

  return NextResponse.json({ items: rows.map(castPayload), skills: visibleSkillsForAdmin(Boolean(user?.isAdmin)), cooldowns, serverTime: new Date().toISOString() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tán tu chưa thể thi triển đạo pháp. Hãy nhập môn trước." }, { status: 401 });
  }

  const body = (await request.json()) as { skillId?: unknown; chapterId?: unknown };
  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
  const skill = getSkill(skillId);

  if (!skill) {
    return NextResponse.json({ error: "Đạo pháp không tồn tại." }, { status: 400 });
  }

  if (skill.adminOnly && !user.isAdmin) {
    return NextResponse.json({ error: "Đạo pháp này chỉ mở trong admin mode." }, { status: 403 });
  }

  const chapterRows = await query<ChapterRow>("SELECT id, story_id FROM chapters WHERE id = $1 LIMIT 1", [chapterId]);
  const chapter = chapterRows[0];
  if (!chapter) {
    return NextResponse.json({ error: "Không tìm thấy chương để thi triển đạo pháp." }, { status: 404 });
  }

  const level = await userLevel(user.id);
  if (!user.isAdmin && level < skill.minLevel) {
    return NextResponse.json(
      { error: `Cần đạt Lv.${skill.minLevel} để thi triển ${skill.name}.`, requiredLevel: skill.minLevel, currentLevel: level },
      { status: 403 }
    );
  }

  const cooldownSeconds = effectiveSkillCooldownSeconds(skill, user.isAdmin);
  const durationMs = effectiveSkillDurationMs(skill, user.isAdmin);
  const intensity = effectiveSkillIntensity(skill, user.isAdmin);

  const cooldownRows = await query<CooldownRow>(
    `
      SELECT skill_id, created_at AS last_cast_at
      FROM reader_skill_casts
      WHERE user_id = $1
        AND skill_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [user.id, skill.id]
  );
  const lastCastAt = cooldownRows[0]?.last_cast_at;
  if (lastCastAt) {
    const elapsedSeconds = Math.floor((Date.now() - lastCastAt.getTime()) / 1000);
    const remainingSeconds = cooldownSeconds - elapsedSeconds;
    if (remainingSeconds > 0) {
      return NextResponse.json({ error: "Đạo pháp đang hồi chiêu.", cooldownRemainingSeconds: remainingSeconds }, { status: 429 });
    }
  }

  const activeRows = await query<CountRow>(
    `
      SELECT COUNT(*)::text AS active_count
      FROM reader_skill_casts
      WHERE created_at > now() - ($1::int * interval '1 second')
        AND (
          chapter_id = $2::uuid
          OR (story_id = $3::uuid AND target_scope = 'story')
        )
    `,
    [ACTIVE_CAST_WINDOW_SECONDS, chapter.id, chapter.story_id]
  );
  const activeCount = Number(activeRows[0]?.active_count ?? 0);
  const activeLimit = user.isAdmin ? ADMIN_MAX_ACTIVE_SKILL_CASTS : MAX_ACTIVE_SKILL_CASTS;
  if (activeCount >= activeLimit) {
    return NextResponse.json(
      {
        error: `Linh khí đang dày đặc. Tối đa ${activeLimit} đạo pháp cùng lúc.`,
        activeLimit
      },
      { status: 429 }
    );
  }

  const rows = await query<CastRow>(
    `
      INSERT INTO reader_skill_casts (
        user_id, story_id, chapter_id, skill_id, target_scope, caster_level,
        duration_ms, intensity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id, user_id, (SELECT username FROM reader_users WHERE id = $1) AS username,
        story_id, chapter_id, skill_id, target_scope, caster_level,
        duration_ms, intensity, created_at
    `,
    [user.id, chapter.story_id, chapter.id, skill.id, skill.scope, user.isAdmin ? Math.max(level, skill.minLevel) : level, durationMs, intensity]
  );

  return NextResponse.json({ item: castPayload(rows[0]), cooldownSeconds }, { status: 201 });
}
