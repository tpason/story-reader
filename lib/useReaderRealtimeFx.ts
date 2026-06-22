"use client";

import { useCallback, useEffect, useState } from "react";
import {
  READER_REALTIME_FX_EVENT,
  readReaderRealtimeFx,
  syncReaderRealtimeFxAttr,
  writeReaderRealtimeFx,
  type ReaderRealtimeFxMode
} from "@/lib/reader-realtime-fx";

export function useReaderRealtimeFx() {
  const [mode, setMode] = useState<ReaderRealtimeFxMode>("full");

  useEffect(() => {
    syncReaderRealtimeFxAttr();
    setMode(readReaderRealtimeFx());
    const onChange = () => setMode(readReaderRealtimeFx());
    window.addEventListener(READER_REALTIME_FX_EVENT, onChange);
    return () => window.removeEventListener(READER_REALTIME_FX_EVENT, onChange);
  }, []);

  const setFxMode = useCallback((next: ReaderRealtimeFxMode) => {
    writeReaderRealtimeFx(next);
    setMode(next);
  }, []);

  return { mode, setFxMode };
}
