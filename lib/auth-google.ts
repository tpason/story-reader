import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import {
  createSession,
  findUserById,
  findUserByUsername,
  getCurrentUser,
  type ReaderUser
} from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo-text";

export const GOOGLE_PROVIDER = "google";
const OAUTH_STATE_COOKIE = "story_reader_oauth_state";
const OAUTH_META_COOKIE = "story_reader_oauth_meta";
const OAUTH_TTL_MS = 10 * 60 * 1000;

type OAuthMeta = {
  returnTo: string;
  intent: "login" | "link";
  exp: number;
};

type GoogleIdClaims = {
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  iss?: string;
  aud?: string | string[];
  exp?: string | number;
};

type OAuthAccountRow = {
  user_id: string;
};

function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || "";
}

function googleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
}

export function isGoogleAuthConfigured() {
  return Boolean(googleClientId() && googleClientSecret());
}

export function googleCallbackUrl() {
  return `${getSiteUrl()}/api/auth/callback/google`;
}

/** Only same-origin relative paths — block open redirects. */
export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return "/";
  if (trimmed.length > 512) return "/";
  return trimmed;
}

function oauthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

async function randomState() {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(24).toString("base64url");
}

export async function beginGoogleOAuth(input: {
  returnTo?: string | null;
  intent?: "login" | "link";
}) {
  if (!isGoogleAuthConfigured()) {
    throw new Error("Google OAuth is not configured");
  }

  const intent = input.intent === "link" ? "link" : "login";
  if (intent === "link") {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Link requires an authenticated session");
    }
  }

  const state = await randomState();
  const meta: OAuthMeta = {
    returnTo: sanitizeReturnTo(input.returnTo),
    intent,
    exp: Date.now() + OAUTH_TTL_MS
  };

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, oauthCookieOptions(Math.ceil(OAUTH_TTL_MS / 1000)));
  cookieStore.set(
    OAUTH_META_COOKIE,
    Buffer.from(JSON.stringify(meta), "utf8").toString("base64url"),
    oauthCookieOptions(Math.ceil(OAUTH_TTL_MS / 1000))
  );

  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online"
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function clearOAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, "", { ...oauthCookieOptions(0), maxAge: 0 });
  cookieStore.set(OAUTH_META_COOKIE, "", { ...oauthCookieOptions(0), maxAge: 0 });
}

export async function readOAuthMeta(stateFromQuery: string | null): Promise<OAuthMeta | null> {
  const cookieStore = await cookies();
  const expected = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const rawMeta = cookieStore.get(OAUTH_META_COOKIE)?.value;
  await clearOAuthCookies();

  if (!stateFromQuery || !expected || stateFromQuery !== expected || !rawMeta) return null;

  try {
    const meta = JSON.parse(Buffer.from(rawMeta, "base64url").toString("utf8")) as OAuthMeta;
    if (!meta || typeof meta.exp !== "number" || meta.exp < Date.now()) return null;
    meta.returnTo = sanitizeReturnTo(meta.returnTo);
    meta.intent = meta.intent === "link" ? "link" : "login";
    return meta;
  } catch {
    return null;
  }
}

async function exchangeGoogleCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    redirect_uri: googleCallbackUrl(),
    grant_type: "authorization_code"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { id_token?: string; access_token?: string };
}

/**
 * Cryptographic verification via Google tokeninfo (signature + claims).
 * Requires sub/aud/iss/exp and email_verified when present.
 */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdClaims | null> {
  if (!idToken) return null;

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" }
  );
  if (!response.ok) return null;

  const claims = (await response.json()) as GoogleIdClaims;
  if (!claims.sub || claims.exp == null || claims.exp === "") return null;

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(googleClientId())) return null;
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return null;
  if (Number(claims.exp) * 1000 < Date.now()) return null;

  return claims;
}

function emailVerified(claims: GoogleIdClaims) {
  return claims.email_verified === true || claims.email_verified === "true";
}

function usernameSeedFromClaims(claims: GoogleIdClaims) {
  const emailLocal = claims.email?.split("@")[0] ?? "";
  const fromEmail = emailLocal.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  if (fromEmail.length >= 3 && !fromEmail.includes("@")) return fromEmail;
  const fromName = (claims.name ?? "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
  if (fromName.length >= 3) return fromName;
  return `daohuu${claims.sub.slice(0, 6)}`;
}

async function allocateUniqueUsername(seed: string, client?: PoolClient) {
  const base = seed.slice(0, 24) || "daohuu";
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 18)}${1000 + Math.floor(Math.random() * 9000)}`;
    if (client) {
      const result = await client.query<{ id: string }>(
        `SELECT id FROM reader_users WHERE normalized_username = $1 LIMIT 1`,
        [candidate.toLowerCase()]
      );
      if (!result.rows[0]) return candidate;
    } else {
      const existing = await findUserByUsername(candidate);
      if (!existing) return candidate;
    }
  }
  return `daohuu${Date.now().toString(36)}`;
}

async function findOAuthUserId(subject: string, client?: PoolClient) {
  const sql = `
    SELECT user_id
    FROM reader_oauth_accounts
    WHERE provider = $1
      AND provider_subject = $2
    LIMIT 1
  `;
  if (client) {
    const result = await client.query<OAuthAccountRow>(sql, [GOOGLE_PROVIDER, subject]);
    return result.rows[0]?.user_id ?? null;
  }
  const rows = await query<OAuthAccountRow>(sql, [GOOGLE_PROVIDER, subject]);
  return rows[0]?.user_id ?? null;
}

/** Insert or confirm oauth row; returns the user_id actually linked to (google, sub). */
async function upsertOAuthAccount(
  client: PoolClient,
  input: {
    userId: string;
    subject: string;
    email: string;
    emailVerified: boolean;
  }
): Promise<string | null> {
  // One Google link per user (UNIQUE user_id, provider) — refuse swapping to another Google account.
  const alreadyLinked = await client.query<{ provider_subject: string }>(
    `
      SELECT provider_subject
      FROM reader_oauth_accounts
      WHERE user_id = $1
        AND provider = $2
      LIMIT 1
    `,
    [input.userId, GOOGLE_PROVIDER]
  );
  if (alreadyLinked.rows[0] && alreadyLinked.rows[0].provider_subject !== input.subject) {
    throw new Error("google_already_linked");
  }

  const inserted = await client.query<OAuthAccountRow>(
    `
      INSERT INTO reader_oauth_accounts (user_id, provider, provider_subject, email, email_verified)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider, provider_subject) DO NOTHING
      RETURNING user_id
    `,
    [input.userId, GOOGLE_PROVIDER, input.subject, input.email, input.emailVerified]
  );
  if (inserted.rows[0]?.user_id) return inserted.rows[0].user_id;

  const existing = await client.query<OAuthAccountRow>(
    `
      SELECT user_id
      FROM reader_oauth_accounts
      WHERE provider = $1
        AND provider_subject = $2
      LIMIT 1
    `,
    [GOOGLE_PROVIDER, input.subject]
  );
  const linkedUserId = existing.rows[0]?.user_id ?? null;
  if (!linkedUserId) return null;

  if (linkedUserId === input.userId) {
    await client.query(
      `
        UPDATE reader_oauth_accounts
        SET email = $3,
            email_verified = $4,
            updated_at = now()
        WHERE provider = $1
          AND provider_subject = $2
      `,
      [GOOGLE_PROVIDER, input.subject, input.email, input.emailVerified]
    );
  }

  return linkedUserId;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}

export type GoogleAuthResult =
  | { ok: true; user: ReaderUser; returnTo: string }
  | { ok: false; error: string; returnTo?: string };

async function sessionForUserId(userId: string): Promise<ReaderUser | null> {
  await createSession(userId);
  const row = await findUserById(userId);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    emailVerified: Boolean(row.email_verified_at),
    isAdmin: row.role === "admin"
  };
}

/**
 * Complete Google OAuth code exchange and map to our opaque session cookie.
 * Never logs tokens. Existing password accounts require explicit link (intent=link).
 */
export async function completeGoogleOAuth(input: {
  code: string | null;
  state: string | null;
}): Promise<GoogleAuthResult> {
  const meta = await readOAuthMeta(input.state);
  if (!meta) {
    return { ok: false, error: "google_state", returnTo: "/login" };
  }
  if (!input.code) {
    return { ok: false, error: "google_denied", returnTo: meta.returnTo };
  }
  if (!isGoogleAuthConfigured()) {
    return { ok: false, error: "google_config", returnTo: "/login" };
  }

  const tokenPayload = await exchangeGoogleCode(input.code);
  const claims = await verifyGoogleIdToken(tokenPayload?.id_token ?? "");
  if (!claims) {
    return { ok: false, error: "google_token", returnTo: "/login" };
  }

  const verified = emailVerified(claims);
  const email = claims.email?.trim().toLowerCase() || null;
  if (!email || !verified) {
    return { ok: false, error: "google_email", returnTo: "/login" };
  }

  if (meta.intent === "link") {
    const current = await getCurrentUser();
    if (!current) {
      return { ok: false, error: "google_link_auth", returnTo: "/login" };
    }

    try {
      await withTransaction(async (client) => {
        const existingOAuthUserId = await findOAuthUserId(claims.sub, client);
        if (existingOAuthUserId && existingOAuthUserId !== current.id) {
          throw new Error("google_link_taken");
        }

        const emailOwner = await client.query<{ id: string }>(
          `
            SELECT id
            FROM reader_users
            WHERE email IS NOT NULL
              AND LOWER(email) = $1
            LIMIT 1
          `,
          [email]
        );
        if (emailOwner.rows[0] && emailOwner.rows[0].id !== current.id) {
          throw new Error("google_link_email_taken");
        }

        const linkedUserId = await upsertOAuthAccount(client, {
          userId: current.id,
          subject: claims.sub,
          email,
          emailVerified: verified
        });
        if (linkedUserId !== current.id) {
          throw new Error("google_link_taken");
        }

        // Only verify/set email when it is missing or already equals the Google email.
        await client.query(
          `
            UPDATE reader_users
            SET email = CASE
                  WHEN email IS NULL OR LOWER(email) = $2 THEN $2
                  ELSE email
                END,
                email_verified_at = CASE
                  WHEN email IS NULL OR LOWER(email) = $2 THEN COALESCE(email_verified_at, now())
                  ELSE email_verified_at
                END,
                updated_at = now()
            WHERE id = $1
          `,
          [current.id, email]
        );
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (
        code === "google_link_taken" ||
        code === "google_link_email_taken" ||
        code === "google_already_linked"
      ) {
        return { ok: false, error: code, returnTo: "/account" };
      }
      if (isUniqueViolation(error)) {
        return { ok: false, error: "google_link_taken", returnTo: "/account" };
      }
      throw error;
    }

    return { ok: true, user: current, returnTo: sanitizeReturnTo(meta.returnTo) || "/account" };
  }

  type TxResult =
    | { kind: "existing"; userId: string }
    | { kind: "created"; user: ReaderUser }
    | { kind: "link_required"; email: string };

  let txResult: TxResult;
  try {
    txResult = await withTransaction(async (client) => {
      const existingOAuthUserId = await findOAuthUserId(claims.sub, client);
      if (existingOAuthUserId) {
        return { kind: "existing", userId: existingOAuthUserId };
      }

      const emailOwner = await client.query<{ id: string }>(
        `
          SELECT id
          FROM reader_users
          WHERE email IS NOT NULL
            AND LOWER(email) = $1
          LIMIT 1
          FOR UPDATE
        `,
        [email]
      );
      if (emailOwner.rows[0]) {
        return { kind: "link_required", email };
      }

      const username = await allocateUniqueUsername(usernameSeedFromClaims(claims), client);
      const created = await client.query<{
        id: string;
        username: string;
        email: string | null;
        email_verified_at: Date | null;
        role: "reader" | "admin";
      }>(
        `
          INSERT INTO reader_users (username, normalized_username, email, password_hash, email_verified_at)
          VALUES ($1, $2, $3, NULL, now())
          RETURNING id, username, email, email_verified_at, role
        `,
        [username, username.toLowerCase(), email]
      );
      const row = created.rows[0];
      if (!row) throw new Error("google_create");

      const linkedUserId = await upsertOAuthAccount(client, {
        userId: row.id,
        subject: claims.sub,
        email,
        emailVerified: true
      });

      // Race: another request linked this Google sub first — use that user, drop orphan carefully.
      if (linkedUserId && linkedUserId !== row.id) {
        await client.query(`DELETE FROM reader_users WHERE id = $1 AND password_hash IS NULL`, [row.id]);
        return { kind: "existing", userId: linkedUserId };
      }
      if (!linkedUserId) throw new Error("google_create");

      return {
        kind: "created",
        user: {
          id: row.id,
          username: row.username,
          email: row.email,
          emailVerified: true,
          isAdmin: row.role === "admin"
        }
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "google_create") {
      return { ok: false, error: "google_create", returnTo: "/login" };
    }
    if (isUniqueViolation(error)) {
      // Concurrent signup on same email or oauth subject — re-resolve without 500.
      const racedOAuthUserId = await findOAuthUserId(claims.sub);
      if (racedOAuthUserId) {
        const user = await sessionForUserId(racedOAuthUserId);
        if (!user) return { ok: false, error: "google_session", returnTo: "/login" };
        return { ok: true, user, returnTo: meta.returnTo };
      }
      return {
        ok: false,
        error: "google_link_required",
        returnTo: `/login?google_link=1&email=${encodeURIComponent(email)}`
      };
    }
    throw error;
  }

  if (txResult.kind === "link_required") {
    return {
      ok: false,
      error: "google_link_required",
      returnTo: `/login?google_link=1&email=${encodeURIComponent(txResult.email)}`
    };
  }

  if (txResult.kind === "existing") {
    const user = await sessionForUserId(txResult.userId);
    if (!user) return { ok: false, error: "google_session", returnTo: "/login" };
    return { ok: true, user, returnTo: meta.returnTo };
  }

  const user = await sessionForUserId(txResult.user.id);
  if (!user) return { ok: false, error: "google_session", returnTo: "/login" };
  return { ok: true, user, returnTo: meta.returnTo };
}
