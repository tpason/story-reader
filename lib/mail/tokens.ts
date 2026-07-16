import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { query } from "@/lib/db";

export type EmailTokenPurpose = "verify" | "reset";

const TTL_HOURS: Record<EmailTokenPurpose, number> = {
  verify: 48,
  reset: 1
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function invalidateUnusedTokens(userId: string, purpose: EmailTokenPurpose) {
  await query(
    `
      UPDATE reader_email_tokens
      SET used_at = now()
      WHERE user_id = $1
        AND purpose = $2
        AND used_at IS NULL
    `,
    [userId, purpose]
  );
}

export async function createEmailToken(userId: string, purpose: EmailTokenPurpose) {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TTL_HOURS[purpose] * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO reader_email_tokens (user_id, purpose, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [userId, purpose, tokenHash, expiresAt]
  );

  return raw;
}

type ConsumedToken = { user_id: string; id: string };

export async function consumeEmailToken(
  rawToken: string,
  purpose: EmailTokenPurpose,
  client?: PoolClient
) {
  const tokenHash = hashToken(rawToken);
  const sql = `
    UPDATE reader_email_tokens
    SET used_at = now()
    WHERE token_hash = $1
      AND purpose = $2
      AND used_at IS NULL
      AND expires_at > now()
    RETURNING user_id, id
  `;

  if (client) {
    const result = await client.query<ConsumedToken>(sql, [tokenHash, purpose]);
    return result.rows[0] ?? null;
  }

  const rows = await query<ConsumedToken>(sql, [tokenHash, purpose]);
  return rows[0] ?? null;
}

export function hashOpaqueToken(token: string) {
  return hashToken(token);
}
