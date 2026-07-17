"use client";

import { useEffect, useState, type ReactNode } from "react";

type RankingsSubfiltersProps = {
  labelEyebrow: string;
  labelStrong: string;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
};

/** Mobile: collapsed by default. Desktop ≥840: always expanded (summary hidden via CSS). */
export function RankingsSubfilters({
  labelEyebrow,
  labelStrong,
  children,
  className = "rankings-subfilters",
  summaryClassName = "rankings-subfilters-summary",
}: RankingsSubfiltersProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 840px)");
    function sync() {
      setOpen(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => {
        setOpen((event.target as HTMLDetailsElement).open);
      }}
    >
      <summary className={summaryClassName}>
        <span className="eyebrow">{labelEyebrow}</span>
        <strong>{labelStrong}</strong>
      </summary>
      {children}
    </details>
  );
}
