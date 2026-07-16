/**
 * Poetic ambient weather helpers for the xianxia world WebGL backdrop.
 * Client-only — callers must not read storage during SSR render.
 */

import type { TimeOfDay } from "@/lib/xianxia-time-of-day";

export type WeatherMode = "clear" | "rain" | "snow";

export const WEATHER_FORCE_KEY = "xi:weather-force";

export function readForcedWeather(): WeatherMode | null {
  try {
    const value = window.localStorage.getItem(WEATHER_FORCE_KEY);
    if (value === "rain" || value === "snow" || value === "clear") return value;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

/** Prefer rain by day/dusk; snow leans dawn/day. */
export function pickBurstMode(timeOfDay: Exclude<TimeOfDay, "night">, roll = Math.random()): "rain" | "snow" {
  if (timeOfDay === "dawn") return roll < 0.58 ? "snow" : "rain";
  if (timeOfDay === "dusk") return roll < 0.78 ? "rain" : "snow";
  return roll < 0.68 ? "rain" : "snow";
}

export function weatherParticleCount(
  mode: "rain" | "snow",
  tier: "mid" | "full",
): number {
  if (mode === "rain") return tier === "full" ? 72 : 44;
  return tier === "full" ? 52 : 32;
}

/** First idle is short so a session can actually see weather; later cycles are sparse. */
export const WEATHER_TIMING = {
  firstIdleMs: () => (45 + Math.random() * 105) * 1000,
  laterIdleMs: () => (8 + Math.random() * 12) * 60_000,
  burstMs: () => (2 + Math.random() * 3) * 60_000,
  /** Chance to start a burst when an idle ends */
  burstChance: 0.22,
} as const;
