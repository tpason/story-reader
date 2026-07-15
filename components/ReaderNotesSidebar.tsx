"use client";

import { BookMarked, Highlighter, StickyNote, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ParagraphBookmark } from "@/lib/paragraph-bookmarks";
import type { ReaderPhraseNote } from "@/lib/reader-phrase-notes";

type NotesTab = "paragraphs" | "phrases";

type ReaderNotesSidebarProps = {
  open: boolean;
  bookmarks: ParagraphBookmark[];
  phraseNotes?: ReaderPhraseNote[];
  /** When false, keep classic đoạn-only chrome (no ESL tab). */
  showPhraseTab?: boolean;
  onClose: () => void;
  onJump: (bookmark: ParagraphBookmark) => void;
  onEditNote: (bookmark: ParagraphBookmark) => void;
  onJumpPhrase?: (note: ReaderPhraseNote) => void;
  onEditPhrase?: (note: ReaderPhraseNote) => void;
  onDeletePhrase?: (note: ReaderPhraseNote) => void;
  initialTab?: NotesTab;
};

export function ReaderNotesSidebar({
  open,
  bookmarks,
  phraseNotes = [],
  showPhraseTab = false,
  onClose,
  onJump,
  onEditNote,
  onJumpPhrase,
  onEditPhrase,
  onDeletePhrase,
  initialTab = "paragraphs"
}: ReaderNotesSidebarProps) {
  const [tab, setTab] = useState<NotesTab>(initialTab);

  useEffect(() => {
    if (!showPhraseTab && tab === "phrases") setTab("paragraphs");
  }, [showPhraseTab, tab]);

  if (!open) return null;

  return (
    <aside className="reader-notes-sidebar" aria-label="Ghi chú, dấu đoạn và cụm từ">
      <div className="reader-notes-sidebar-header">
        <div>
          <p className="eyebrow">Động phủ</p>
          <h2>{showPhraseTab ? "Ghi chú học đạo" : "Dấu đoạn & ghi chú"}</h2>
        </div>
        <button type="button" className="reader-notes-sidebar-close" aria-label="Đóng panel ghi chú" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {showPhraseTab ? (
        <div className="reader-notes-sidebar-tabs" role="tablist" aria-label="Loại ghi chú">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "paragraphs"}
            className={`reader-notes-sidebar-tab${tab === "paragraphs" ? " is-active" : ""}`}
            onClick={() => setTab("paragraphs")}
          >
            Đoạn
            <span className="reader-notes-sidebar-tab-count">{bookmarks.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "phrases"}
            className={`reader-notes-sidebar-tab${tab === "phrases" ? " is-active" : ""}`}
            onClick={() => setTab("phrases")}
          >
            Cụm từ
            <span className="reader-notes-sidebar-tab-count">{phraseNotes.length}</span>
          </button>
        </div>
      ) : null}

      <div className="reader-notes-sidebar-body">
        {tab === "paragraphs" || !showPhraseTab ? (
          bookmarks.length === 0 ? (
            <p className="reader-notes-sidebar-empty">
              Chưa có dấu đoạn. Bôi đen hoặc dùng nút đánh dấu bên đoạn để lưu manh mối.
            </p>
          ) : (
            bookmarks.map((bookmark) => (
              <div className="reader-notes-sidebar-item" key={bookmark.id}>
                <button type="button" className="reader-notes-sidebar-jump" onClick={() => onJump(bookmark)}>
                  <BookMarked size={14} />
                  <span>
                    <strong>
                      Chương {bookmark.chapterNumber} · Đoạn {bookmark.paragraphIndex + 1}
                    </strong>
                    <small>{bookmark.excerpt}</small>
                    {bookmark.note ? <em>{bookmark.note}</em> : null}
                  </span>
                </button>
                <button type="button" className="reader-notes-sidebar-note" aria-label="Sửa ghi chú" onClick={() => onEditNote(bookmark)}>
                  <StickyNote size={14} />
                </button>
              </div>
            ))
          )
        ) : phraseNotes.length === 0 ? (
          <p className="reader-notes-sidebar-empty">
            Bôi đen cụm từ / câu tiếng Anh rồi chọn <strong>Lưu câu</strong> để học kèm bản Việt.
          </p>
        ) : (
          phraseNotes.map((note) => (
            <div className="reader-notes-sidebar-item reader-notes-sidebar-item-phrase" key={note.id}>
              <button type="button" className="reader-notes-sidebar-jump" onClick={() => onJumpPhrase?.(note)}>
                <Highlighter size={14} />
                <span>
                  <strong>
                    Chương {note.chapterNumber} · Đoạn {note.paragraphIndex + 1}
                  </strong>
                  <small className="reader-notes-sidebar-phrase">{note.phrase}</small>
                  {note.pairedText ? <small className="reader-notes-sidebar-paired">{note.pairedText}</small> : null}
                  {note.note ? <em>{note.note}</em> : null}
                </span>
              </button>
              <div className="reader-notes-sidebar-phrase-actions">
                {onEditPhrase ? (
                  <button type="button" className="reader-notes-sidebar-note" aria-label="Sửa ghi chú cụm từ" onClick={() => onEditPhrase(note)}>
                    <StickyNote size={14} />
                  </button>
                ) : null}
                {onDeletePhrase ? (
                  <button type="button" className="reader-notes-sidebar-note" aria-label="Xóa cụm từ" onClick={() => onDeletePhrase(note)}>
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
