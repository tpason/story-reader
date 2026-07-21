/**
 * Site-wide product flags — keep xianxia CSS vibe for everyone.
 * Decorative WebGL is public again on non-chapter pages; chapter routes
 * still skip world backdrop (see XianxiaWorldBackgroundClient).
 */

/** When true, Three.js decorative layers require admin (CSS backdrop stays). */
export const SITE_DECORATIVE_WEBGL_ADMIN_ONLY = false;

export function siteAdminExtrasEnabled(isAdmin: boolean | null | undefined): boolean {
  return Boolean(isAdmin);
}

/** World bg WebGL, MotionFX WebGL, cultivation aura, story stage, etc. */
export function siteDecorativeWebglAllowed(isAdmin: boolean | null | undefined): boolean {
  if (!SITE_DECORATIVE_WEBGL_ADMIN_ONLY) return true;
  return siteAdminExtrasEnabled(isAdmin);
}
