"use client";

import { useEffect } from "react";
import { useAppSelector } from "@/lib/store-hooks";
import type { GlobalTheme } from "@/lib/store";

function resolveTheme(pref: GlobalTheme, osDark: boolean): "dark" | "light" {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return osDark ? "dark" : "light";
}

export function GlobalThemeProvider() {
  const pref = useAppSelector((s) => (s.globalTheme as GlobalTheme | undefined) ?? "auto");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function apply() {
      const resolved = resolveTheme(pref, mq.matches);
      document.documentElement.setAttribute("data-xi-theme", resolved);
    }

    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  return null;
}
