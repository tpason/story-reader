import { timingSafeEqual } from "node:crypto";

export function verifyDigestCronToken(request: Request) {
  const expected = process.env.MAIL_DIGEST_CRON_TOKEN?.trim();
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length).trim();
  if (!provided || provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
