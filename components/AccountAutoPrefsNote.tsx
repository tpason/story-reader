"use client";

import { Gauge, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { readerPerformanceModeLabel, readReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { useReaderRealtimeFx } from "@/lib/useReaderRealtimeFx";

function fxLabel(mode: "full" | "subtle" | "off") {
  if (mode === "off") return "tắt (máy yêu cầu ít chuyển động)";
  if (mode === "subtle") return "nhẹ";
  return "đầy đủ";
}

/** Status-only: linh quang + hiệu năng resolve automatically — no toggles on account. */
export function AccountAutoPrefsNote() {
  const { mode: fxMode, preference } = useReaderRealtimeFx();
  const [perfLabel, setPerfLabel] = useState(() => readerPerformanceModeLabel(readReaderPerformanceMode()));

  useEffect(() => {
    const sync = () => setPerfLabel(readerPerformanceModeLabel(readReaderPerformanceMode()));
    sync();
    window.addEventListener("reader:performance-mode", sync);
    return () => window.removeEventListener("reader:performance-mode", sync);
  }, []);

  return (
    <div className="account-auto-prefs-note" role="status">
      <p className="eyebrow">
        <Sparkles size={14} aria-hidden="true" />
        <span>Linh quang & hiệu năng</span>
      </p>
      <p>
        Tự chỉnh theo máy — linh quang {fxLabel(fxMode)}
        {preference === "auto" ? "" : " (đã ghi đè trong trình đọc)"}, hiệu năng {perfLabel.toLowerCase()}.
      </p>
      <ul className="account-auto-prefs-list">
        <li>
          <Sparkles size={16} aria-hidden="true" />
          <span>Mobile / tiết kiệm dữ liệu / pin yếu → linh quang nhẹ hoặc tắt</span>
        </li>
        <li>
          <Gauge size={16} aria-hidden="true" />
          <span>WebGL chỉ bật khi máy đủ mạnh (chế độ mặc định: tự động)</span>
        </li>
      </ul>
    </div>
  );
}
