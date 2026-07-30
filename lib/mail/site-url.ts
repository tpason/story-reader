/** Public origin for links inside transactional email (verify / reset / digest). */
export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_STORY_READER_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
