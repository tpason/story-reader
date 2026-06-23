"use client";

import { MessageCircle, X } from "lucide-react";
import { ChapterComments } from "@/components/ChapterComments";

type ReaderCommentsSidebarProps = {
  open: boolean;
  chapterId: string;
  onClose: () => void;
};

export function ReaderCommentsSidebar({ open, chapterId, onClose }: ReaderCommentsSidebarProps) {
  if (!open) return null;

  return (
    <aside className="reader-comments-sidebar" aria-label="Luận đạo chương">
      <div className="reader-comments-sidebar-header">
        <div>
          <p className="eyebrow">Luận đạo</p>
          <h2>
            <MessageCircle size={16} />
            Bàn luận chương
          </h2>
        </div>
        <button type="button" className="reader-comments-sidebar-close" aria-label="Đóng panel luận đạo" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="reader-comments-sidebar-body">
        <ChapterComments chapterId={chapterId} />
      </div>
    </aside>
  );
}
