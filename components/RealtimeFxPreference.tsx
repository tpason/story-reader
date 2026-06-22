"use client";

import { Sparkles } from "lucide-react";
import { useReaderRealtimeFx } from "@/lib/useReaderRealtimeFx";
import type { ReaderRealtimeFxMode } from "@/lib/reader-realtime-fx";

const FX_OPTIONS: { mode: ReaderRealtimeFxMode; label: string; hint: string }[] = [
  { mode: "full", label: "Đầy đủ", hint: "Shimmer, toast và linh quang đầy đủ." },
  { mode: "subtle", label: "Nhẹ", hint: "Chỉ viền nhẹ — ít chuyển động hơn." },
  { mode: "off", label: "Tắt", hint: "Không shimmer; toast chỉ chữ." }
];

type RealtimeFxPreferenceProps = {
  compact?: boolean;
};

export function RealtimeFxPreference({ compact = false }: RealtimeFxPreferenceProps) {
  const { mode, setFxMode } = useReaderRealtimeFx();

  return (
    <div className={`realtime-fx-settings ${compact ? "realtime-fx-settings-compact" : ""}`.trim()} role="group" aria-label="Hiệu ứng linh tin">
      <div className="realtime-fx-settings-copy">
        <p className="eyebrow">
          <Sparkles size={12} aria-hidden="true" />
          Linh quang
        </p>
        <h2>Hiệu ứng realtime</h2>
        {!compact ? (
          <p>Điều chỉnh shimmer và toast khi có chương mới — không ảnh hưởng thông linh WebSocket.</p>
        ) : null}
      </div>
      <div className="segmented realtime-fx-segmented" role="radiogroup" aria-label="Chế độ hiệu ứng linh tin">
        {FX_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={mode === option.mode}
            className={mode === option.mode ? "chip-active" : ""}
            title={option.hint}
            onClick={() => setFxMode(option.mode)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
