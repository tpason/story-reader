import { Merriweather, Noto_Serif } from "next/font/google";
import "@/app/styles/skill-effect-core.css";
import "@/app/styles/skill-effect-reader.css";
import "./reader.css";

const merriweather = Merriweather({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-merriweather",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-noto-serif",
  display: "swap",
});

export default function ReaderChapterLayout({ children }: { children: React.ReactNode }) {
  return <div className={`reader-font-scope ${merriweather.variable} ${notoSerif.variable}`}>{children}</div>;
}
