"use client";

import { useEffect } from "react";
import { resolveXianxiaTimeOfDay } from "@/lib/xianxia-time-of-day";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { normalizeGlobalTheme, setGlobalTheme } from "@/lib/store";
import { applyReaderPerformanceModeAttr } from "@/lib/reader-performance-mode";

const SKY_SYNC_MS = 60_000;
const COMPACT_QUERY = "(max-width: 839px)";

function syncCompactAttr() {
  const compact = window.matchMedia(COMPACT_QUERY).matches;
  document.documentElement.setAttribute("data-xi-compact", compact ? "1" : "0");
}

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

  // Honor battery_saver / full_effects in CSS via data-xi-perf (boot already set; keep in sync).
  useEffect(() => {
    function syncPerfAttr() {
      applyReaderPerformanceModeAttr();
    }
    syncPerfAttr();
    window.addEventListener("reader:performance-mode", syncPerfAttr);
    return () => window.removeEventListener("reader:performance-mode", syncPerfAttr);
  }, []);

  // Keep data-xi-compact aligned after boot script (resize / rotate).
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    syncCompactAttr();
    mq.addEventListener("change", syncCompactAttr);
    return () => mq.removeEventListener("change", syncCompactAttr);
  }, []);

  return null;
}
