/**
 * Site-wide product flags — keep xianxia CSS vibe for everyone,
 * park heavy decorative WebGL / extras behind admin until UX is leaner.
 */

/** When true, Three.js decorative layers require admin (CSS backdrop stays). */
export const SITE_DECORATIVE_WEBGL_ADMIN_ONLY = true;

export function siteAdminExtrasEnabled(isAdmin: boolean | null | undefined): boolean {
  return Boolean(isAdmin);
}

/** World bg WebGL, MotionFX WebGL, cultivation aura, story stage, etc. */
export function siteDecorativeWebglAllowed(isAdmin: boolean | null | undefined): boolean {
  if (!SITE_DECORATIVE_WEBGL_ADMIN_ONLY) return true;
  return siteAdminExtrasEnabled(isAdmin);
}
