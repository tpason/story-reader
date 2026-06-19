import type { TimeOfDay } from "@/components/xianxia-background/sceneConfig";
import type { GlobalTheme } from "@/lib/store";

export type { TimeOfDay };

/** Real clock: dawn 5–9, day 9–16, dusk 16–19, night otherwise. */
export function getClockTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

/**
 * Sky always follows the real clock.
 * Theme toggle (auto/dark/light) only affects UI chrome via data-xi-theme.
 */
export function resolveXianxiaTimeOfDay(_theme: GlobalTheme, date = new Date()): TimeOfDay {
  return getClockTimeOfDay(date);
}

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  dawn: "Bình minh",
  day: "Ban ngày",
  dusk: "Hoàng hôn",
  night: "Đêm trăng",
};

export const GLOBAL_THEME_LABELS: Record<GlobalTheme, string> = {
  auto: "Tự động",
  dark: "Tối",
  light: "Sáng",
};
