"use client";

import { useEffect, useState } from "react";
import { resolveXianxiaTimeOfDay, type TimeOfDay } from "@/lib/xianxia-time-of-day";
import { normalizeGlobalTheme } from "@/lib/store";
import { useAppSelector } from "@/lib/store-hooks";

const ROLLOVER_MS = 60_000;

export function useXianxiaTimeOfDay(): TimeOfDay {
  const theme = useAppSelector((s) => normalizeGlobalTheme(s.globalTheme));
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => resolveXianxiaTimeOfDay(theme));

  useEffect(() => {
    const sync = () => setTimeOfDay(resolveXianxiaTimeOfDay(theme));
    sync();
    const id = window.setInterval(sync, ROLLOVER_MS);
    return () => window.clearInterval(id);
  }, [theme]);

  return timeOfDay;
}
