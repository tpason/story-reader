/**
 * Reader-specific flags. Site-wide WebGL gates live in `lib/app-features.ts`.
 */

import { siteAdminExtrasEnabled } from "@/lib/app-features";

/** Chapter audiobook player + related UI (hidden for all for now). */
export const READER_CHAPTER_AUDIO_UI_ENABLED = false;

/** Background music + ambient rain/wind in reader tools. */
export const READER_BACKGROUND_AUDIO_UI_ENABLED = false;

/** Tiểu hồ linh / cutie (still requires admin extras when re-enabled). */
export const READER_SPIRIT_COMPANION_UI_ENABLED = false;

/**
 * Decorative / heavy reader extras — only for admins:
 * skill WebGL casts, ambience WebGL, auto-scroll, advanced perf/FX toggles.
 */
export function readerAdminExtrasEnabled(isAdmin: boolean | null | undefined): boolean {
  return siteAdminExtrasEnabled(isAdmin);
}
