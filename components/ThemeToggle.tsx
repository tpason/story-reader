"use client";

import { Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { normalizeGlobalTheme, setGlobalTheme, type GlobalTheme } from "@/lib/store";
import { GLOBAL_THEME_LABELS } from "@/lib/xianxia-time-of-day";

export function ThemeToggle() {
  const raw = useAppSelector((s) => s.globalTheme);
  const theme = normalizeGlobalTheme(raw);
  const dispatch = useAppDispatch();

  function toggle() {
    const next: GlobalTheme = theme === "dark" ? "light" : "dark";
    dispatch(setGlobalTheme(next));
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="icon-button theme-toggle-btn"
      onClick={toggle}
      aria-label={`Giao diện: ${GLOBAL_THEME_LABELS[theme]}. Bấm để chuyển sang ${GLOBAL_THEME_LABELS[isDark ? "light" : "dark"]}.`}
      title={`Giao diện: ${GLOBAL_THEME_LABELS[theme]}`}
      aria-pressed={isDark}
    >
      {isDark ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
