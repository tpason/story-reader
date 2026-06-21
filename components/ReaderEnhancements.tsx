"use client";

import { BookOpen, Share2, StickyNote, X } from "lucide-react";
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
  onEdit: () => void;
};

export function ReaderSelectionToolbar({
  x,
  y,
  compact = false,
  glossaryCharacter,
  isAdmin,
  onCopy,
  onShare,
  onEdit
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
      <button type="button" onClick={onCopy}>
        Sao chép
      </button>
      <button type="button" onClick={onShare}>
        <Share2 size={14} />
        Chia sẻ
      </button>
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
  note: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function ReaderParagraphNoteEditor({ excerpt, note, onChange, onSave, onClose }: ReaderParagraphNoteEditorProps) {
  return (
    <div className="reader-paragraph-note-editor" role="dialog" aria-label="Ghi chú đoạn">
      <div className="reader-paragraph-note-editor-header">
        <StickyNote size={16} />
        <strong>Ghi chú đoạn</strong>
        <button type="button" className="reader-paragraph-note-close" aria-label="Đóng" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <p className="reader-paragraph-note-excerpt">{excerpt}</p>
      <textarea
        className="reader-paragraph-note-input"
        value={note}
        maxLength={500}
        placeholder="Ghi nhớ manh mối, nhân vật, suy nghĩ…"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="reader-paragraph-note-actions">
        <button type="button" className="chip" onClick={onSave}>
          Lưu ghi chú
        </button>
      </div>
    </div>
  );
}
