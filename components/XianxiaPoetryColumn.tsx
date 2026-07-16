"use client";

import { useEffect, useState } from "react";
import { XiDisplayFontScope } from "@/components/XiDisplayFontScope";
import {
  getDefaultPoem,
  pickRandomPoem,
  readLastPoemId,
  writeLastPoemId,
  type PoetryColumn,
} from "@/lib/xianxia-poetry";

export function XianxiaPoetryColumn() {
  // null until client pick — avoids SSR/ISR freezing one poem and a wrong first flash
  const [columns, setColumns] = useState<readonly PoetryColumn[] | null>(null);

  useEffect(() => {
    const poem = pickRandomPoem(readLastPoemId());
    writeLastPoemId(poem.id);
    setColumns(poem.columns);
  }, []);

  const display = columns ?? getDefaultPoem().columns;

  return (
    <XiDisplayFontScope className="xi-poetry-col" role="presentation" aria-hidden="true">
      <div className="xi-poetry-cloud-bg xi-cloud-aura xi-cloud-aura--secondary" />
      <div
        className="xi-poetry-grid"
        style={{ opacity: columns ? 1 : 0 }}
      >
        {display.map((col, ci) => (
          <div key={`${col.join("-")}-${ci}`} className="xi-poetry-pillar">
            {col.map((word, ri) => (
              <span
                key={`${word}-${ri}`}
                className="xi-poetry-line"
                style={{ "--col-i": ci, "--row-i": ri } as React.CSSProperties}
              >
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
      <span className="xi-poetry-shimmer" aria-hidden="true" />
    </XiDisplayFontScope>
  );
}
