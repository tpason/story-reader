import { useCallback, useEffect, useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
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

export type ParagraphNoteEditorState = {
  chapterNumber: number;
  paragraphIndex: number;
  note: string;
} | null;

export type ParagraphBookmarkTarget = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphIndex: number;
  paragraph: string;
};

export type UseParagraphBookmarksAndNotesOptions = {
  storyId: string;
  /** Truthy when a reader is signed in; gates the server merge fetch. */
  currentUser: unknown;
  /** Current reading progress (0..1), read when creating a new bookmark. */
  progressRef: MutableRefObject<number>;
  /** Surface a transient notice (e.g. swipe toast) after saving a note. */
  onNotice: (message: string) => void;
};

export type UseParagraphBookmarksAndNotesResult = {
  storyParagraphBookmarks: ParagraphBookmark[];
  paragraphBookmarksForChapter: (chapterNumber: number) => ParagraphBookmark[];
  bookmarkedIndexesForChapter: (chapterNumber: number) => Set<number>;
  noteEditor: ParagraphNoteEditorState;
  setNoteEditor: Dispatch<SetStateAction<ParagraphNoteEditorState>>;
  openNoteEditor: (chapterNumber: number, paragraphIndex: number) => void;
  saveNote: () => void;
  toggleBookmark: (target: ParagraphBookmarkTarget) => void;
};

/**
 * Story-scoped paragraph bookmarks + notes. Chapter number disambiguates inline append blocks.
 */
export function useParagraphBookmarksAndNotes({
  storyId,
  currentUser,
  progressRef,
  onNotice,
}: UseParagraphBookmarksAndNotesOptions): UseParagraphBookmarksAndNotesResult {
  const [paragraphBookmarks, setParagraphBookmarks] = useState<ParagraphBookmark[]>([]);
  const [noteEditor, setNoteEditor] = useState<ParagraphNoteEditorState>(null);

  const storyParagraphBookmarks = useMemo(
    () =>
      paragraphBookmarks
        .filter((bookmark) => bookmark.storyId === storyId)
        .sort((left, right) => {
          if (left.chapterNumber !== right.chapterNumber) return left.chapterNumber - right.chapterNumber;
          return left.paragraphIndex - right.paragraphIndex;
        }),
    [paragraphBookmarks, storyId]
  );

  const paragraphBookmarksForChapter = useCallback(
    (chapterNumber: number) =>
      storyParagraphBookmarks.filter((bookmark) => bookmark.chapterNumber === chapterNumber),
    [storyParagraphBookmarks]
  );

  const bookmarkedIndexesForChapter = useCallback(
    (chapterNumber: number) =>
      new Set(paragraphBookmarksForChapter(chapterNumber).map((bookmark) => bookmark.paragraphIndex)),
    [paragraphBookmarksForChapter]
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

  function openNoteEditor(chapterNumber: number, paragraphIndex: number) {
    const bookmark = paragraphBookmarksForChapter(chapterNumber).find((item) => item.paragraphIndex === paragraphIndex);
    if (!bookmark) return;
    setNoteEditor({ chapterNumber, paragraphIndex, note: bookmark.note ?? "" });
  }

  function saveNote() {
    if (!noteEditor) return;
    const bookmark = paragraphBookmarksForChapter(noteEditor.chapterNumber).find(
      (item) => item.paragraphIndex === noteEditor.paragraphIndex
    );
    if (!bookmark) return;
    persistParagraphBookmark({
      ...bookmark,
      note: noteEditor.note.trim() ? noteEditor.note.trim().slice(0, 500) : null,
    });
    setNoteEditor(null);
    onNotice("Đã lưu ghi chú đoạn");
  }

  function toggleBookmark(target: ParagraphBookmarkTarget) {
    const { chapterId, chapterNumber, chapterTitle, paragraphIndex, paragraph } = target;
    const exists = bookmarkedIndexesForChapter(chapterNumber).has(paragraphIndex);
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
        (item) => item.storyId === storyId && item.chapterNumber === chapterNumber && item.paragraphIndex === paragraphIndex
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
    storyParagraphBookmarks,
    paragraphBookmarksForChapter,
    bookmarkedIndexesForChapter,
    noteEditor,
    setNoteEditor,
    openNoteEditor,
    saveNote,
    toggleBookmark,
  };
}
