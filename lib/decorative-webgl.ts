"use client";

import { readReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { prefersReducedMotion } from "@/lib/browser";
import { useEffect, useState } from "react";

type BatteryManager = EventTarget & {
  level: number;
  charging: boolean;
};

type NavigatorWithExtras = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
};

type DecorativeWebglOptions = {
  allowCompact?: boolean;
  /** Disable WebGL at or below this viewport width (default 839). */
  compactMaxWidth?: number;
};

// Returns true when the device is clearly low-end: <2 GB RAM, data-saver on,
// or on a 2G/slow-2G connection. Checked once on mount; doesn't need to be
// reactive because these characteristics don't change mid-session.
function isLowEndDevice(): boolean {
  const nav = navigator as NavigatorWithExtras;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 2) return true;
  const conn = nav.connection;
  if (conn?.saveData === true) return true;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return true;
  return false;
}

export function useDecorativeWebglEnabled(options: DecorativeWebglOptions = {}) {
  const { allowCompact = false, compactMaxWidth = 839 } = options;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia(`(max-width: ${compactMaxWidth}px)`);
    let battery: BatteryManager | null = null;
    const lowEnd = isLowEndDevice();

    function update() {
      const performanceMode = readReaderPerformanceMode();
      if (performanceMode === "battery_saver") {
        setEnabled(false);
        return;
      }

      // Battery threshold at 25% (was 20%) — conservative for mobile devices
      const isLowBattery = battery !== null && !battery.charging && battery.level < 0.25;
      const ignoreLowEnd = performanceMode === "full_effects";
      setEnabled(
        !motionQuery.matches &&
        (allowCompact || !compactQuery.matches) &&
        !isLowBattery &&
        (ignoreLowEnd || !lowEnd)
      );
    }

    const nav = navigator as NavigatorWithExtras;
    if (typeof nav.getBattery === "function") {
      nav.getBattery().then((bat) => {
        battery = bat;
        bat.addEventListener("levelchange", update);
        bat.addEventListener("chargingchange", update);
        update();
      }).catch(() => update());
    } else {
      update();
    }

    motionQuery.addEventListener("change", update);
    compactQuery.addEventListener("change", update);
    window.addEventListener("reader:performance-mode", update);

    return () => {
      motionQuery.removeEventListener("change", update);
      compactQuery.removeEventListener("change", update);
      window.removeEventListener("reader:performance-mode", update);
      if (battery) {
        battery.removeEventListener("levelchange", update);
        battery.removeEventListener("chargingchange", update);
      }
    };
  }, [allowCompact, compactMaxWidth]);

  return enabled && !prefersReducedMotion();
}
