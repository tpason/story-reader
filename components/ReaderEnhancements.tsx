"use client";

import { BookOpen, BookmarkPlus, BookOpenCheck, Share2, StickyNote, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GlossaryCharacter } from "@/lib/reader-glossary";
import type { ChapterSummary } from "@/lib/types";

type ReaderResumeBannerProps = {
  paragraphIndex: number | null;
  progressPercent: number;
  onContinue: () => void;
  onDismiss: () => void;
};

export function ReaderResumeBanner({ paragraphIndex, progressPercent, onContinue, onDismiss }: ReaderResumeBannerProps) {
  const label =
    paragraphIndex != null && paragraphIndex > 0
      ? `Bạn dừng ở đoạn ${paragraphIndex + 1}`
      : `Bạn đã đọc ${Math.round(progressPercent)}% chương này`;

  return (
    <div className="reader-resume-banner" role="status">
      <BookOpen size={16} aria-hidden="true" />
      <div className="reader-resume-banner-copy">
        <strong>Tiếp tục tu luyện</strong>
        <span>{label}</span>
      </div>
      <button type="button" className="reader-resume-banner-action" onClick={onContinue}>
        Nhảy tới
      </button>
      <button type="button" className="reader-resume-banner-dismiss" aria-label="Bỏ qua" onClick={onDismiss}>
        <X size={15} />
      </button>
    </div>
  );
}

type ReaderChapterRecapProps = {
  recap: string;
  previousChapter: ChapterSummary | null;
};

export function ReaderChapterRecap({ recap, previousChapter }: ReaderChapterRecapProps) {
  return (
    <aside className="reader-chapter-recap" aria-label="Tóm tắt chương trước">
      <p className="reader-chapter-recap-label">
        Chương trước
        {previousChapter ? ` · ${previousChapter.title}` : ""}
      </p>
      <p className="reader-chapter-recap-text">{recap}</p>
    </aside>
  );
}

type ReaderSelectionToolbarProps = {
  x: number;
  y: number;
  compact?: boolean;
  glossaryCharacter: GlossaryCharacter | null;
  isAdmin: boolean;
  onCopy: () => void;
  onShare: () => void;
  onShareImage?: () => void;
  onEdit: () => void;
  /** ESL: save selected phrase / sentence into local phrase bank. */
  onSavePhrase?: () => void;
  /** ESL: open dictionary / pronunciation lookup. */
  onLookup?: () => void;
};

export function ReaderSelectionToolbar({
  x,
  y,
  compact = false,
  glossaryCharacter,
  isAdmin,
  onCopy,
  onShare,
  onShareImage,
  onEdit,
  onSavePhrase,
  onLookup
}: ReaderSelectionToolbarProps) {
  return (
    <div
      className={`reader-selection-actions${compact ? " reader-selection-actions-compact" : ""}`}
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.preventDefault()}
      role="toolbar"
      aria-label="Thao tác với đoạn chọn"
    >
      {glossaryCharacter ? (
        <div className="reader-selection-glossary" title={glossaryCharacter.role ?? undefined}>
          <strong>{glossaryCharacter.name}</strong>
          {glossaryCharacter.role ? <span>{glossaryCharacter.role}</span> : null}
          {glossaryCharacter.pronouns3rd ? <small>{glossaryCharacter.pronouns3rd}</small> : null}
        </div>
      ) : null}
      {onLookup ? (
        <button type="button" onClick={onLookup}>
          <BookOpenCheck size={14} aria-hidden />
          Tra từ
        </button>
      ) : null}
      {onSavePhrase ? (
        <button type="button" onClick={onSavePhrase}>
          <BookmarkPlus size={14} aria-hidden />
          Lưu câu
        </button>
      ) : null}
      <button type="button" onClick={onCopy}>
        Sao chép
      </button>
      <button type="button" onClick={onShare}>
        <Share2 size={14} />
        Chia sẻ
      </button>
      {onShareImage ? (
        <button type="button" onClick={onShareImage}>
          Ảnh
        </button>
      ) : null}
      {isAdmin ? (
        <button type="button" onClick={onEdit}>
          Sửa
        </button>
      ) : null}
    </div>
  );
}

type ReaderParagraphNoteEditorProps = {
  excerpt: string;
  pairedExcerpt?: string | null;
  note: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  ariaLabel?: string;
};

export function ReaderParagraphNoteEditor({
  excerpt,
  pairedExcerpt,
  note,
  onChange,
  onSave,
  onClose,
  title = "Ghi chú đoạn",
  placeholder = "Ghi nhớ manh mối, nhân vật, suy nghĩ…",
  ariaLabel
}: ReaderParagraphNoteEditorProps) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!portalReady) return null;

  return createPortal(
    <div className="reader-note-modal" role="dialog" aria-modal="true" aria-label={ariaLabel ?? title}>
      <button className="reader-note-modal-backdrop" type="button" aria-label="Đóng ghi chú" onClick={onClose} />
      <div className="reader-paragraph-note-editor reader-note-modal-panel">
        <div className="reader-paragraph-note-editor-header">
          <StickyNote size={16} />
          <strong>{title}</strong>
          <button type="button" className="reader-paragraph-note-close" aria-label="Đóng" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <p className="reader-paragraph-note-excerpt">{excerpt}</p>
        {pairedExcerpt ? <p className="reader-paragraph-note-paired">{pairedExcerpt}</p> : null}
        <textarea
          className="reader-paragraph-note-input"
          value={note}
          maxLength={500}
          autoFocus
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="reader-paragraph-note-actions">
          <button type="button" className="chip" onClick={onSave}>
            Lưu ghi chú
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
