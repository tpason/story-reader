export type SkillPalette = {
  primary: string;
  secondary: string;
  hot: string;
  particleCount: number;
  ringCount: number;
  speed: number;
};

export type SkillBloomConfig = {
  strength: number;
  radius: number;
  threshold: number;
  afterimage?: number;
};

const DESKTOP_SPECTACLE = 1.38;

export const SKILL_WEBGL_PALETTES: Record<string, SkillPalette> = {
  wind_blade: {
    primary: "#38b8a0",
    secondary: "#f0d06a",
    hot: "#fef9c3",
    particleCount: 110,
    ringCount: 3,
    speed: 1.18
  },
  summon_rain: {
    primary: "#5eb8d4",
    secondary: "#2dd4bf",
    hot: "#e8f6fa",
    particleCount: 210,
    ringCount: 5,
    speed: 0.9
  },
  bean_soldiers: {
    primary: "#facc15",
    secondary: "#fb7185",
    hot: "#22c55e",
    particleCount: 92,
    ringCount: 3,
    speed: 0.92
  },
  sword_flight: {
    primary: "#2f8f72",
    secondary: "#f0d06a",
    hot: "#f5f0e6",
    particleCount: 118,
    ringCount: 4,
    speed: 1.36
  },
  lotus_domain: {
    primary: "#e8a0b8",
    secondary: "#2f8f72",
    hot: "#fef9c3",
    particleCount: 128,
    ringCount: 5,
    speed: 0.78
  },
  celestial_rain: {
    primary: "#e0f2fe",
    secondary: "#67e8f9",
    hot: "#ffffff",
    particleCount: 260,
    ringCount: 6,
    speed: 1.06
  },
  heaven_thunder: {
    primary: "#fde047",
    secondary: "#ffffff",
    hot: "#fb923c",
    particleCount: 86,
    ringCount: 5,
    speed: 1.52
  },
  starfall: {
    primary: "#1e6b8a",
    secondary: "#f0d06a",
    hot: "#ffffff",
    particleCount: 132,
    ringCount: 4,
    speed: 1.28
  },
  hoa_long: {
    primary: "#ff7722",
    secondary: "#ffd700",
    hot: "#ffffff",
    particleCount: 140,
    ringCount: 4,
    speed: 1.44
  },
  van_kiem: {
    primary: "#c8962e",
    secondary: "#f5e6b8",
    hot: "#ffffff",
    particleCount: 100,
    ringCount: 4,
    speed: 1.32
  },
  dao_hoa_tan: {
    primary: "#f9a8d4",
    secondary: "#fce7f3",
    hot: "#fff1f2",
    particleCount: 148,
    ringCount: 5,
    speed: 0.72
  },
  thien_dia_an: {
    primary: "#fbbf24",
    secondary: "#dc2626",
    hot: "#ffffff",
    particleCount: 180,
    ringCount: 7,
    speed: 0.88
  }
};

const DEFAULT_PALETTE: SkillPalette = {
  primary: "#2f8f72",
  secondary: "#f0d06a",
  hot: "#f5f0e6",
  particleCount: 96,
  ringCount: 3,
  speed: 1
};

export function scaleSkillPalette(palette: SkillPalette): SkillPalette {
  return {
    ...palette,
    particleCount: Math.round(palette.particleCount * DESKTOP_SPECTACLE),
    ringCount: Math.min(8, palette.ringCount + 1),
    speed: palette.speed * 1.1
  };
}

export function getSkillWebglPalette(skillId: string): SkillPalette {
  return SKILL_WEBGL_PALETTES[skillId] ?? DEFAULT_PALETTE;
}

export function getSkillBloomConfig(skillId: string, effectPower: number): SkillBloomConfig {
  const p = effectPower * 1.12;
  switch (skillId) {
    case "heaven_thunder":
      return { strength: 2.45 * p, radius: 0.56, threshold: 0 };
    case "sword_flight":
      return { strength: 2.05 * p, radius: 0.32, threshold: 0, afterimage: 0.9 };
    case "wind_blade":
      return { strength: 1.85 * p, radius: 0.38, threshold: 0, afterimage: 0.86 };
    case "starfall":
      return { strength: 2.25 * p, radius: 0.44, threshold: 0, afterimage: 0.8 };
    case "celestial_rain":
      return { strength: 1.55 * p, radius: 0.62, threshold: 0 };
    case "summon_rain":
      return { strength: 1.25 * p, radius: 0.58, threshold: 0 };
    case "lotus_domain":
      return { strength: 1.35 * p, radius: 0.54, threshold: 0 };
    case "bean_soldiers":
      return { strength: 1.15 * p, radius: 0.48, threshold: 0 };
    case "hoa_long":
      return { strength: 2.65 * p, radius: 0.5, threshold: 0, afterimage: 0.86 };
    case "van_kiem":
      return { strength: 2.45 * p, radius: 0.36, threshold: 0, afterimage: 0.84 };
    case "dao_hoa_tan":
      return { strength: 1.55 * p, radius: 0.58, threshold: 0 };
    case "thien_dia_an":
      return { strength: 3.1 * p, radius: 0.66, threshold: 0 };
    default:
      return { strength: 1.35 * p, radius: 0.46, threshold: 0 };
  }
}
