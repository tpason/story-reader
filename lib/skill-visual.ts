/**
 * Skill render policy — single source of truth.
 *
 * Desktop: WebGL primary (hoành tráng), CSS chỉ fallback khi WebGL tắt.
 * Mobile: CSS compact only — không WebGL, ưu tiên performance.
 */

export type SkillCssLayer =
  | "particles"
  | "wind"
  | "rain"
  | "thunder"
  | "creatures"
  | "petals"
  | "seal"
  | "meteors"
  | "lotus";

/** Desktop WebGL replaces these CSS layers (tránh double stack). */
const WEBGL_REPLACES_CSS: Partial<Record<string, SkillCssLayer[]>> = {
  wind_blade: ["wind", "particles"],
  summon_rain: ["rain", "particles"],
  celestial_rain: ["rain", "particles"],
  bean_soldiers: ["creatures", "particles"],
  sword_flight: ["creatures", "particles"],
  heaven_thunder: ["thunder", "particles"],
  hoa_long: ["creatures", "particles"],
  van_kiem: ["creatures", "particles"],
  dao_hoa_tan: ["petals", "particles"],
  thien_dia_an: ["seal", "particles"],
  lotus_domain: ["lotus", "particles"],
  starfall: ["meteors", "particles"],
};

/** Mobile có CSS creature / overlay compact. */
const MOBILE_CSS_LAYERS: Partial<Record<string, SkillCssLayer[]>> = {
  wind_blade: ["wind"],
  summon_rain: ["rain"],
  celestial_rain: ["rain"],
  bean_soldiers: ["creatures"],
  sword_flight: ["creatures"],
  heaven_thunder: ["thunder"],
  hoa_long: ["creatures"],
  van_kiem: ["creatures"],
  dao_hoa_tan: ["petals"],
  thien_dia_an: ["seal"],
  lotus_domain: ["lotus"],
  starfall: ["meteors"],
};

export const SKILL_POLICY = {
  desktop: {
    maxVisibleEffects: 2,
    spectacleIntensityMul: 1.28,
    webgl: true,
  },
  mobile: {
    maxVisibleEffects: 1,
    durationCapMs: 3600,
    webgl: false,
  },
} as const;

export function isSkillWebglActive(
  mobileOptimized: boolean,
  reduceMotion: boolean,
  decorativeWebgl: boolean,
): boolean {
  if (mobileOptimized || reduceMotion) return false;
  return decorativeWebgl;
}

export function shouldRenderCssLayer(
  skillId: string,
  layer: SkillCssLayer,
  mobileOptimized: boolean,
  skillWebgl: boolean,
): boolean {
  if (mobileOptimized) {
    return MOBILE_CSS_LAYERS[skillId]?.includes(layer) ?? false;
  }

  const replaced = WEBGL_REPLACES_CSS[skillId];
  if (replaced?.includes(layer)) {
    return !skillWebgl;
  }

  if (layer === "particles") {
    return !skillWebgl;
  }

  return false;
}

export function desktopSkillIntensity(baseIntensity: number): number {
  return Math.min(2.8, baseIntensity * SKILL_POLICY.desktop.spectacleIntensityMul);
}
