"use client";

import { useWebGLPerformanceTier } from "@/hooks/useWebGLPerformanceTier";
import { siteDecorativeWebglAllowed } from "@/lib/app-features";
import { readReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { prefersReducedMotion } from "@/lib/browser";
import { canUseWebGL, isWeakWebGLRenderer } from "@/lib/webgl-capability";
import { useAppSelector } from "@/lib/store-hooks";
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

export type DecorativeWebglTier = "global" | "reader";

type DecorativeWebglOptions = {
  allowCompact?: boolean;
  /** Disable WebGL at or below this viewport width (default 839). */
  compactMaxWidth?: number;
  /**
   * global: world background + page motion.
   * reader: in-chapter/story accents.
   */
  tier?: DecorativeWebglTier;
};

function isLowEndDevice(): boolean {
  const nav = navigator as NavigatorWithExtras;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return true;
  const conn = nav.connection;
  if (conn?.saveData === true) return true;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return true;
  return false;
}

function perfAllowsWebGL(
  performanceMode: ReturnType<typeof readReaderPerformanceMode>,
  perfTier: ReturnType<typeof useWebGLPerformanceTier>,
  tier: DecorativeWebglTier,
) {
  if (performanceMode === "full_effects") return true;
  if (perfTier === "weak") return tier === "global";
  // World bg: mount WebGL while probe runs; reader accents stay off until classified.
  if (perfTier === "pending") return tier === "global";
  return true;
}

export function useDecorativeWebglEnabled(options: DecorativeWebglOptions = {}) {
  const { allowCompact = false, compactMaxWidth = 839, tier = "global" } = options;
  const isAdmin = useAppSelector((state) => Boolean(state.identity.user?.isAdmin));
  const adminAllowsWebgl = siteDecorativeWebglAllowed(isAdmin);
  const perfTier = useWebGLPerformanceTier();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!adminAllowsWebgl) {
      setEnabled(false);
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia(`(max-width: ${compactMaxWidth}px)`);
    let battery: BatteryManager | null = null;
    const lowEnd = isLowEndDevice();
    const weakGpu = isWeakWebGLRenderer();

    function update() {
      const performanceMode = readReaderPerformanceMode();
      if (performanceMode === "battery_saver") {
        setEnabled(false);
        return;
      }

      if (!perfAllowsWebGL(performanceMode, perfTier, tier)) {
        setEnabled(false);
        return;
      }

      const isCompact = compactQuery.matches;
      const compactAllowed = tier === "reader" ? false : allowCompact;
      const isLowBattery = battery !== null && !battery.charging && battery.level < 0.25;
      const ignoreConstraints = performanceMode === "full_effects";
      setEnabled(
        !motionQuery.matches &&
        (compactAllowed || !isCompact) &&
        !isLowBattery &&
        (ignoreConstraints || (!lowEnd && !weakGpu))
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
  }, [adminAllowsWebgl, allowCompact, compactMaxWidth, perfTier, tier]);

  return adminAllowsWebgl && enabled && !prefersReducedMotion() && canUseWebGL();
}
