"use client";

import type { ReactNode } from "react";
import { XiDisplayFontScope } from "@/components/XiDisplayFontScope";

type RankingsSectionShellProps = {
  children: ReactNode;
  caption?: ReactNode;
};

export function RankingsSectionShell({ children, caption }: RankingsSectionShellProps) {
  return (
    <section className="rankings-section rankings-scroll-shell rankings-scroll-shell--aura">
      {caption}
      <div className="rankings-scroll-shell-content">
        <XiDisplayFontScope>{children}</XiDisplayFontScope>
      </div>
    </section>
  );
}
