"use client";

import { Sparkles, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { useReaderRealtimeFx } from "@/lib/useReaderRealtimeFx";
import { NOTIFY_COPY, SHIMMER_LEGEND_SESSION_KEY } from "@/lib/xianxia-notify-copy";

export function RealtimeShimmerLegend() {
  const [visible, setVisible] = useState(false);
  const { mode } = useReaderRealtimeFx();

  useReaderRealtimeListener(
    useCallback((event: ReaderRealtimeEvent) => {
      if (mode === "off") return;
      if (event.type !== "chapter_update" && event.type !== "story_update") return;
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(SHIMMER_LEGEND_SESSION_KEY)) return;
      setVisible(true);
    }, [mode])
  );

  if (mode === "off" || !visible) return null;

  function dismiss() {
    window.sessionStorage.setItem(SHIMMER_LEGEND_SESSION_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="realtime-shimmer-legend" role="status" aria-live="polite">
      <Sparkles size={15} aria-hidden="true" />
      <span>{NOTIFY_COPY.shimmerLegend}</span>
      <button type="button" className="realtime-shimmer-legend-dismiss" onClick={dismiss}>
        {NOTIFY_COPY.shimmerDismiss}
        <X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
