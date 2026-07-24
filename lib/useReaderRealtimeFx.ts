"use client";

import { useCallback, useEffect, useState } from "react";
import {
  READER_REALTIME_FX_EVENT,
  readReaderRealtimeFxPreference,
  resolveReaderRealtimeFx,
  syncReaderRealtimeFxAttr,
  writeReaderRealtimeFx,
  type ReaderRealtimeFxMode,
  type ReaderRealtimeFxPreference
} from "@/lib/reader-realtime-fx";

export function useReaderRealtimeFx() {
  const [preference, setPreference] = useState<ReaderRealtimeFxPreference>("auto");
  const [mode, setMode] = useState<ReaderRealtimeFxMode>("subtle");

  useEffect(() => {
    const sync = () => {
      const nextPreference = readReaderRealtimeFxPreference();
      setPreference(nextPreference);
      setMode(resolveReaderRealtimeFx(nextPreference));
      syncReaderRealtimeFxAttr();
    };
    sync();
    window.addEventListener(READER_REALTIME_FX_EVENT, sync);
    window.addEventListener("reader:performance-mode", sync);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 839px)");
    motion.addEventListener("change", sync);
    compact.addEventListener("change", sync);
    return () => {
      window.removeEventListener(READER_REALTIME_FX_EVENT, sync);
      window.removeEventListener("reader:performance-mode", sync);
      motion.removeEventListener("change", sync);
      compact.removeEventListener("change", sync);
    };
  }, []);

  const setFxMode = useCallback((next: ReaderRealtimeFxPreference) => {
    writeReaderRealtimeFx(next);
    setPreference(next);
    setMode(resolveReaderRealtimeFx(next));
  }, []);

  return { preference, mode, setFxMode };
}
