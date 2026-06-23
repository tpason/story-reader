"use client";

import { BookMarked, StickyNote, X } from "lucide-react";
import type { ParagraphBookmark } from "@/lib/paragraph-bookmarks";

type ReaderNotesSidebarProps = {
  open: boolean;
  bookmarks: ParagraphBookmark[];
  onClose: () => void;
  onJump: (bookmark: ParagraphBookmark) => void;
  onEditNote: (paragraphIndex: number) => void;
};

export function ReaderNotesSidebar({ open, bookmarks, onClose, onJump, onEditNote }: ReaderNotesSidebarProps) {
  if (!open) return null;

  return (
    <aside className="reader-notes-sidebar" aria-label="Ghi chú và dấu đoạn">
      <div className="reader-notes-sidebar-header">
        <div>
          <p className="eyebrow">Động phủ</p>
          <h2>Dấu đoạn & ghi chú</h2>
        </div>
        <button type="button" className="reader-notes-sidebar-close" aria-label="Đóng panel ghi chú" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="reader-notes-sidebar-body">
        {bookmarks.length === 0 ? (
          <p className="reader-notes-sidebar-empty">Chưa có dấu đoạn trong chương này. Bôi đen hoặc dùng nút đánh dấu bên đoạn.</p>
        ) : (
          bookmarks.map((bookmark) => (
            <div className="reader-notes-sidebar-item" key={bookmark.id}>
              <button type="button" className="reader-notes-sidebar-jump" onClick={() => onJump(bookmark)}>
                <BookMarked size={14} />
                <span>
                  <strong>Đoạn {bookmark.paragraphIndex + 1}</strong>
                  <small>{bookmark.excerpt}</small>
                  {bookmark.note ? <em>{bookmark.note}</em> : null}
                </span>
              </button>
              <button type="button" className="reader-notes-sidebar-note" aria-label="Sửa ghi chú" onClick={() => onEditNote(bookmark.paragraphIndex)}>
                <StickyNote size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
