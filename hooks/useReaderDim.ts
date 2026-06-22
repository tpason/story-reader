import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";

const READER_DIM_STORAGE_KEY = "reader-dim-overlay";
const DEFAULT_DIM_LEVEL = 0.18;

type ReaderDimState = {
  enabled: boolean;
  level: number;
};

const DEFAULT_DIM_STATE: ReaderDimState = {
  enabled: false,
  level: DEFAULT_DIM_LEVEL,
};

/** Clamp an arbitrary stored value into the supported dim-overlay range. */
export function clampDimLevel(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_DIM_LEVEL;
  return Math.min(0.48, Math.max(0.06, parsed));
}

export type UseReaderDimResult = {
  enabled: boolean;
  level: number;
  setEnabled: (next: boolean | ((prev: boolean) => boolean)) => void;
  setLevel: (next: number | string) => void;
};

/**
 * Reader "dim overlay" (lọc sáng) preference, persisted to localStorage.
 *
 * `initializeWithValue: false` keeps SSR and the first client render in sync
 * (both start from the default, then hydrate from storage after mount) — this
 * preserves the original behavior and avoids a hydration mismatch on the
 * dim-overlay className. Cross-tab sync comes for free via useLocalStorage.
 */
export function useReaderDim(): UseReaderDimResult {
  const [stored, setStored] = useLocalStorage<ReaderDimState>(
    READER_DIM_STORAGE_KEY,
    DEFAULT_DIM_STATE,
    { initializeWithValue: false },
  );

  const setEnabled = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setStored((prev) => ({
        ...prev,
        enabled: typeof next === "function" ? next(prev.enabled) : next,
      }));
    },
    [setStored],
  );

  const setLevel = useCallback(
    (next: number | string) => {
      setStored((prev) => ({ ...prev, level: clampDimLevel(next) }));
    },
    [setStored],
  );

  return {
    enabled: Boolean(stored.enabled),
    level: clampDimLevel(stored.level),
    setEnabled,
    setLevel,
  };
}
