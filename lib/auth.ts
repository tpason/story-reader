import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db";
import { consumeEmailToken } from "@/lib/mail/tokens";

const SESSION_COOKIE = "story_reader_session";
const SESSION_DAYS = 30;
const PASSWORD_KEY_LENGTH = 64;

export type ReaderUser = {
  id: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
};

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  email_verified_at: Date | null;
  password_hash: string;
  role: "reader" | "admin";
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function cryptoModule() {
  return import("node:crypto");
}

async function hashToken(token: string) {
  const { createHash } = await cryptoModule();
  return createHash("sha256").update(token).digest("hex");
}

function mapUser(row: Pick<UserRow, "id" | "username" | "email" | "email_verified_at" | "role">): ReaderUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    emailVerified: Boolean(row.email_verified_at),
    isAdmin: row.role === "admin"
  };
}

export function cleanAuthInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function hashPassword(password: string) {
  const { randomBytes, scrypt: scryptCallback } = await cryptoModule();
  const scrypt = promisify(scryptCallback);
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const { scrypt: scryptCallback, timingSafeEqual } = await cryptoModule();
  const scrypt = promisify(scryptCallback);
  const [algorithm, salt, storedKey] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;

  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(storedKey, "hex");
  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}

export async function findUserByUsername(username: string) {
  const rows = await query<UserRow>(
    `
      SELECT id, username, email, email_verified_at, password_hash, role
      FROM reader_users
      WHERE normalized_username = $1
      LIMIT 1
    `,
    [normalizeUsername(username)]
  );

  return rows[0] ?? null;
}

export async function findUsersByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];

  return query<UserRow>(
    `
      SELECT id, username, email, email_verified_at, password_hash, role
      FROM reader_users
      WHERE email IS NOT NULL
        AND LOWER(email) = $1
    `,
    [normalizedEmail]
  );
}

/** Exact one match only — null when missing or ambiguous (case-variant duplicates). */
export async function findUserByEmail(email: string) {
  const rows = await findUsersByEmail(email);
  return rows.length === 1 ? rows[0] : null;
}

/** Login identifier: username, or email when it contains `@`. */
export async function findUserByUsernameOrEmail(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return findUserByEmail(trimmed);
  }

  return findUserByUsername(trimmed);
}

export async function createUser(username: string, email: string | null, password: string) {
  const passwordHash = await hashPassword(password);
  const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : "";
  const rows = await query<UserRow>(
    `
      INSERT INTO reader_users (username, normalized_username, email, password_hash)
      VALUES ($1, $2, NULLIF($3, ''), $4)
      RETURNING id, username, email, email_verified_at, password_hash, role
    `,
    [username.trim(), normalizeUsername(username), normalizedEmail, passwordHash]
  );

  return mapUser(rows[0]);
}

export async function createSession(userId: string) {
  const { randomBytes } = await cryptoModule();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO reader_sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM reader_sessions WHERE token_hash = $1", [await hashToken(token)]);
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await query<UserRow>(
    `
      SELECT u.id, u.username, u.email, u.email_verified_at, u.password_hash, u.role
      FROM reader_sessions s
      JOIN reader_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
      LIMIT 1
    `,
    [await hashToken(token)]
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(userId: string) {
  const rows = await query<UserRow>(
    `
      SELECT id, username, email, email_verified_at, password_hash, role
      FROM reader_users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function attachUserEmail(userId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await query<UserRow>(
    `
      UPDATE reader_users
      SET email = $2,
          email_verified_at = NULL,
          updated_at = now()
      WHERE id = $1
      RETURNING id, username, email, email_verified_at, password_hash, role
    `,
    [userId, normalizedEmail]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function verifyUserEmail(userId: string, client?: PoolClient) {
  const sql = `
    UPDATE reader_users
    SET email_verified_at = COALESCE(email_verified_at, now()),
        updated_at = now()
    WHERE id = $1
    RETURNING id, username, email, email_verified_at, password_hash, role
  `;
  if (client) {
    const result = await client.query<UserRow>(sql, [userId]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }
  const rows = await query<UserRow>(sql, [userId]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function invalidateUserSessions(userId: string, client?: PoolClient) {
  const sql = `DELETE FROM reader_sessions WHERE user_id = $1`;
  if (client) {
    await client.query(sql, [userId]);
    return;
  }
  await query(sql, [userId]);
}

export async function resetPasswordWithToken(rawToken: string, password: string) {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    const consumed = await consumeEmailToken(rawToken, "reset", client);
    if (!consumed) return null;

    await client.query(
      `
        UPDATE reader_users
        SET password_hash = $2,
            updated_at = now()
        WHERE id = $1
      `,
      [consumed.user_id, passwordHash]
    );
    await invalidateUserSessions(consumed.user_id, client);

    const result = await client.query<UserRow>(
      `
        SELECT id, username, email, email_verified_at, password_hash, role
        FROM reader_users
        WHERE id = $1
        LIMIT 1
      `,
      [consumed.user_id]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  });
}

export async function verifyEmailWithToken(rawToken: string) {
  return withTransaction(async (client) => {
    const consumed = await consumeEmailToken(rawToken, "verify", client);
    if (!consumed) return null;
    return verifyUserEmail(consumed.user_id, client);
  });
}
