"use client";

import { useWebGLPerformanceTier } from "@/hooks/useWebGLPerformanceTier";
import { siteDecorativeWebglAllowed } from "@/lib/app-features";
import { readReaderPerformanceMode, type ReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { prefersReducedMotion } from "@/lib/browser";
import { canUseWebGL, isWeakWebGLRenderer } from "@/lib/webgl-capability";
import { WEBGL_PERF_EVENT, type WebGLPerfTier } from "@/lib/webgl-performance-probe";
import { useAppSelector } from "@/lib/store-hooks";
import { useCallback, useSyncExternalStore } from "react";

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

/** Shared battery snapshot — async API, refined after first paint without blind false→true gate. */
let sharedBattery: BatteryManager | null = null;
let batteryWatchStarted = false;
const batteryListeners = new Set<() => void>();

function notifyBatteryListeners() {
  batteryListeners.forEach((listener) => listener());
}

function ensureBatteryWatch() {
  if (batteryWatchStarted || typeof window === "undefined") return;
  batteryWatchStarted = true;
  const nav = navigator as NavigatorWithExtras;
  if (typeof nav.getBattery !== "function") return;
  nav
    .getBattery()
    .then((bat) => {
      sharedBattery = bat;
      bat.addEventListener("levelchange", notifyBatteryListeners);
      bat.addEventListener("chargingchange", notifyBatteryListeners);
      notifyBatteryListeners();
    })
    .catch(() => {
      /* ignore — stay optimistic without battery veto */
    });
}

function isLowEndDevice(): boolean {
  const nav = navigator as NavigatorWithExtras;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return true;
  const conn = nav.connection;
  if (conn?.saveData === true) return true;
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return true;
  return false;
}

function perfAllowsWebGL(
  performanceMode: ReaderPerformanceMode,
  perfTier: WebGLPerfTier,
  tier: DecorativeWebglTier,
) {
  if (performanceMode === "full_effects") return true;
  if (perfTier === "weak") return tier === "global";
  // World bg: mount WebGL while probe runs; reader accents stay off until classified.
  if (perfTier === "pending") return tier === "global";
  return true;
}

function evaluateDecorativeWebglEnabled(options: {
  allowCompact: boolean;
  compactMaxWidth: number;
  tier: DecorativeWebglTier;
  perfTier: WebGLPerfTier;
}): boolean {
  if (typeof window === "undefined") return false;
  if (!canUseWebGL() || prefersReducedMotion()) return false;

  const performanceMode = readReaderPerformanceMode();
  if (performanceMode === "battery_saver") return false;
  if (!perfAllowsWebGL(performanceMode, options.perfTier, options.tier)) return false;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactQuery = window.matchMedia(`(max-width: ${options.compactMaxWidth}px)`);
  const isCompact = compactQuery.matches;
  const compactAllowed = options.tier === "reader" ? false : options.allowCompact;
  const battery = sharedBattery;
  const isLowBattery = battery !== null && !battery.charging && battery.level < 0.25;
  const ignoreConstraints = performanceMode === "full_effects";
  const lowEnd = isLowEndDevice();
  const weakGpu = isWeakWebGLRenderer();

  return (
    !motionQuery.matches &&
    (compactAllowed || !isCompact) &&
    !isLowBattery &&
    (ignoreConstraints || (!lowEnd && !weakGpu))
  );
}

/**
 * Decorative WebGL gate — sync on first client paint (no blind false→true thrash).
 * SSR / getServerSnapshot stay false so CSS-only path paints until hydrate.
 */
export function useDecorativeWebglEnabled(options: DecorativeWebglOptions = {}) {
  const { allowCompact = false, compactMaxWidth = 839, tier = "global" } = options;
  const isAdmin = useAppSelector((state) => Boolean(state.identity.user?.isAdmin));
  const adminAllowsWebgl = siteDecorativeWebglAllowed(isAdmin);
  const perfTier = useWebGLPerformanceTier();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!adminAllowsWebgl) return () => {};

      ensureBatteryWatch();
      batteryListeners.add(onStoreChange);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const compactQuery = window.matchMedia(`(max-width: ${compactMaxWidth}px)`);
      motionQuery.addEventListener("change", onStoreChange);
      compactQuery.addEventListener("change", onStoreChange);
      window.addEventListener("reader:performance-mode", onStoreChange);
      window.addEventListener(WEBGL_PERF_EVENT, onStoreChange);

      return () => {
        batteryListeners.delete(onStoreChange);
        motionQuery.removeEventListener("change", onStoreChange);
        compactQuery.removeEventListener("change", onStoreChange);
        window.removeEventListener("reader:performance-mode", onStoreChange);
        window.removeEventListener(WEBGL_PERF_EVENT, onStoreChange);
      };
    },
    [adminAllowsWebgl, compactMaxWidth],
  );

  const getSnapshot = useCallback(() => {
    if (!adminAllowsWebgl) return false;
    return evaluateDecorativeWebglEnabled({
      allowCompact,
      compactMaxWidth,
      tier,
      perfTier,
    });
  }, [adminAllowsWebgl, allowCompact, compactMaxWidth, perfTier, tier]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
