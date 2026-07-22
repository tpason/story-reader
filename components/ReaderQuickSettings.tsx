"use client";

import { Minus, Plus, Type } from "lucide-react";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions
} from "@floating-ui/react";
import { useState } from "react";
import { ReaderThemeSegmented } from "@/components/ReaderThemeSegmented";
import {
  READER_CONTENT_WIDTH_MAX,
  READER_CONTENT_WIDTH_MIN,
  READER_FONT_SIZE_MAX,
  READER_FONT_SIZE_MIN
} from "@/lib/reader-preferences";
import { setReaderContentWidth, setReaderFontSize } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

type ReaderQuickSettingsProps = {
  className?: string;
};

export function ReaderQuickSettings({ className }: ReaderQuickSettingsProps) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { fontSize, contentWidth, theme } = useAppSelector((state) => state.readerStyle.config);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-end",
    strategy: "fixed",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  });
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown", ancestorScroll: false });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        className={`icon-button reader-aa-trigger ${open ? "icon-button-active" : ""} ${className ?? ""}`.trim()}
        aria-expanded={open}
        aria-controls="reader-quick-settings"
        title="Aa — tuỳ chọn đọc nhanh"
        {...getReferenceProps({ onClick: () => setOpen((value) => !value) })}
      >
        <Type size={16} />
      </button>
      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            id="reader-quick-settings"
            className="reader-quick-settings reader-quick-settings-portal reader-theme-portal"
            data-theme={theme}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <p className="reader-quick-settings-title">Tuỳ chọn nhanh</p>
            <ReaderThemeSegmented variant="labels" ariaLabel="Giao diện đọc" />
            <div className="reader-quick-settings-font" role="group" aria-label="Cỡ chữ">
              <button
                type="button"
                className="icon-button"
                aria-label="Giảm cỡ chữ"
                disabled={fontSize <= READER_FONT_SIZE_MIN}
                onClick={() => dispatch(setReaderFontSize(fontSize - 1))}
              >
                <Minus size={16} />
              </button>
              <strong>{fontSize}px</strong>
              <button
                type="button"
                className="icon-button"
                aria-label="Tăng cỡ chữ"
                disabled={fontSize >= READER_FONT_SIZE_MAX}
                onClick={() => dispatch(setReaderFontSize(fontSize + 1))}
              >
                <Plus size={16} />
              </button>
            </div>
            <label className="reader-quick-settings-width">
              <span>Độ rộng {contentWidth}px</span>
              <input
                type="range"
                min={READER_CONTENT_WIDTH_MIN}
                max={READER_CONTENT_WIDTH_MAX}
                step={20}
                value={contentWidth}
                onChange={(event) => dispatch(setReaderContentWidth(Number(event.target.value)))}
              />
            </label>
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}
