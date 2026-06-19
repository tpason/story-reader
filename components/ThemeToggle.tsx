"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { setGlobalTheme, type GlobalTheme } from "@/lib/store";
import { GLOBAL_THEME_LABELS, TIME_OF_DAY_LABELS } from "@/lib/xianxia-time-of-day";
import { useXianxiaTimeOfDay } from "@/hooks/useXianxiaTimeOfDay";

const CYCLE: GlobalTheme[] = ["auto", "dark", "light"];

export function ThemeToggle() {
  const pref = useAppSelector((s) => (s.globalTheme as GlobalTheme | undefined) ?? "auto");
  const dispatch = useAppDispatch();
  const timeOfDay = useXianxiaTimeOfDay();

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length];
    dispatch(setGlobalTheme(next));
  }

  const skyLabel = TIME_OF_DAY_LABELS[timeOfDay];

  return (
    <button
      type="button"
      className="icon-button theme-toggle-btn"
      onClick={cycle}
      aria-label={`Giao diện: ${GLOBAL_THEME_LABELS[pref]} — Trời: ${skyLabel}`}
      title={`Giao diện: ${GLOBAL_THEME_LABELS[pref]} · Trời: ${skyLabel}`}
    >
      {pref === "dark" ? <Moon size={17} /> : pref === "light" ? <Sun size={17} /> : <SunMoon size={17} />}
    </button>
  );
}
