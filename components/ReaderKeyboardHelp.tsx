"use client";

import { X } from "lucide-react";

export type ReaderKeyboardShortcut = {
  keys: string;
  label: string;
};

export const READER_KEYBOARD_SHORTCUTS: ReaderKeyboardShortcut[] = [
  { keys: "← / →", label: "Chương trước / sau (hoặc lật trang)" },
  { keys: "J / K", label: "Chương sau / trước" },
  { keys: "Ctrl+F", label: "Tìm trong chương / truyện" },
  { keys: "/", label: "Mở tìm kiếm nhanh" },
  { keys: "B", label: "Đánh dấu chương" },
  { keys: "F", label: "Bật / tắt focus mode" },
  { keys: "G", label: "Nhân vật & thuật ngữ" },
  { keys: "N", label: "Panel ghi chú (desktop)" },
  { keys: "T", label: "Mục lục chương" },
  { keys: "?", label: "Bảng phím tắt này" },
  { keys: "Esc", label: "Đóng panel / sheet đang mở" }
];

type ReaderKeyboardHelpProps = {
  open: boolean;
  onClose: () => void;
};

export function ReaderKeyboardHelp({ open, onClose }: ReaderKeyboardHelpProps) {
  if (!open) return null;

  return (
    <div className="reader-keyboard-help-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="reader-keyboard-help"
        role="dialog"
        aria-modal="true"
        aria-label="Phím tắt reader"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reader-keyboard-help-header">
          <div>
            <p className="eyebrow">Động phủ</p>
            <h2>Phím tắt</h2>
          </div>
          <button type="button" className="reader-keyboard-help-close" aria-label="Đóng" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <ul className="reader-keyboard-help-list">
          {READER_KEYBOARD_SHORTCUTS.map((item) => (
            <li key={item.keys}>
              <kbd>{item.keys}</kbd>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
