"use client";

import { useEffect } from "react";
import { resolveXianxiaTimeOfDay } from "@/lib/xianxia-time-of-day";
import { useAppSelector } from "@/lib/store-hooks";
import type { GlobalTheme } from "@/lib/store";

function resolveTheme(pref: GlobalTheme, osDark: boolean): "dark" | "light" {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return osDark ? "dark" : "light";
}

const SKY_SYNC_MS = 60_000;

export function GlobalThemeProvider() {
  const pref = useAppSelector((s) => (s.globalTheme as GlobalTheme | undefined) ?? "auto");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function apply() {
      const resolved = resolveTheme(pref, mq.matches);
      document.documentElement.setAttribute("data-xi-theme", resolved);
      document.documentElement.setAttribute("data-xi-time", resolveXianxiaTimeOfDay(pref));
    }

    apply();
    mq.addEventListener("change", apply);
    const skyTimer = window.setInterval(apply, SKY_SYNC_MS);
    return () => {
      mq.removeEventListener("change", apply);
      window.clearInterval(skyTimer);
    };
  }, [pref]);

  return null;
}
