"use client";

import { useEffect, useState } from "react";
import type { TimeOfDay } from "@/lib/xianxia-time-of-day";
import {
  pickBurstMode,
  readForcedWeather,
  WEATHER_TIMING,
  type WeatherMode,
} from "@/lib/xianxia-weather";

/**
 * Occasional rain/snow for dawn/day/dusk. Always clear at night.
 * Storage is read only inside effects (hydration-safe).
 */
export function usePoeticWeather(timeOfDay: TimeOfDay, enabled: boolean): WeatherMode {
  const [mode, setMode] = useState<WeatherMode>("clear");

  useEffect(() => {
    if (!enabled) {
      setMode("clear");
      return;
    }

    if (timeOfDay === "night") {
      setMode("clear");
      return;
    }

    let cancelled = false;
    let timer = 0;
    const clearTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };

    const forced = readForcedWeather();
    if (forced) {
      setMode(forced);
      const poll = window.setInterval(() => {
        const next = readForcedWeather();
        if (next) setMode(next);
        else setMode("clear");
      }, 1500);
      return () => window.clearInterval(poll);
    }

    const dayPart = timeOfDay;

    const runIdle = (ms: number) => {
      clearTimer();
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (Math.random() > WEATHER_TIMING.burstChance) {
          runIdle(WEATHER_TIMING.laterIdleMs());
          return;
        }
        const burst = pickBurstMode(dayPart);
        setMode(burst);
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setMode("clear");
          runIdle(WEATHER_TIMING.laterIdleMs());
        }, WEATHER_TIMING.burstMs());
      }, ms);
    };

    setMode("clear");
    runIdle(WEATHER_TIMING.firstIdleMs());

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [timeOfDay, enabled]);

  return mode;
}
