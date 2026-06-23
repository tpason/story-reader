"use client";

import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import {
  readReaderPerformanceMode,
  writeReaderPerformanceMode,
  readerPerformanceModeLabel,
  type ReaderPerformanceMode
} from "@/lib/reader-performance-mode";

const MODES: ReaderPerformanceMode[] = ["balanced", "battery_saver", "full_effects"];

const MODE_HINTS: Record<ReaderPerformanceMode, string> = {
  balanced: "Tự đo FPS WebGL khi mở tab — yếu thì giữ nền CSS tiên hiệp, mạnh mới phủ WebGL.",
  battery_saver: "Luôn dùng nền CSS nhẹ; tắt WebGL và giảm animation.",
  full_effects: "Bỏ qua đo FPS; bật toàn bộ linh quang WebGL (có thể nặng)."
};

type PerformanceModePreferenceProps = {
  compact?: boolean;
};

export function PerformanceModePreference({ compact = false }: PerformanceModePreferenceProps) {
  const [mode, setMode] = useState<ReaderPerformanceMode>(() => readReaderPerformanceMode());

  useEffect(() => {
    function sync() {
      setMode(readReaderPerformanceMode());
    }
    window.addEventListener("reader:performance-mode", sync);
    return () => window.removeEventListener("reader:performance-mode", sync);
  }, []);

  function setPerformanceMode(next: ReaderPerformanceMode) {
    writeReaderPerformanceMode(next);
    setMode(next);
    window.dispatchEvent(new Event("reader:performance-mode"));
  }

  return (
    <div className={`performance-mode-settings ${compact ? "performance-mode-settings-compact" : ""}`.trim()}>
      <div className="performance-mode-settings-copy">
        <p className="eyebrow">
          <Gauge size={12} aria-hidden="true" />
          Hiệu năng
        </p>
        {!compact ? <h2>Hiệu ứng & WebGL</h2> : null}
        {!compact ? <p>{MODE_HINTS[mode]}</p> : null}
      </div>
      <div className="segmented performance-mode-segmented" role="radiogroup" aria-label="Chế độ hiệu năng">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={mode === item}
            className={mode === item ? "chip-active" : ""}
            title={MODE_HINTS[item]}
            onClick={() => setPerformanceMode(item)}
          >
            {readerPerformanceModeLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}
