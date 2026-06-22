"use client";

import { useEffect } from "react";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";

export const READER_REALTIME_BUS_EVENT = "betterbox:reader-realtime";

export function dispatchReaderRealtimeEvent(event: ReaderRealtimeEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ReaderRealtimeEvent>(READER_REALTIME_BUS_EVENT, { detail: event }));
}

export function useReaderRealtimeListener(handler: (event: ReaderRealtimeEvent) => void) {
  useEffect(() => {
    const listener = (event: Event) => {
      handler((event as CustomEvent<ReaderRealtimeEvent>).detail);
    };
    window.addEventListener(READER_REALTIME_BUS_EVENT, listener);
    return () => window.removeEventListener(READER_REALTIME_BUS_EVENT, listener);
  }, [handler]);
}
