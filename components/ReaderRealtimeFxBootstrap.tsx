"use client";

import { useEffect } from "react";
import { syncReaderRealtimeFxAttr } from "@/lib/reader-realtime-fx";

export function ReaderRealtimeFxBootstrap() {
  useEffect(() => {
    syncReaderRealtimeFxAttr();
  }, []);
  return null;
}
