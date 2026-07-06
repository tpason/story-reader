"use client";

import { useEffect } from "react";
import { resolveXianxiaTimeOfDay } from "@/lib/xianxia-time-of-day";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { normalizeGlobalTheme, setGlobalTheme } from "@/lib/store";

const SKY_SYNC_MS = 60_000;

export function GlobalThemeProvider() {
  const raw = useAppSelector((s) => s.globalTheme);
  const theme = normalizeGlobalTheme(raw);
  const dispatch = useAppDispatch();

  // Migrate legacy persisted `auto` (or invalid) → concrete light/dark once.
  useEffect(() => {
    if (raw !== theme) {
      dispatch(setGlobalTheme(theme));
    }
  }, [dispatch, raw, theme]);

  useEffect(() => {
    function apply() {
      document.documentElement.setAttribute("data-xi-theme", theme);
      document.documentElement.setAttribute("data-xi-time", resolveXianxiaTimeOfDay(theme));
      document.documentElement.style.colorScheme = theme;
    }

    apply();
    const skyTimer = window.setInterval(apply, SKY_SYNC_MS);
    return () => window.clearInterval(skyTimer);
  }, [theme]);

  return null;
}
