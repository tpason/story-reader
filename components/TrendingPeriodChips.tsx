import type { Route } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { TRENDING_PERIOD_CHIP_LABELS, TRENDING_PERIODS } from "@/lib/trending-period";
import type { TrendingPeriod } from "@/lib/types";

type TrendingPeriodChipsProps = {
  period: TrendingPeriod;
  hrefForPeriod: (period: TrendingPeriod) => Route;
  className?: string;
};

export function TrendingPeriodChips({ period, hrefForPeriod, className }: TrendingPeriodChipsProps) {
  return (
    <div className={["filters trending-period-tabs", className].filter(Boolean).join(" ")} aria-label="Kỳ phong vân">
      {TRENDING_PERIODS.map((p) => (
        <Link key={p} className={`chip ${period === p ? "chip-active" : ""}`} href={hrefForPeriod(p)}>
          <Sparkles size={14} aria-hidden />
          {TRENDING_PERIOD_CHIP_LABELS[p]}
        </Link>
      ))}
    </div>
  );
}
