import { createHash } from "node:crypto";
import { query } from "@/lib/db";

export type ThrottlePurpose = "resend_verify" | "forgot_password";

type ThrottleRule = {
  subjectKey: string;
  maxHits: number;
  windowSeconds: number;
};

function windowEpoch(windowSeconds: number) {
  return Math.floor(Date.now() / 1000 / windowSeconds);
}

async function recordHit(purpose: ThrottlePurpose, subjectKey: string, windowSeconds: number) {
  const epoch = windowEpoch(windowSeconds);
  const rows = await query<{ hit_count: number }>(
    `
      INSERT INTO reader_email_throttle (purpose, subject_key, window_epoch, hit_count)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (purpose, subject_key, window_epoch)
      DO UPDATE SET
        hit_count = reader_email_throttle.hit_count + 1,
        updated_at = now()
      RETURNING hit_count
    `,
    [purpose, subjectKey, epoch]
  );
  return rows[0]?.hit_count ?? 1;
}

export function hashClientIp(ip: string) {
  return createHash("sha256").update(ip.trim()).digest("hex").slice(0, 32);
}

export async function checkThrottle(purpose: ThrottlePurpose, rules: ThrottleRule[]) {
  for (const rule of rules) {
    const hits = await recordHit(purpose, rule.subjectKey, rule.windowSeconds);
    if (hits > rule.maxHits) return false;
  }
  return true;
}

export function resendVerifyRules(userId: string, ipHash: string): ThrottleRule[] {
  return [
    { subjectKey: `user:${userId}:60`, maxHits: 1, windowSeconds: 60 },
    { subjectKey: `user:${userId}:3600`, maxHits: 5, windowSeconds: 3600 },
    { subjectKey: `ip:${ipHash}:3600`, maxHits: 20, windowSeconds: 3600 }
  ];
}

export function forgotPasswordRules(email: string, ipHash: string): ThrottleRule[] {
  const normalized = email.trim().toLowerCase();
  return [
    { subjectKey: `email:${normalized}:60`, maxHits: 1, windowSeconds: 60 },
    { subjectKey: `email:${normalized}:3600`, maxHits: 5, windowSeconds: 3600 },
    { subjectKey: `ip:${ipHash}:3600`, maxHits: 20, windowSeconds: 3600 }
  ];
}
