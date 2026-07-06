/** Tam hạng phong vân — brush seal glyphs + Hán-Việt labels. */
export const RANK_SEAL = {
  1: { han: "一", label: "Nhất", tier: "gold" },
  2: { han: "二", label: "Nhị", tier: "silver" },
  3: { han: "三", label: "Tam", tier: "bronze" }
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

  return (
    <span className={`rankings-seal rankings-seal-jade rankings-seal--${size}`} aria-label={`Hạng ${rank}`}>
      <span className="rankings-seal-num">{rank}</span>
    </span>
  );
}
