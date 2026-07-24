export type ProgressCursor = { t: string; id: string };

// Shape check only — Postgres uuid cast still needs 8-4-4-4-12 hex.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeProgressCursor(row: { storyId: string; lastReadAt: Date }): string {
  return Buffer.from(
    JSON.stringify({ t: row.lastReadAt.toISOString(), id: row.storyId }),
    "utf8"
  ).toString("base64url");
}

export function decodeProgressCursor(raw: string | null): ProgressCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as ProgressCursor;
    if (typeof parsed?.t !== "string" || typeof parsed?.id !== "string") return null;
    const ms = Date.parse(parsed.t);
    if (!Number.isFinite(ms)) return null;
    if (!UUID_RE.test(parsed.id)) return null;
    return { t: new Date(ms).toISOString(), id: parsed.id.toLowerCase() };
  } catch {
    return null;
  }
}

/** Parse `limit` query: missing → default 100; invalid → 100; clamp 1–100. */
export function parseReadingProgressLimit(raw: string | null, fallback = 100): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(1, Math.floor(n)));
}
