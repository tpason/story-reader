import { useEffect, useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  deleteParagraphBookmarkOnServer,
  fetchParagraphBookmarks,
  saveParagraphBookmarkOnServer,
} from "@/lib/api-client";
import {
  readParagraphBookmarks,
  removeParagraphBookmark,
  upsertParagraphBookmark,
  writeParagraphBookmarks,
  type ParagraphBookmark,
} from "@/lib/paragraph-bookmarks";

export type ParagraphNoteEditorState = { paragraphIndex: number; note: string } | null;

export type UseParagraphBookmarksAndNotesOptions = {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** Truthy when a reader is signed in; gates the server merge fetch. */
  currentUser: unknown;
  /** Current reading progress (0..1), read when creating a new bookmark. */
  progressRef: MutableRefObject<number>;
  /** Surface a transient notice (e.g. swipe toast) after saving a note. */
  onNotice: (message: string) => void;
};

export type UseParagraphBookmarksAndNotesResult = {
  currentChapterParagraphBookmarks: ParagraphBookmark[];
  bookmarkedParagraphIndexes: Set<number>;
  noteEditor: ParagraphNoteEditorState;
  setNoteEditor: Dispatch<SetStateAction<ParagraphNoteEditorState>>;
  openNoteEditor: (paragraphIndex: number) => void;
  saveNote: () => void;
  toggleBookmark: (paragraphIndex: number, paragraph: string) => void;
};

/**
 * Paragraph bookmarks + notes for the reader: local-first state hydrated from
 * localStorage, merged with the server copy for signed-in readers, with
 * optimistic local writes that reconcile with server responses.
 */
export function useParagraphBookmarksAndNotes({
  storyId,
  chapterId,
  chapterNumber,
  chapterTitle,
  currentUser,
  progressRef,
  onNotice,
}: UseParagraphBookmarksAndNotesOptions): UseParagraphBookmarksAndNotesResult {
  const [paragraphBookmarks, setParagraphBookmarks] = useState<ParagraphBookmark[]>([]);
  const [noteEditor, setNoteEditor] = useState<ParagraphNoteEditorState>(null);

  const currentChapterParagraphBookmarks = useMemo(
    () =>
      paragraphBookmarks
        .filter((bookmark) => bookmark.storyId === storyId && bookmark.chapterNumber === chapterNumber)
        .sort((left, right) => left.paragraphIndex - right.paragraphIndex),
    [chapterNumber, storyId, paragraphBookmarks],
  );
  const bookmarkedParagraphIndexes = useMemo(
    () => new Set(currentChapterParagraphBookmarks.map((bookmark) => bookmark.paragraphIndex)),
    [currentChapterParagraphBookmarks],
  );

  useEffect(() => {
    setParagraphBookmarks(readParagraphBookmarks());
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    fetchParagraphBookmarks(storyId)
      .then((remoteBookmarks) => {
        if (cancelled || remoteBookmarks.length === 0) return;
        const localBookmarks = readParagraphBookmarks();
        const byKey = new Map<string, ParagraphBookmark>();
        [...localBookmarks, ...remoteBookmarks].forEach((bookmark) => {
          byKey.set(`${bookmark.storyId}:${bookmark.chapterNumber}:${bookmark.paragraphIndex}`, bookmark);
        });
        const merged = [...byKey.values()].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        setParagraphBookmarks(merged);
        writeParagraphBookmarks(merged);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [storyId, currentUser]);

  function persistParagraphBookmark(bookmark: ParagraphBookmark) {
    const next = upsertParagraphBookmark(paragraphBookmarks, bookmark);
    setParagraphBookmarks(next);
    writeParagraphBookmarks(next);
    saveParagraphBookmarkOnServer(bookmark)
      .then((remoteBookmark) => {
        if (!remoteBookmark) return;
        setParagraphBookmarks((current) => {
          const merged = upsertParagraphBookmark(current, remoteBookmark);
          writeParagraphBookmarks(merged);
          return merged;
        });
      })
      .catch(() => undefined);
  }

  function openNoteEditor(paragraphIndex: number) {
    const bookmark = currentChapterParagraphBookmarks.find((item) => item.paragraphIndex === paragraphIndex);
    if (!bookmark) return;
    setNoteEditor({ paragraphIndex, note: bookmark.note ?? "" });
  }

  function saveNote() {
    if (!noteEditor) return;
    const bookmark = currentChapterParagraphBookmarks.find((item) => item.paragraphIndex === noteEditor.paragraphIndex);
    if (!bookmark) return;
    persistParagraphBookmark({
      ...bookmark,
      note: noteEditor.note.trim() ? noteEditor.note.trim().slice(0, 500) : null,
    });
    setNoteEditor(null);
    onNotice("Đã lưu ghi chú đoạn");
  }

  function toggleBookmark(paragraphIndex: number, paragraph: string) {
    const exists = bookmarkedParagraphIndexes.has(paragraphIndex);
    const next = exists
      ? removeParagraphBookmark(paragraphBookmarks, {
          storyId,
          chapterNumber,
          paragraphIndex,
        })
      : upsertParagraphBookmark(paragraphBookmarks, {
          id: `paragraph-${storyId}-${chapterNumber}-${paragraphIndex}`,
          storyId,
          chapterId,
          chapterNumber,
          chapterTitle,
          paragraphIndex,
          excerpt: paragraph.slice(0, 120),
          progressPercent: Math.round(progressRef.current * 100) / 100,
          note: null,
          createdAt: new Date().toISOString(),
        });

    setParagraphBookmarks(next);
    writeParagraphBookmarks(next);
    if (exists) {
      deleteParagraphBookmarkOnServer(storyId, chapterNumber, paragraphIndex);
    } else {
      const bookmark = next.find(
        (item) => item.storyId === storyId && item.chapterNumber === chapterNumber && item.paragraphIndex === paragraphIndex,
      );
      if (bookmark) {
        saveParagraphBookmarkOnServer(bookmark)
          .then((remoteBookmark) => {
            if (!remoteBookmark) return;
            setParagraphBookmarks((current) => {
              const merged = upsertParagraphBookmark(current, remoteBookmark);
              writeParagraphBookmarks(merged);
              return merged;
            });
          })
          .catch(() => undefined);
      }
    }
  }

  return {
    currentChapterParagraphBookmarks,
    bookmarkedParagraphIndexes,
    noteEditor,
    setNoteEditor,
    openNoteEditor,
    saveNote,
    toggleBookmark,
  };
}
