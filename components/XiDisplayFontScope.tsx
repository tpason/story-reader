import { Long_Cang, Ma_Shan_Zheng } from "next/font/google";
import type { HTMLAttributes, ReactNode } from "react";

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

type XiDisplayFontScopeProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Decorative xi calligraphy — only mount where poetry/hero glyphs render. */
export function XiDisplayFontScope({ children, className, ...rest }: XiDisplayFontScopeProps) {
  const rootClass = [maShanZheng.variable, longCang.variable, className].filter(Boolean).join(" ");
  return (
    <div className={rootClass} {...rest}>
      {children}
    </div>
  );
}
