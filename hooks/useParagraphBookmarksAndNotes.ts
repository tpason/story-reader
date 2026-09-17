import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
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

type PendingOp =
  | { type: "upsert"; bookmark: ParagraphBookmark }
  | { type: "delete"; storyId: string; chapterNumber: number; paragraphIndex: number };

const PERSIST_DEBOUNCE_MS = 900;

function bookmarkKey(storyId: string, chapterNumber: number, paragraphIndex: number) {
  return `${storyId}:${chapterNumber}:${paragraphIndex}`;
}

/**
 * Story-scoped paragraph bookmarks + notes. Chapter number disambiguates inline append blocks.
 * Local UI is immediate (draft); server sync is debounced and only runs when signed in.
 */
export function useParagraphBookmarksAndNotes({
  storyId,
  currentUser,
  progressRef,
  onNotice,
}: UseParagraphBookmarksAndNotesOptions): UseParagraphBookmarksAndNotesResult {
  const [paragraphBookmarks, setParagraphBookmarks] = useState<ParagraphBookmark[]>([]);
  const [noteEditor, setNoteEditor] = useState<ParagraphNoteEditorState>(null);
  const pendingOpsRef = useRef(new Map<string, PendingOp>());
  const syncedKeysRef = useRef(new Set<string>());
  const flushTimerRef = useRef<number | null>(null);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

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

  const flushPending = useCallback(async () => {
    if (flushTimerRef.current != null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (!currentUserRef.current) {
      pendingOpsRef.current.clear();
      return;
    }

    const ops = [...pendingOpsRef.current.values()];
    pendingOpsRef.current.clear();
    if (ops.length === 0) return;

    for (const op of ops) {
      if (op.type === "upsert") {
        const remoteBookmark = await saveParagraphBookmarkOnServer(op.bookmark).catch(() => null);
        if (!remoteBookmark) continue;
        const key = bookmarkKey(remoteBookmark.storyId, remoteBookmark.chapterNumber, remoteBookmark.paragraphIndex);
        syncedKeysRef.current.add(key);
        setParagraphBookmarks((current) => {
          const merged = upsertParagraphBookmark(current, remoteBookmark);
          writeParagraphBookmarks(merged);
          return merged;
        });
      } else {
        await deleteParagraphBookmarkOnServer(op.storyId, op.chapterNumber, op.paragraphIndex).catch(() => undefined);
        syncedKeysRef.current.delete(bookmarkKey(op.storyId, op.chapterNumber, op.paragraphIndex));
      }
    }
  }, []);

  const schedulePersist = useCallback(() => {
    if (!currentUserRef.current) {
      pendingOpsRef.current.clear();
      return;
    }
    if (flushTimerRef.current != null) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      void flushPending();
    }, PERSIST_DEBOUNCE_MS);
  }, [flushPending]);

  const queueUpsert = useCallback(
    (bookmark: ParagraphBookmark) => {
      const key = bookmarkKey(bookmark.storyId, bookmark.chapterNumber, bookmark.paragraphIndex);
      pendingOpsRef.current.set(key, { type: "upsert", bookmark });
      schedulePersist();
    },
    [schedulePersist]
  );

  const queueDelete = useCallback(
    (target: Pick<ParagraphBookmark, "storyId" | "chapterNumber" | "paragraphIndex">) => {
      const key = bookmarkKey(target.storyId, target.chapterNumber, target.paragraphIndex);
      const pending = pendingOpsRef.current.get(key);
      // Draft cancel: never reached the server — drop the pending upsert, no DELETE.
      if (pending?.type === "upsert" && !syncedKeysRef.current.has(key)) {
        pendingOpsRef.current.delete(key);
        if (pendingOpsRef.current.size === 0 && flushTimerRef.current != null) {
          window.clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        return;
      }
      pendingOpsRef.current.set(key, {
        type: "delete",
        storyId: target.storyId,
        chapterNumber: target.chapterNumber,
        paragraphIndex: target.paragraphIndex,
      });
      schedulePersist();
    },
    [schedulePersist]
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
        localBookmarks.forEach((bookmark) => {
          byKey.set(bookmarkKey(bookmark.storyId, bookmark.chapterNumber, bookmark.paragraphIndex), bookmark);
        });
        remoteBookmarks.forEach((bookmark) => {
          const key = bookmarkKey(bookmark.storyId, bookmark.chapterNumber, bookmark.paragraphIndex);
          byKey.set(key, bookmark);
          syncedKeysRef.current.add(key);
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

  useEffect(() => {
    const onLeave = () => {
      void flushPending();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      void flushPending();
    };
  }, [flushPending]);

  function applyLocal(next: ParagraphBookmark[]) {
    setParagraphBookmarks(next);
    writeParagraphBookmarks(next);
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
    const nextBookmark = {
      ...bookmark,
      note: noteEditor.note.trim() ? noteEditor.note.trim().slice(0, 500) : null,
    };
    applyLocal(upsertParagraphBookmark(paragraphBookmarks, nextBookmark));
    // Explicit save — persist promptly (still gated by login via queue).
    queueUpsert(nextBookmark);
    setNoteEditor(null);
    onNotice("Đã lưu ghi chú đoạn");
  }

  function toggleBookmark(target: ParagraphBookmarkTarget) {
    const { chapterId, chapterNumber, chapterTitle, paragraphIndex, paragraph } = target;
    const exists = bookmarkedIndexesForChapter(chapterNumber).has(paragraphIndex);

    if (exists) {
      applyLocal(
        removeParagraphBookmark(paragraphBookmarks, {
          storyId,
          chapterNumber,
          paragraphIndex,
        })
      );
      queueDelete({ storyId, chapterNumber, paragraphIndex });
      return;
    }

    const bookmark: ParagraphBookmark = {
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
    };
    applyLocal(upsertParagraphBookmark(paragraphBookmarks, bookmark));
    queueUpsert(bookmark);
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
