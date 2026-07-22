/** Phong vân seals — Hán numerals (Nhất…Thập); keep brush style past top-3. */
export const RANK_SEAL = {
  1: { han: "一", label: "Nhất", tier: "gold" },
  2: { han: "二", label: "Nhị", tier: "silver" },
  3: { han: "三", label: "Tam", tier: "bronze" },
  4: { han: "四", label: "Tứ", tier: "jade" },
  5: { han: "五", label: "Ngũ", tier: "jade" },
  6: { han: "六", label: "Lục", tier: "jade" },
  7: { han: "七", label: "Thất", tier: "jade" },
  8: { han: "八", label: "Bát", tier: "jade" },
  9: { han: "九", label: "Cửu", tier: "jade" },
  10: { han: "十", label: "Thập", tier: "jade" },
} as const;

type SealSize = "default" | "podium" | "trending";

export function RankCalligraphySeal({ rank, size = "default" }: { rank: number; size?: SealSize }) {
  const seal = RANK_SEAL[rank as keyof typeof RANK_SEAL];
  if (seal) {
    return (
      <span
        className={`rankings-seal rankings-seal-${seal.tier} rankings-seal--${size} rankings-seal--brush`}
        title={`Hạng ${seal.label}`}
        aria-label={`Hạng ${seal.label} (${rank})`}
      >
        <span className="rankings-seal-ink" aria-hidden="true" />
        <span className="rankings-seal-calligraphy">{seal.han}</span>
        {size === "podium" ? <span className="rankings-seal-vi">{seal.label}</span> : null}
      </span>
    );
  }

  // Ranks > 10: same brush square chrome, Arabic numeral (no circle vs square split).
  return (
    <span
      className={`rankings-seal rankings-seal-jade rankings-seal--${size} rankings-seal--brush`}
      aria-label={`Hạng ${rank}`}
    >
      <span className="rankings-seal-ink" aria-hidden="true" />
      <span className="rankings-seal-num">{rank}</span>
    </span>
  );
}
