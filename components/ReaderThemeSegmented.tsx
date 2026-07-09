"use client";

import { BookOpen, Moon, ScrollText, Sun, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { READER_THEME_OPTIONS, type ReaderTheme } from "@/lib/reader-preferences";
import { setReaderTheme } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";

const THEME_ICONS: Record<ReaderTheme, LucideIcon> = {
  light: Sun,
  parchment: BookOpen,
  bamboo: ScrollText,
  "ink-night": Waves,
  dark: Moon,
  oled: Moon
};

type ReaderThemeSegmentedProps = {
  ariaLabel?: string;
  className?: string;
  variant?: "icons" | "labels";
};

export function ReaderThemeSegmented({
  ariaLabel = "Giao diện",
  className = "",
  variant = "icons"
}: ReaderThemeSegmentedProps) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.readerStyle.config.theme);
  const rootClass = [
    variant === "labels" ? "reader-quick-settings-themes reader-quick-settings-themes--antique" : "segmented reader-theme-mode reader-theme-mode--antique",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="group" aria-label={ariaLabel}>
      {READER_THEME_OPTIONS.map((item) => {
        const Icon = THEME_ICONS[item.id];
        const active = theme === item.id;

        if (variant === "labels") {
          return (
            <button
              key={item.id}
              type="button"
              className={`reader-quick-theme${active ? " reader-quick-theme-active" : ""}`}
              aria-pressed={active}
              title={item.title}
              onClick={() => dispatch(setReaderTheme(item.id))}
            >
              <Icon size={15} aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            aria-pressed={active}
            onClick={() => dispatch(setReaderTheme(item.id))}
          >
            <Icon size={14} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
