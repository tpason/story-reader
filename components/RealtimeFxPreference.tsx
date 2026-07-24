"use client";

import { Sparkles } from "lucide-react";
import {
  readerRealtimeFxPreferenceLabel,
  type ReaderRealtimeFxPreference
} from "@/lib/reader-realtime-fx";
import { useReaderRealtimeFx } from "@/lib/useReaderRealtimeFx";

const FX_OPTIONS: { mode: ReaderRealtimeFxPreference; hint: string }[] = [
  { mode: "auto", hint: "Theo máy: mobile/pin yếu → nhẹ; reduced-motion → tắt." },
  { mode: "full", hint: "Shimmer, toast và linh quang đầy đủ." },
  { mode: "subtle", hint: "Chỉ viền nhẹ, ít chuyển động hơn." },
  { mode: "off", hint: "Không shimmer; toast chỉ chữ." }
];

type RealtimeFxPreferenceProps = {
  compact?: boolean;
};

export function RealtimeFxPreference({ compact = false }: RealtimeFxPreferenceProps) {
  const { preference, mode, setFxMode } = useReaderRealtimeFx();

  return (
    <div className={`realtime-fx-settings ${compact ? "realtime-fx-settings-compact" : ""}`.trim()} role="group" aria-label="Hiệu ứng linh tin">
      <div className="realtime-fx-settings-copy">
        <p className="eyebrow">
          <Sparkles size={12} aria-hidden="true" />
          Linh quang
        </p>
        {!compact ? <h2>Hiệu ứng realtime</h2> : null}
        {!compact ? (
          <p>
            Mặc định tự động theo máy
            {preference === "auto"
              ? ` (đang dùng: ${readerRealtimeFxPreferenceLabel(mode)}).`
              : ` — đang ghi đè: ${readerRealtimeFxPreferenceLabel(preference)}.`}
          </p>
        ) : null}
      </div>
      <div className="segmented realtime-fx-segmented" role="radiogroup" aria-label="Chế độ hiệu ứng linh tin">
        {FX_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={preference === option.mode}
            className={preference === option.mode ? "chip-active" : ""}
            title={option.hint}
            onClick={() => setFxMode(option.mode)}
          >
            {readerRealtimeFxPreferenceLabel(option.mode)}
          </button>
        ))}
      </div>
    </div>
  );
}
