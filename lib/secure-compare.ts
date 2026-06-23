import { timingSafeEqual } from "node:crypto";

/** Constant-time string compare for shared secrets (Bearer tokens, API keys). */
export function secureTokenEqual(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
