import { Long_Cang, Ma_Shan_Zheng } from "next/font/google";
import type { ReactNode } from "react";

const maShanZheng = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-xi-calligraphy",
  display: "swap",
});

const longCang = Long_Cang({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-xi-grass",
  display: "swap",
});

/** Decorative xi calligraphy — only mount where poetry/hero glyphs render. */
export function XiDisplayFontScope({ children }: { children: ReactNode }) {
  return <div className={`${maShanZheng.variable} ${longCang.variable}`}>{children}</div>;
}
