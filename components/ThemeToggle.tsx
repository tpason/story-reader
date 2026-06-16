"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { setGlobalTheme, type GlobalTheme } from "@/lib/store";

const CYCLE: GlobalTheme[] = ["auto", "dark", "light"];
const LABELS: Record<GlobalTheme, string> = {
  auto: "Tự động",
  dark: "Tối",
  light: "Sáng",
};

export function ThemeToggle() {
  const pref = useAppSelector((s) => (s.globalTheme as GlobalTheme | undefined) ?? "auto");
  const dispatch = useAppDispatch();

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length];
    dispatch(setGlobalTheme(next));
  }

  return (
    <button
      type="button"
      className="icon-button theme-toggle-btn"
      onClick={cycle}
      aria-label={`Giao diện: ${LABELS[pref]}`}
      title={`Giao diện: ${LABELS[pref]}`}
    >
      {pref === "dark" ? <Moon size={17} /> : pref === "light" ? <Sun size={17} /> : <SunMoon size={17} />}
    </button>
  );
}
