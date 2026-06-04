export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export const ASSET_BASE = "/assets/xianxia";

export const backgrounds: Record<TimeOfDay, string> = {
  dawn: `${ASSET_BASE}/backgrounds/dawn.png`,
  day:  `${ASSET_BASE}/backgrounds/day.png`,
  dusk: `${ASSET_BASE}/backgrounds/dusk.png`,
  night:`${ASSET_BASE}/backgrounds/night.png`,
};

export type SkyPreset = {
  elevation: number;       // sun degrees above horizon (0=horizon, 90=zenith)
  azimuth: number;         // compass degrees (0=north, 180=south/toward camera)
  turbidity: number;       // 0-20, atmospheric thickness
  rayleigh: number;        // 0-4, Rayleigh scattering (blue-sky intensity)
  mieCoefficient: number;  // 0.0-0.1
  mieDirectionalG: number; // 0-1
};

type ScenePreset = {
  background: string;
  // Position of procedural sun/moon disc in scene space — also used as GodRays source anchor
  celestialPos: [number, number, number];
  haze: string | null;
  lightRays: string | null;
  bloom: number;
  sky: SkyPreset | null;
  godRays: boolean;
  bgOpacity: number;
};

export const scenePresets: Record<TimeOfDay, ScenePreset> = {
  dawn: {
    background: backgrounds.dawn,
    celestialPos: [1.5, 1.4, -8.6],
    haze: `${ASSET_BASE}/atmosphere/haze_overlay_warm_01.png`,
    lightRays: `${ASSET_BASE}/atmosphere/light_rays_dawn_01.png`,
    bloom: 0.36,
    sky: {
      elevation: 7,
      azimuth: 50,
      turbidity: 13,
      rayleigh: 4.0,
      mieCoefficient: 0.006,
      mieDirectionalG: 0.85,
    },
    godRays: true,
    bgOpacity: 0.45,
  },
  day: {
    background: backgrounds.day,
    celestialPos: [1.6, 2.8, -8.6],
    haze: `${ASSET_BASE}/atmosphere/haze_overlay_warm_01.png`,
    lightRays: null,
    bloom: 0.18,
    sky: {
      elevation: 52,
      azimuth: 180,
      turbidity: 7,
      rayleigh: 1.8,
      mieCoefficient: 0.004,
      mieDirectionalG: 0.75,
    },
    godRays: false,
    bgOpacity: 0.32,
  },
  dusk: {
    background: backgrounds.dusk,
    celestialPos: [-1.4, 1.3, -8.6],
    haze: `${ASSET_BASE}/atmosphere/haze_overlay_warm_01.png`,
    lightRays: `${ASSET_BASE}/atmosphere/light_rays_dawn_01.png`,
    bloom: 0.34,
    sky: {
      elevation: 5,
      azimuth: 280,
      turbidity: 14,
      rayleigh: 4.0,
      mieCoefficient: 0.007,
      mieDirectionalG: 0.88,
    },
    godRays: true,
    bgOpacity: 0.45,
  },
  night: {
    background: backgrounds.night,
    celestialPos: [1.6, 2.4, -8.5],
    haze: `${ASSET_BASE}/atmosphere/haze_overlay_cool_01.png`,
    lightRays: `${ASSET_BASE}/atmosphere/light_rays_moon_01.png`,
    bloom: 0.46,
    sky: null,
    godRays: false,
    bgOpacity: 1.0,
  },
};

export const sharedLayers = {
  mountains: {
    far:  `${ASSET_BASE}/mountains/mountain_far_01.png`,
    mid:  `${ASSET_BASE}/mountains/mountain_mid_01.png`,
    near: `${ASSET_BASE}/mountains/mountain_near_01.png`,
  },
  clouds: {
    hero1:     `${ASSET_BASE}/clouds/cloud_hero_01.png`,
    hero2:     `${ASSET_BASE}/clouds/cloud_hero_02.png`,
    lowValley: `${ASSET_BASE}/clouds/cloud_low_valley_01.png`,
    mistBand:  `${ASSET_BASE}/clouds/mist_band_01.png`,
    fogWisp:   `${ASSET_BASE}/clouds/fog_wisp_01.png`,
  },
  cloudBank: [
    `${ASSET_BASE}/clouds/cloud_hero_01.png`,
    `${ASSET_BASE}/clouds/cloud_hero_02.png`,
    `${ASSET_BASE}/clouds/cloud_low_valley_01.png`,
    `${ASSET_BASE}/clouds/mist_band_01.png`,
  ],
  foreground: {
    bamboo: `${ASSET_BASE}/foreground/foreground_bamboo_01.png`,
    pine:   `${ASSET_BASE}/foreground/foreground_pine_branch_01.png`,
    reeds:  `${ASSET_BASE}/foreground/foreground_reeds_01.png`,
    rock:   `${ASSET_BASE}/foreground/foreground_rock_01.png`,
  },
};
