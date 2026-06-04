import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sanitizeReaderStyleConfig } from "@/lib/reader-preferences";

export const dynamic = "force-dynamic";

type PreferenceRow = {
  reader_style: unknown;
  performance_mode: string;
  focus_mode_default: boolean;
  updated_at: Date;
};

function mapPreferences(row: PreferenceRow) {
  return {
    readerStyle: sanitizeReaderStyleConfig(row.reader_style),
    performanceMode: row.performance_mode,
    focusModeDefault: row.focus_mode_default,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ preferences: null });

  const rows = await query<PreferenceRow>(
    `
      SELECT reader_style, performance_mode, focus_mode_default, updated_at
      FROM reader_preferences
      WHERE user_id = $1
      LIMIT 1
    `,
    [user.id]
  );

  return NextResponse.json({ preferences: rows[0] ? mapPreferences(rows[0]) : null });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập để sync cài đặt đọc." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    readerStyle?: unknown;
    performanceMode?: unknown;
    focusModeDefault?: unknown;
  };
  const readerStyle = sanitizeReaderStyleConfig(body.readerStyle);
  const performanceMode =
    body.performanceMode === "full_effects" || body.performanceMode === "battery_saver" || body.performanceMode === "balanced"
      ? body.performanceMode
      : "balanced";
  const focusModeDefault = Boolean(body.focusModeDefault);

  const rows = await query<PreferenceRow>(
    `
      INSERT INTO reader_preferences (user_id, reader_style, performance_mode, focus_mode_default, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        reader_style = EXCLUDED.reader_style,
        performance_mode = EXCLUDED.performance_mode,
        focus_mode_default = EXCLUDED.focus_mode_default,
        updated_at = now()
      RETURNING reader_style, performance_mode, focus_mode_default, updated_at
    `,
    [user.id, JSON.stringify(readerStyle), performanceMode, focusModeDefault]
  );

  return NextResponse.json({ preferences: mapPreferences(rows[0]) });
}
