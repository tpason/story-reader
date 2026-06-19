"use client";

import { useEffect, useState } from "react";
import { resolveXianxiaTimeOfDay, type TimeOfDay } from "@/lib/xianxia-time-of-day";
import { useAppSelector } from "@/lib/store-hooks";
import type { GlobalTheme } from "@/lib/store";

const ROLLOVER_MS = 60_000;

export function useXianxiaTimeOfDay(): TimeOfDay {
  const theme = useAppSelector((s) => (s.globalTheme as GlobalTheme | undefined) ?? "auto");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => resolveXianxiaTimeOfDay(theme));

  useEffect(() => {
    const sync = () => setTimeOfDay(resolveXianxiaTimeOfDay(theme));
    sync();
    const id = window.setInterval(sync, ROLLOVER_MS);
    return () => window.clearInterval(id);
  }, [theme]);

  return timeOfDay;
}
