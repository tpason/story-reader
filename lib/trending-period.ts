import type { TrendingPeriod } from "@/lib/types";

export const TRENDING_PERIODS: TrendingPeriod[] = ["day", "week", "month", "year"];

export const TRENDING_PERIOD_CHIP_LABELS: Record<TrendingPeriod, string> = {
  day: "Nhật",
  week: "Tuần",
  month: "Nguyệt",
  year: "Niên",
};

export const TRENDING_PERIOD_BANG_LABELS: Record<TrendingPeriod, string> = {
  day: "nhật bang",
  week: "tuần bang",
  month: "nguyệt bang",
  year: "niên bang",
};

export function parseTrendingPeriod(value?: string): TrendingPeriod {
  return TRENDING_PERIODS.includes(value as TrendingPeriod) ? (value as TrendingPeriod) : "week";
}
