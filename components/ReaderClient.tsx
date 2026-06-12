"use client";

import { ArrowUp, BookMarked, BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, Eye, EyeOff, Headphones, Highlighter, LoaderCircle, Menu, Minus, Moon, MoreHorizontal, Pause, Play, Plus, Search, Settings2, Sun, Type, WifiOff, X } from "lucide-react";
import type { animate as AnimateType } from "animejs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQueryClient } from "@tanstack/react-query";
import { autoUpdate, flip, offset, shift, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import Fuse from "fuse.js";
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import { deleteParagraphBookmarkOnServer, fetchParagraphBookmarks, saveParagraphBookmarkOnServer, saveReadingSessionOnServer } from "@/lib/api-client";
import type { ChapterSummary, CursorPage, ReaderPayload } from "@/lib/types";
import type { ReaderBookmarkItem } from "@/lib/bookmarks";
import { readParagraphBookmarks, removeParagraphBookmark, upsertParagraphBookmark, writeParagraphBookmarks, type ParagraphBookmark } from "@/lib/paragraph-bookmarks";
import { storyHref } from "@/lib/urls";
import { selectCurrentBookmark, selectMaxReadChapter, selectStoryBookmarks } from "@/lib/selectors";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { CultivationPanel } from "@/components/CultivationPanel";
import { UserIdentity } from "@/components/UserIdentity";
import { ChapterComments } from "@/components/ChapterComments";
import { ChapterAudioPlayer } from "@/components/ChapterAudioPlayer";
import { SkillEffectLayer } from "@/components/SkillEffectLayer";
import { FollowButton } from "@/components/FollowButton";
import { NotificationBell } from "@/components/NotificationBell";
import { BackgroundAudioPlayer } from "@/components/BackgroundAudioPlayer";
import { ChapterTransition } from "@/components/ChapterTransition";
import { AmbientSoundPlayer } from "@/components/AmbientSoundPlayer";
import { FloatingTooltip } from "@/components/FloatingTooltip";
import { formatNovelContent } from "@/lib/formatNovelContent";
import { isMobile, prefersReducedMotion, shouldReduceReaderBackgroundWork } from "@/lib/browser";
import { countReadableWords, estimateReadingMinutes } from "@/lib/reading-estimate";
import { isTodayLocal } from "@/lib/date";
import { useLiveQuery } from "dexie-react-hooks";
import { getCachedChapter, offlineDb, preloadNextChapters, type OfflineChapterRecord } from "@/lib/offline-chapters";
import { fetchReaderChapter, readerQueryKeys } from "@/lib/reader-query";
import {
  setReaderContentWidth,
  setReaderFontFamily,
  setReaderFontSize,
  setReaderLineHeight,
  setReaderParagraphSpacing,
  setReaderStyle,
  setReaderTheme,
  store,
  removeBookmarkItem,
  upsertBookmarkItem,
  upsertHistoryItem
} from "@/lib/store";
import {
  READER_CONTENT_WIDTH_MAX,
  READER_CONTENT_WIDTH_MIN,
  READER_FONT_SIZE_MAX,
  READER_FONT_SIZE_MIN,
  READER_LINE_HEIGHT_MAX,
  READER_LINE_HEIGHT_MIN,
  READER_PARAGRAPH_SPACING_MAX,
  READER_PARAGRAPH_SPACING_MIN,
  type ReaderFontFamily
} from "@/lib/reader-preferences";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeReaderProgress = dynamic(() => import("@/components/ThreeReaderProgress").then((mod) => mod.ThreeReaderProgress), {
  ssr: false
});

const StoryCompletionOverlay = dynamic(
  () => import("@/components/StoryCompletionOverlay").then((mod) => mod.StoryCompletionOverlay),
  { ssr: false }
);

const ThreeReaderAtmosphere = dynamic(() => import("@/components/ThreeReaderAtmosphere").then((mod) => mod.ThreeReaderAtmosphere), {
  ssr: false
});

type WakeLockSentinelLike = EventTarget & {
  released: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

const READER_DIM_STORAGE_KEY = "reader-dim-overlay";
const AUTO_SCROLL_START_DELAY_MS = 140;
const AUTO_SCROLL_TOUCH_GUARD_MS = 420;
const AUTO_SCROLL_READ_PAUSE_MS = 4200;
const AUTO_SCROLL_STEP_DURATION_MS = 620;
const COMPACT_VIEWPORT_QUERY = "(max-width: 839px)";
const READER_PARAGRAPH_POSITION_PREFIX = "reader:paragraph-position";
const MOBILE_PROGRESS_COMMIT_INTERVAL_MS = 900;
const DESKTOP_PROGRESS_COMMIT_INTERVAL_MS = 250;
const MOBILE_LOCAL_PROGRESS_PERSIST_MS = 5000;
const DESKTOP_LOCAL_PROGRESS_PERSIST_MS = 1500;
const MOBILE_REMOTE_PROGRESS_PERSIST_MS = 20000;
const DESKTOP_REMOTE_PROGRESS_PERSIST_MS = 5000;

const READER_COMFORT_PRESETS = {
  focus: {
    label: "Focus",
    config: { theme: "sepia", fontSize: 20, fontFamily: "literata", lineHeight: 1.9, paragraphSpacing: 1.28, contentWidth: 760 }
  },
  night: {
    label: "Đêm",
    config: { theme: "dark", fontSize: 20, fontFamily: "noto-serif", lineHeight: 1.88, paragraphSpacing: 1.22, contentWidth: 740 }
  },
  mobile: {
    label: "Mobile nhẹ",
    config: { theme: "sepia", fontSize: 18, fontFamily: "sans", lineHeight: 1.78, paragraphSpacing: 1.08, contentWidth: 680 }
  },
  wide: {
    label: "Desktop rộng",
    config: { theme: "light", fontSize: 19, fontFamily: "sora", lineHeight: 1.84, paragraphSpacing: 1.18, contentWidth: 860 }
  }
} as const;

const PRESET_ICON_COMPONENT = {
  focus: Eye,
  night: Moon,
  mobile: BookOpen,
  wide: Type
} as const;

function clampDimLevel(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.18;
  return Math.min(0.48, Math.max(0.06, parsed));
}

function getPageScrollMetrics() {
  const doc = document.documentElement;
  const body = document.body;
  const scrollingElement = document.scrollingElement ?? doc;
  const scrollTop = scrollingElement.scrollTop || window.scrollY || window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
  const scrollHeight = Math.max(scrollingElement.scrollHeight, doc.scrollHeight, body.scrollHeight, doc.clientHeight);
  const viewportHeight = window.innerHeight || doc.clientHeight || 1;
  return {
    scrollTop,
    scrollHeight,
    viewportHeight,
    maxScrollTop: Math.max(0, scrollHeight - viewportHeight)
  };
}

type AdminEditField = "storyTitle" | "author" | "chapterTitle" | "content";

type AdminEditState = {
  field: AdminEditField;
  value: string;
  selectionStart?: number;
  selectionEnd?: number;
  restoreScrollTop?: number;
} | null;

type ReaderSelectionAction = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  x: number;
  y: number;
} | null;

function scrollPageTo(top: number) {
  const nextTop = Math.max(0, Math.round(top));
  const doc = document.documentElement;
  const body = document.body;
  const scrollingElement = document.scrollingElement ?? doc;
  const previousDocScrollBehavior = doc.style.scrollBehavior;
  const previousBodyScrollBehavior = body.style.scrollBehavior;

  doc.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  scrollingElement.scrollTop = nextTop;
  doc.scrollTop = nextTop;
  body.scrollTop = nextTop;

  if (Math.abs(window.scrollY - nextTop) > 1) {
    window.scrollTo({ top: nextTop, behavior: "auto" });
  }

  doc.style.scrollBehavior = previousDocScrollBehavior;
  body.style.scrollBehavior = previousBodyScrollBehavior;
}

type DocumentWithPointCaret = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

export function ReaderClient({ payload }: { payload: ReaderPayload }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const decorativeWebglEnabled = useDecorativeWebglEnabled();
  const { theme, fontSize, fontFamily, lineHeight, paragraphSpacing, contentWidth } = useAppSelector((state) => state.readerStyle.config);
  const historyHydrated = useAppSelector((state) => state.history.hydrated);
  const currentBookmark = useAppSelector(useMemo(() => selectCurrentBookmark(payload.story.id, payload.chapter.chapterNumber), [payload.story.id, payload.chapter.chapterNumber]));
  const currentUser = useAppSelector((state) => state.identity.user);
  const maxReadChapter = useAppSelector(useMemo(() => selectMaxReadChapter(payload.story.id), [payload.story.id]));
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [chapters, setChapters] = useState(payload.chapters);
  const [previousChapterCursor, setPreviousChapterCursor] = useState(payload.previousChapterCursor);
  const [chapterCursor, setChapterCursor] = useState(payload.chapterCursor);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFormatOpen, setMobileFormatOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [audioAutoStartToken, setAudioAutoStartToken] = useState(0);
  const [chapterSearch, setChapterSearch] = useState("");
  const [readerChromeHidden, setReaderChromeHidden] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(292);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [sheetProgress, setSheetProgress] = useState(0);
  const [mobileProgress, setMobileProgress] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(180);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [readerOverflowOpen, setReaderOverflowOpen] = useState(false);
  const readerOverflowRef = useRef<HTMLDivElement>(null);
  const [floatingActionsMounted, setFloatingActionsMounted] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [highlightContinuePrompt, setHighlightContinuePrompt] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [paragraphBookmarks, setParagraphBookmarks] = useState<ParagraphBookmark[]>([]);
  const [qualityPanelOpen, setQualityPanelOpen] = useState(false);
  const [readerDimEnabled, setReaderDimEnabled] = useState(false);
  const [readerDimLevel, setReaderDimLevel] = useState(0.18);
  const [readerDimHydrated, setReaderDimHydrated] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);
  const [swipeNotice, setSwipeNotice] = useState<string | null>(null);
  const [chapterTransitionTrigger, setChapterTransitionTrigger] = useState(0);
  const [chapterTransitionDirection, setChapterTransitionDirection] = useState<"next" | "prev">("next");
  const [adminEdit, setAdminEdit] = useState<AdminEditState>(null);
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);
  const [selectionAction, setSelectionAction] = useState<ReaderSelectionAction>(null);
  const liveCachedChapters = useLiveQuery(
    () => offlineDb.chapters.where("storyId").equals(payload.story.id).sortBy("chapterNumber"),
    [payload.story.id],
    [] as OfflineChapterRecord[]
  );
  const cachedChapters = useMemo(() => liveCachedChapters ?? [], [liveCachedChapters]);
  const [cachedPayload, setCachedPayload] = useState<ReaderPayload | null>(null);
  const {
    context: formatFloatingContext,
    floatingStyles: formatFloatingStyles,
    refs: formatFloatingRefs
  } = useFloating({
    open: mobileFormatOpen,
    onOpenChange: setMobileFormatOpen,
    placement: "bottom-end",
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate
  });
  const formatDismiss = useDismiss(formatFloatingContext);
  const { getFloatingProps: getFormatFloatingProps, getReferenceProps: getFormatReferenceProps } = useInteractions([formatDismiss]);
  const activePayload = cachedPayload ?? payload;
  const chapterSidebarRef = useRef<HTMLElement | null>(null);
  const desktopSidebarButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousChapterSentinelRef = useRef<HTMLDivElement | null>(null);
  const nextChapterSentinelRef = useRef<HTMLDivElement | null>(null);
  const chapterVirtualizerScrollRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const scrollTopButtonRef = useRef<HTMLButtonElement | null>(null);
  const audioPanelRef = useRef<HTMLElement | null>(null);
  const adminContentEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const adminRestoreScrollTopRef = useRef<number | null>(null);
  const paragraphContainerRef = useRef<HTMLElement | null>(null);
  const formatTriggerRef = useRef<HTMLButtonElement | null>(null);
  const formatPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetPanelRef = useRef<HTMLDivElement | null>(null);
  const lastLocalPersistRef = useRef(0);
  const lastRemotePersistRef = useRef(0);
  const progressRef = useRef(0);
  const contentTopRef = useRef(0);
  const contentHeightRef = useRef(1);
  const scrollFrameRef = useRef<number | null>(null);
  const showScrollTopRef = useRef(false);
  const mobileProgressRef = useRef(0);
  const mobileProgressStateRef = useRef(0);
  const lastMobileProgressCommitRef = useRef(0);
  const mobileProgressIdleTimerRef = useRef<number | null>(null);
  const mobileProgressLabelRef = useRef<HTMLSpanElement | null>(null);
  const mobileMinutesLabelRef = useRef<HTMLSpanElement | null>(null);
  const focusProgressLabelRef = useRef<HTMLElement | null>(null);
  const showContinuePromptRef = useRef(false);
  const highlightContinuePromptRef = useRef(false);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const navCardNextRef = useRef<HTMLAnchorElement | null>(null);
  const completionShownRef = useRef(false);
  const animeRef = useRef<typeof AnimateType | null>(null);
  const warmedNextAudioChapterRef = useRef<string | null>(null);
  const activeParagraphIndexRef = useRef(0);
  const readingSessionRef = useRef({
    clientSessionId: "",
    startedAt: "",
    startParagraphIndex: 0,
    startProgressPercent: 0
  });
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollLastTimeRef = useRef<number | null>(null);
  const autoScrollRemainderRef = useRef(0);
  const autoScrollStartTimerRef = useRef<number | null>(null);
  const autoScrollStepTimerRef = useRef<number | null>(null);
  const autoScrollTouchGuardUntilRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const compactViewportRef = useRef(false);
  const mobileMenuOpenRef = useRef(false);
  const mobileSheetOpenRef = useRef(false);
  const readerChromeHiddenRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const wakeLockRequestedRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const swipeNoticeTimerRef = useRef<number | null>(null);
  const restoredScrollKeyRef = useRef<string | null>(null);
  const suppressSelectionActionUntilRef = useRef(0);
  const readerLayoutStyle = {
    "--reader-sidebar-width": `${desktopSidebarWidth}px`
  } as CSSProperties;
  const readerShellStyle = {
    "--reader-font-size": `${fontSize}px`,
    "--reader-line-height": lineHeight,
    "--reader-paragraph-spacing": `${paragraphSpacing}em`,
    "--reader-content-width": `${contentWidth}px`,
    "--reader-dim-opacity": readerDimEnabled ? readerDimLevel : 0
  } as CSSProperties;

  useEffect(() => {
    setFloatingActionsMounted(true);
  }, []);
  const paragraphs = useMemo(() => {
    if (!activePayload.chapter.content) return [];
    if (activePayload.chapter.isContentPreformatted) {
      return activePayload.chapter.content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    }

    return formatNovelContent(activePayload.chapter.content, undefined, activePayload.chapter.title);
  }, [activePayload.chapter.content, activePayload.chapter.isContentPreformatted, activePayload.chapter.title]);
  const storyBookmarks = useAppSelector(useMemo(() => selectStoryBookmarks(activePayload.story.id), [activePayload.story.id]));
  const currentChapterParagraphBookmarks = useMemo(
    () =>
      paragraphBookmarks
        .filter((bookmark) => bookmark.storyId === activePayload.story.id && bookmark.chapterNumber === activePayload.chapter.chapterNumber)
        .sort((left, right) => left.paragraphIndex - right.paragraphIndex),
    [activePayload.chapter.chapterNumber, activePayload.story.id, paragraphBookmarks]
  );
  const bookmarkedParagraphIndexes = useMemo(
    () => new Set(currentChapterParagraphBookmarks.map((bookmark) => bookmark.paragraphIndex)),
    [currentChapterParagraphBookmarks]
  );
  const formattedPreviewParagraphs = useMemo(
    () => qualityPanelOpen ? formatNovelContent(activePayload.chapter.content, undefined, activePayload.chapter.title) : null,
    [qualityPanelOpen, activePayload.chapter.content, activePayload.chapter.title]
  );
  const totalReadingMinutes = useMemo(
    () => estimateReadingMinutes(countReadableWords(activePayload.chapter.content)),
    [activePayload.chapter.content]
  );

  useLayoutEffect(() => {
    if (adminEdit?.field !== "content") return;
    const editor = adminContentEditorRef.current;
    if (!editor) return;
    const selectionStart = adminEdit.selectionStart ?? 0;
    const selectionEnd = adminEdit.selectionEnd ?? selectionStart;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(selectionStart, selectionEnd);
    if (adminEdit.value.length > 0 && selectionStart > 0) {
      const maxEditorScroll = Math.max(0, editor.scrollHeight - editor.clientHeight);
      editor.scrollTop = Math.max(0, maxEditorScroll * (selectionStart / adminEdit.value.length) - 80);
    }
    if (typeof adminEdit.restoreScrollTop === "number") scrollPageTo(adminEdit.restoreScrollTop);
  }, [adminEdit?.field, adminEdit?.selectionStart, adminEdit?.selectionEnd, adminEdit?.restoreScrollTop, adminEdit?.value.length]);
  const qualityStats = useMemo(() => {
    if (!qualityPanelOpen) return null;
    const rawLines = activePayload.chapter.content?.replace(/\r\n?/g, "\n").split("\n") ?? [];
    const shortLineCount = rawLines.filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && trimmed.length <= 42 && !/[.!?。！？…]"?$/u.test(trimmed);
    }).length;
    const danglingQuoteCount = rawLines.filter((line) => /^["']\s+\S/u.test(line.trim()) || /^["']$/u.test(line.trim())).length;
    return {
      rawLines: rawLines.length,
      paragraphs: paragraphs.length,
      formattedParagraphs: formattedPreviewParagraphs?.length ?? 0,
      shortLineCount,
      danglingQuoteCount
    };
  }, [qualityPanelOpen, activePayload.chapter.content, formattedPreviewParagraphs?.length, paragraphs.length]);
  const offlineReady = cachedChapters.some((r) => r.chapterNumber === activePayload.chapter.chapterNumber);
  const cachedChapterNumbers = useMemo(() => new Set(cachedChapters.map((record) => record.chapterNumber)), [cachedChapters]);
  const sortedCachedChapters = useMemo(
    () => [...cachedChapters].sort((left, right) => left.chapterNumber - right.chapterNumber),
    [cachedChapters]
  );
  const deferredChapterSearch = useDeferredValue(chapterSearch);
  const chapterSearchText = deferredChapterSearch.trim().toLowerCase();
  const chapterSearchIndex = useMemo(
    () =>
      new Fuse(chapters, {
        ignoreLocation: true,
        includeScore: true,
        keys: [
          { name: "chapterNumber", weight: 0.38 },
          { name: "title", weight: 0.62 }
        ],
        shouldSort: true,
        threshold: 0.36
      }),
    [chapters]
  );
  const filteredChapters = useMemo(() => {
    if (!chapterSearchText) return chapters;
    const exactMatches = chapters.filter((chapter) => {
      const chapterNumber = String(chapter.chapterNumber);
      const chapterTitle = chapter.title?.toLowerCase() ?? "";
      return chapterNumber.includes(chapterSearchText) || chapterTitle.includes(chapterSearchText);
    });
    const exactIds = new Set(exactMatches.map((chapter) => chapter.id));
    const fuzzyMatches = chapterSearchIndex.search(chapterSearchText).map((result) => result.item);
    return [...exactMatches, ...fuzzyMatches.filter((chapter) => !exactIds.has(chapter.id))];
  }, [chapterSearchIndex, chapterSearchText, chapters]);
  const canVirtualizeChapterList = filteredChapters.length > 80 && (Boolean(chapterSearchText) || (!previousChapterCursor && !chapterCursor));
  const chapterVirtualizer = useVirtualizer({
    count: filteredChapters.length,
    getScrollElement: () => chapterVirtualizerScrollRef.current,
    estimateSize: () => 78,
    overscan: 8,
    getItemKey: (index) => filteredChapters[index]?.id ?? index
  });
  const storageKey = `reader:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;
  const forceTopKey = `reader:force-top:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;
  const paragraphPositionKey = `${READER_PARAGRAPH_POSITION_PREFIX}:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;

  useEffect(() => {
    setParagraphBookmarks(readParagraphBookmarks());
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    fetchParagraphBookmarks(activePayload.story.id)
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
  }, [activePayload.story.id, currentUser]);

  useEffect(() => {
    const clientSessionId = `${activePayload.story.id}-${activePayload.chapter.chapterNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    readingSessionRef.current = {
      clientSessionId,
      startedAt,
      startParagraphIndex: activeParagraphIndexRef.current,
      startProgressPercent: progressRef.current
    };

    return () => {
      const session = readingSessionRef.current;
      const startedMs = Date.parse(session.startedAt);
      const durationSeconds = Number.isFinite(startedMs) ? Math.max(0, Math.round((Date.now() - startedMs) / 1000)) : 0;
      if (durationSeconds < 5) return;

      saveReadingSessionOnServer({
        clientSessionId: session.clientSessionId,
        storyId: activePayload.story.id,
        chapterId: activePayload.chapter.id,
        chapterNumber: activePayload.chapter.chapterNumber,
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
        durationSeconds,
        startParagraphIndex: session.startParagraphIndex,
        endParagraphIndex: activeParagraphIndexRef.current,
        startProgressPercent: session.startProgressPercent,
        endProgressPercent: progressRef.current,
        deviceKind: isMobile ? "mobile" : "desktop"
      });
    };
  }, [activePayload.chapter.chapterNumber, activePayload.chapter.id, activePayload.story.id]);

  useEffect(() => {
    const compactQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const update = () => {
      compactViewportRef.current = compactQuery.matches;
    };

    update();
    compactQuery.addEventListener("change", update);
    return () => compactQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    mobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  useEffect(() => {
    mobileSheetOpenRef.current = mobileSheetOpen;
  }, [mobileSheetOpen]);

  useEffect(() => {
    setAudioPanelOpen(false);
    setAdminEdit(null);
    setAdminEditError(null);
  }, [activePayload.chapter.id]);

  useEffect(() => {
    queryClient.setQueryData(readerQueryKeys.chapter(activePayload.story.id, activePayload.chapter.chapterNumber), activePayload);
  }, [activePayload, queryClient]);

  useEffect(() => {
    if (compactViewportRef.current) return;
    if (shouldReduceReaderBackgroundWork()) return;
    if (!navigator.onLine) return;
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") return;

    const chaptersToPrefetch = [activePayload.nextChapter?.chapterNumber, activePayload.previousChapter?.chapterNumber].filter(
      (chapterNumber): chapterNumber is number => typeof chapterNumber === "number"
    );
    if (chaptersToPrefetch.length === 0) return;

    const prefetch = () => {
      chaptersToPrefetch.forEach((chapterNumber) => {
        queryClient.prefetchQuery({
          queryKey: readerQueryKeys.chapter(activePayload.story.id, chapterNumber),
          queryFn: () => fetchReaderChapter(activePayload.story.id, chapterNumber),
          staleTime: 1000 * 60 * 8
        });
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = globalThis.setTimeout(prefetch, 900);
    return () => globalThis.clearTimeout(timer);
  }, [activePayload.nextChapter?.chapterNumber, activePayload.previousChapter?.chapterNumber, activePayload.story.id, queryClient]);

  useEffect(() => {
    if (!historyHydrated || restoredScrollKeyRef.current === storageKey) return;
    restoredScrollKeyRef.current = storageKey;

    if (window.sessionStorage.getItem(forceTopKey) === "true") {
      window.sessionStorage.removeItem(forceTopKey);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const bookmarkScrollKey = `reader:bookmark-scroll:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;
    const bookmarkScroll = Number(window.sessionStorage.getItem(bookmarkScrollKey));
    if (Number.isFinite(bookmarkScroll) && bookmarkScroll > 0) {
      window.sessionStorage.removeItem(bookmarkScrollKey);
      window.setTimeout(() => window.scrollTo({ top: bookmarkScroll, behavior: "auto" }), 80);
      return;
    }

    const historyItem = store.getState().history.items.find((item) => item.storyId === activePayload.story.id);
    const localScroll = Number(window.localStorage.getItem(storageKey));
    const savedScroll = Number.isFinite(localScroll) && localScroll > 0
      ? localScroll
      : historyItem?.chapterNumber === activePayload.chapter.chapterNumber
        ? historyItem.scrollPosition
        : 0;

    if (savedScroll > 0) {
      window.setTimeout(() => window.scrollTo({ top: savedScroll, behavior: "auto" }), 80);
      return;
    }

    const savedParagraph = Number(window.localStorage.getItem(paragraphPositionKey));
    if (Number.isInteger(savedParagraph) && savedParagraph > 0) {
      window.setTimeout(() => scrollToParagraph(savedParagraph, "auto"), 90);
    }
  }, [activePayload.chapter.chapterNumber, activePayload.story.id, forceTopKey, historyHydrated, paragraphPositionKey, storageKey]);

  useEffect(() => {
    setChapters(payload.chapters);
    setPreviousChapterCursor(payload.previousChapterCursor);
    setChapterCursor(payload.chapterCursor);
    setMobileMenuOpen(false);
    setMobileFormatOpen(false);
    setMobileSheetOpen(false);
    setReaderOverflowOpen(false);
    setAutoScrollEnabled(false);
    setChapterSearch("");
    setCachedPayload(null);
    setShowCompletionOverlay(false);
    completionShownRef.current = false;
  }, [payload.chapters, payload.previousChapterCursor, payload.chapterCursor]);

  useEffect(() => {
    if (!mobileMenuOpen && !mobileSheetOpen) return;
    readerChromeHiddenRef.current = false;
    setReaderChromeHidden(false);
  }, [mobileMenuOpen, mobileSheetOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleOutsidePointerDown(event: PointerEvent) {
      const sidebar = chapterSidebarRef.current;
      if (!sidebar || sidebar.contains(event.target as Node)) return;
      setMobileMenuOpen(false);
    }
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!readerOverflowOpen) return;
    function handleOutside(event: MouseEvent) {
      if (readerOverflowRef.current && !readerOverflowRef.current.contains(event.target as Node)) {
        setReaderOverflowOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setReaderOverflowOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [readerOverflowOpen]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    import("animejs").then((mod) => { animeRef.current = mod.animate; });
  }, []);

  const centerActiveChapter = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (canVirtualizeChapterList) {
      const activeIndex = filteredChapters.findIndex((chapter) => chapter.chapterNumber === activePayload.chapter.chapterNumber);
      if (activeIndex >= 0) {
        chapterVirtualizer.scrollToIndex(activeIndex, { align: "center", behavior: prefersReducedMotion() ? "auto" : behavior });
        return true;
      }
      return false;
    }

    const sidebar = chapterSidebarRef.current;
    if (!sidebar) return false;

    const activeChapter = sidebar.querySelector<HTMLElement>('[data-active-chapter="true"]');
    if (!activeChapter) return false;

    const reduceMotion = prefersReducedMotion();
    const centeredTop = activeChapter.offsetTop - sidebar.clientHeight / 2 + activeChapter.clientHeight / 2;
    sidebar.scrollTo({
      top: Math.max(0, centeredTop),
      behavior: reduceMotion ? "auto" : behavior
    });
    return true;
  }, [activePayload.chapter.chapterNumber, canVirtualizeChapterList, chapterVirtualizer, filteredChapters]);

  useLayoutEffect(() => {
    const didCenter = centerActiveChapter(mobileMenuOpen ? "smooth" : "auto");
    const sidebar = chapterSidebarRef.current;
    if (!didCenter || !sidebar || prefersReducedMotion() || !animeRef.current) return;

    const activeChapter = sidebar.querySelector<HTMLElement>('[data-active-chapter="true"]');
    if (!activeChapter) return;

    const animation = animeRef.current(activeChapter, {
      x: [0, 5, 0],
      scale: [1, 1.015, 1],
      duration: 520,
      ease: "outElastic(1, .8)"
    });

    return () => {
      animation.revert();
    };
  }, [activePayload.chapter.chapterNumber, centerActiveChapter, chapters.length, desktopSidebarOpen, mobileMenuOpen]);

  useEffect(() => {
    const button = desktopSidebarButtonRef.current;
    const sidebar = chapterSidebarRef.current;
    if (!button || !sidebar || prefersReducedMotion() || !animeRef.current) return;

    const buttonAnimation = animeRef.current(button, {
      rotate: desktopSidebarOpen ? [-6, 0] : [6, 0],
      scale: [0.94, 1],
      duration: 340,
      ease: "outBack"
    });

    const sidebarAnimation = animeRef.current(sidebar, {
      opacity: desktopSidebarOpen ? [0.45, 1] : [1, 0.6],
      duration: desktopSidebarOpen ? 360 : 180,
      ease: "outQuad"
    });

    return () => {
      buttonAnimation.revert();
      sidebarAnimation.revert();
    };
  }, [desktopSidebarOpen]);

  const startDesktopSidebarResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!desktopSidebarOpen) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = desktopSidebarWidth;
    let pendingFrame: number | null = null;
    let pendingWidth = startWidth;
    document.documentElement.dataset.sidebarResizing = "true";

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      pendingWidth = Math.min(430, Math.max(236, Math.round(nextWidth)));
      if (pendingFrame) return;
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;
        setDesktopSidebarWidth(pendingWidth);
      });
    };

    const stopResize = () => {
      if (pendingFrame) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }
      delete document.documentElement.dataset.sidebarResizing;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }, [desktopSidebarOpen, desktopSidebarWidth]);

  const refreshOfflineCache = useCallback((surfaceErrors = false) => {
    if (!surfaceErrors && compactViewportRef.current) return;
    if (!surfaceErrors && shouldReduceReaderBackgroundWork()) return;
    setOfflineError(null);
    setOfflineLoading(true);
    // useLiveQuery handles the reactive read — only trigger the preload here
    preloadNextChapters(activePayload, 3)
      .catch(() => {
        if (surfaceErrors) setOfflineError("Chưa cache được chương. Kiểm tra mạng rồi thử lại.");
      })
      .finally(() => setOfflineLoading(false));
  }, [activePayload]);

  useEffect(() => {
    refreshOfflineCache(false);
  }, [refreshOfflineCache]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(READER_DIM_STORAGE_KEY) ?? "{}") as {
        enabled?: boolean;
        level?: number;
      };
      setReaderDimEnabled(Boolean(stored.enabled));
      setReaderDimLevel(clampDimLevel(stored.level));
    } catch {
      setReaderDimEnabled(false);
      setReaderDimLevel(0.18);
    } finally {
      setReaderDimHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!readerDimHydrated) return;
    window.localStorage.setItem(
      READER_DIM_STORAGE_KEY,
      JSON.stringify({
        enabled: readerDimEnabled,
        level: readerDimLevel
      })
    );
  }, [readerDimEnabled, readerDimHydrated, readerDimLevel]);

  useEffect(() => {
    if (!autoScrollEnabled || mobileMenuOpen || mobileSheetOpen) {
      if (autoScrollStepTimerRef.current) {
        window.clearTimeout(autoScrollStepTimerRef.current);
        autoScrollStepTimerRef.current = null;
      }
      if (autoScrollFrameRef.current) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      autoScrollLastTimeRef.current = null;
      autoScrollRemainderRef.current = 0;
      return;
    }

    function scheduleNextStep(delayMs: number) {
      if (autoScrollStepTimerRef.current) {
        window.clearTimeout(autoScrollStepTimerRef.current);
      }
      autoScrollStepTimerRef.current = window.setTimeout(() => {
        autoScrollStepTimerRef.current = null;
        runStep();
      }, delayMs);
    }

    function animateStep(from: number, to: number, startedAt: number) {
      if (document.visibilityState === "hidden") {
        autoScrollFrameRef.current = null;
        scheduleNextStep(2000);
        return;
      }

      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, elapsed / AUTO_SCROLL_STEP_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      scrollPageTo(from + (to - from) * eased);

      if (progress < 1) {
        autoScrollFrameRef.current = window.requestAnimationFrame(() => animateStep(from, to, startedAt));
        return;
      }

      autoScrollFrameRef.current = null;
      scheduleNextStep(AUTO_SCROLL_READ_PAUSE_MS);
    }

    function runStep() {
      const metrics = getPageScrollMetrics();
      const remaining = metrics.maxScrollTop - metrics.scrollTop;

      if (remaining <= 4) {
        setAutoScrollEnabled(false);
        autoScrollFrameRef.current = null;
        if (autoScrollStepTimerRef.current) {
          window.clearTimeout(autoScrollStepTimerRef.current);
          autoScrollStepTimerRef.current = null;
        }
        autoScrollRemainderRef.current = 0;
        return;
      }

      const viewportAwareStep = Math.min(window.innerHeight * 0.42, Math.max(80, autoScrollSpeed));
      const targetTop = Math.min(metrics.maxScrollTop, metrics.scrollTop + Math.min(remaining, viewportAwareStep));
      autoScrollFrameRef.current = window.requestAnimationFrame(() => animateStep(metrics.scrollTop, targetTop, performance.now()));
    }

    scheduleNextStep(720);
    return () => {
      if (autoScrollStepTimerRef.current) {
        window.clearTimeout(autoScrollStepTimerRef.current);
        autoScrollStepTimerRef.current = null;
      }
      if (autoScrollFrameRef.current) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      autoScrollLastTimeRef.current = null;
      autoScrollRemainderRef.current = 0;
    };
  }, [autoScrollEnabled, autoScrollSpeed, mobileMenuOpen, mobileSheetOpen]);

  useEffect(() => {
    if (!autoScrollEnabled) return;

    const stopAutoScroll = () => setAutoScrollEnabled(false);
    const stopOnTouchMove = () => {
      if (performance.now() < autoScrollTouchGuardUntilRef.current) return;
      stopAutoScroll();
    };
    const stopOnKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Escape"].includes(event.key)) {
        stopAutoScroll();
      }
    };

    window.addEventListener("wheel", stopAutoScroll, { passive: true });
    window.addEventListener("touchmove", stopOnTouchMove, { passive: true });
    window.addEventListener("keydown", stopOnKey);
    return () => {
      window.removeEventListener("wheel", stopAutoScroll);
      window.removeEventListener("touchmove", stopOnTouchMove);
      window.removeEventListener("keydown", stopOnKey);
    };
  }, [autoScrollEnabled]);

  useEffect(() => {
    return () => {
      if (autoScrollStartTimerRef.current) {
        window.clearTimeout(autoScrollStartTimerRef.current);
        autoScrollStartTimerRef.current = null;
      }
      if (autoScrollStepTimerRef.current) {
        window.clearTimeout(autoScrollStepTimerRef.current);
        autoScrollStepTimerRef.current = null;
      }
      if (autoScrollFrameRef.current) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRequestedRef.current = false;
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (lock && !lock.released) {
      lock.release().catch(() => undefined);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLock) {
      setWakeLockError("Trình duyệt này chưa hỗ trợ giữ sáng màn hình.");
      setWakeLockSupported(false);
      return;
    }

    try {
      setWakeLockError(null);
      wakeLockRequestedRef.current = true;
      const lock = await wakeLock.request("screen");
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      lock.addEventListener("release", () => {
        if (wakeLockRef.current === lock) {
          wakeLockRef.current = null;
          setWakeLockActive(false);
        }
      });
    } catch {
      wakeLockRequestedRef.current = false;
      setWakeLockError("Không bật được giữ sáng. Hãy thử lại sau một thao tác chạm.");
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    setWakeLockSupported(Boolean((navigator as NavigatorWithWakeLock).wakeLock));

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && wakeLockRequestedRef.current && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    if (!mobileSheetOpen) return;
    setSheetProgress(Math.round(progressRef.current));

    const panel = mobileSheetPanelRef.current;
    if (!panel || prefersReducedMotion() || !animeRef.current) return;

    const panelAnimation = animeRef.current(panel, {
      y: [28, 0],
      opacity: [0.88, 1],
      duration: 280,
      ease: "outCubic"
    });

    const actions = panel.querySelectorAll<HTMLElement>(".reader-sheet-action, .reader-sheet-section");
    const actionAnimation = animeRef.current(actions, {
      y: [10, 0],
      opacity: [0, 1],
      delay: (_target: HTMLElement, index: number) => index * 24,
      duration: 300,
      ease: "outQuad"
    });

    return () => {
      panelAnimation.revert();
      actionAnimation.revert();
    };
  }, [mobileSheetOpen]);

  useEffect(() => {
    mobileProgressStateRef.current = mobileProgress;
  }, [mobileProgress]);

  useLayoutEffect(() => {
    const updateContentMetrics = () => {
      const contentNode = paragraphContainerRef.current;
      if (!contentNode) return;
      const rect = contentNode.getBoundingClientRect();
      contentTopRef.current = rect.top + window.scrollY;
      contentHeightRef.current = Math.max(1, contentNode.offsetHeight);
    };

    updateContentMetrics();
    const contentNode = paragraphContainerRef.current;
    const resizeObserver = contentNode && "ResizeObserver" in window
      ? new ResizeObserver(updateContentMetrics)
      : null;
    if (contentNode && resizeObserver) {
      resizeObserver.observe(contentNode);
    }
    window.addEventListener("resize", updateContentMetrics);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateContentMetrics);
    };
  }, [paragraphs.length, fontSize, lineHeight, paragraphSpacing, contentWidth]);

  useEffect(() => {
    return () => {
      if (swipeNoticeTimerRef.current) {
        window.clearTimeout(swipeNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mobileSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileSheetOpen]);

  // Reader keyboard shortcuts: ←/→ chapter nav, B bookmark, F focus mode
  useEffect(() => {
    function onReaderKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if ((document.activeElement as HTMLElement | null)?.isContentEditable) return;

      if (event.key === "ArrowRight" && activePayload.nextChapter) {
        event.preventDefault();
        router.push(storyHref(activePayload.story, activePayload.nextChapter.chapterNumber));
      } else if (event.key === "ArrowLeft" && activePayload.previousChapter) {
        event.preventDefault();
        router.push(storyHref(activePayload.story, activePayload.previousChapter.chapterNumber));
      } else if (event.key === "b" || event.key === "B") {
        toggleBookmark();
      } else if (event.key === "f" || event.key === "F") {
        setFocusModeEnabled((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onReaderKey);
    return () => window.removeEventListener("keydown", onReaderKey);
  }, [activePayload.nextChapter, activePayload.previousChapter, activePayload.story, router]);

  useEffect(() => {
    function persistProgress(scrollY: number, currentProgress: number, syncRemote: boolean) {
      const item = {
        storyId: activePayload.story.id,
        storyTitle: activePayload.story.title,
        coverImageUrl: activePayload.story.coverImageUrl,
        chapterId: activePayload.chapter.id,
        chapterNumber: activePayload.chapter.chapterNumber,
        chapterTitle: activePayload.chapter.title,
        scrollPosition: Math.round(scrollY),
        paragraphIndex: activeParagraphIndexRef.current,
        progressPercent: Math.round(currentProgress * 100) / 100,
        maxReadChapterNumber: activePayload.chapter.chapterNumber,
        totalChapters: activePayload.story.totalChapters,
        lastReadAt: new Date().toISOString()
      };

      dispatch(upsertHistoryItem(item));
      window.localStorage.setItem(storageKey, String(Math.round(scrollY)));

      if (syncRemote) {
        fetch("/api/reading-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
          keepalive: true
        }).catch(() => undefined);
      }
    }

    const onScroll = () => {
      if (scrollFrameRef.current) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        const scrollingElement = document.scrollingElement ?? document.documentElement;
        const scrollTop = scrollingElement.scrollTop || window.scrollY;
        const scrollable = Math.max(1, scrollingElement.scrollHeight - window.innerHeight);
        const current = Math.min(100, Math.max(0, (scrollTop / scrollable) * 100));
        const contentProgress = Math.min(
          100,
          Math.max(0, ((scrollTop + window.innerHeight * 0.78 - contentTopRef.current) / contentHeightRef.current) * 100)
        );
        const nearPageEnd = scrollable - scrollTop <= window.innerHeight * 2.5;
        const shouldShowScrollTop = scrollTop > Math.min(720, window.innerHeight * 0.8);
        const shouldShowContinue = Boolean(activePayload.nextChapter) && (current >= 92 || contentProgress >= 92 || nearPageEnd);
        const shouldHighlightContinue = shouldShowContinue;
        const now = Date.now();
        const isCompactViewport = compactViewportRef.current;
        const lastScrollTop = lastScrollTopRef.current;
        const scrollingDown = scrollTop > lastScrollTop + 10;
        const scrollingUp = scrollTop < lastScrollTop - 10;

        progressRef.current = current;
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${current / 100})`;
        }

        if (showScrollTopRef.current !== shouldShowScrollTop) {
          showScrollTopRef.current = shouldShowScrollTop;
          setShowScrollTop(shouldShowScrollTop);
        }
        const scrollTopButton = scrollTopButtonRef.current;
        if (scrollTopButton) {
          scrollTopButton.classList.toggle("scroll-top-button-visible", shouldShowScrollTop);
          scrollTopButton.setAttribute("aria-hidden", shouldShowScrollTop ? "false" : "true");
          scrollTopButton.tabIndex = shouldShowScrollTop ? 0 : -1;
        }

        const roundedProgress = Math.round(current);
        if (mobileProgressRef.current !== roundedProgress) {
          mobileProgressRef.current = roundedProgress;
          if (mobileProgressLabelRef.current) {
            mobileProgressLabelRef.current.textContent = `${roundedProgress}%`;
          }
          if (focusProgressLabelRef.current) {
            focusProgressLabelRef.current.textContent = `${roundedProgress}%`;
          }
          if (mobileMinutesLabelRef.current) {
            const nextMinutesLeft = Math.max(0, Math.ceil(totalReadingMinutes * (1 - roundedProgress / 100)));
            mobileMinutesLabelRef.current.textContent = nextMinutesLeft > 0 ? `~${nextMinutesLeft} phút` : "";
            mobileMinutesLabelRef.current.hidden = nextMinutesLeft <= 0;
          }

          const progressCommitInterval = isCompactViewport ? MOBILE_PROGRESS_COMMIT_INTERVAL_MS : DESKTOP_PROGRESS_COMMIT_INTERVAL_MS;
          const shouldCommitProgress =
            now - lastMobileProgressCommitRef.current > progressCommitInterval ||
            Math.abs(roundedProgress - mobileProgressStateRef.current) >= 5 ||
            roundedProgress === 0 ||
            roundedProgress === 100;
          if (shouldCommitProgress) {
            mobileProgressStateRef.current = roundedProgress;
            lastMobileProgressCommitRef.current = now;
            setMobileProgress(roundedProgress);
          }
          if (mobileProgressIdleTimerRef.current) {
            window.clearTimeout(mobileProgressIdleTimerRef.current);
          }
          mobileProgressIdleTimerRef.current = window.setTimeout(() => {
            mobileProgressIdleTimerRef.current = null;
            const latestProgress = mobileProgressRef.current;
            if (mobileProgressStateRef.current !== latestProgress) {
              mobileProgressStateRef.current = latestProgress;
              lastMobileProgressCommitRef.current = Date.now();
              setMobileProgress(latestProgress);
            }
          }, isCompactViewport ? 360 : 140);
        }

        const continueStateChanged = showContinuePromptRef.current !== shouldShowContinue || highlightContinuePromptRef.current !== shouldHighlightContinue;
        showContinuePromptRef.current = shouldShowContinue;
        highlightContinuePromptRef.current = shouldHighlightContinue;
        const btn = continueButtonRef.current;
        if (btn) {
          btn.classList.toggle("reader-continue-fab-visible", shouldShowContinue);
          btn.classList.toggle("reader-continue-fab-near-end", shouldHighlightContinue);
          btn.setAttribute("aria-hidden", shouldShowContinue ? "false" : "true");
          btn.tabIndex = shouldShowContinue ? 0 : -1;
        }
        if (continueStateChanged) {
          setShowContinuePrompt(shouldShowContinue);
          setHighlightContinuePrompt(shouldHighlightContinue);
          const navCard = navCardNextRef.current;
          if (navCard) {
            navCard.classList.toggle("nav-card-next-active", shouldHighlightContinue);
          }
        }

        // Story completion overlay — only on last chapter of a completed story
        if (
          current >= 96 &&
          activePayload.story.isCompleted &&
          !activePayload.nextChapter &&
          !completionShownRef.current
        ) {
          const storageKey = `completion:shown:${activePayload.story.id}`;
          if (!window.localStorage.getItem(storageKey)) {
            completionShownRef.current = true;
            window.localStorage.setItem(storageKey, "true");
            setShowCompletionOverlay(true);
          }
        }

        const nextChapterToWarm = activePayload.nextChapter;
        if (
          current >= 78 &&
          audioPanelOpen &&
          !shouldReduceReaderBackgroundWork() &&
          nextChapterToWarm &&
          warmedNextAudioChapterRef.current !== nextChapterToWarm.id
        ) {
          warmedNextAudioChapterRef.current = nextChapterToWarm.id;
          const warmNextChapter = () => {
            queryClient
              .fetchQuery({
                queryKey: readerQueryKeys.chapter(activePayload.story.id, nextChapterToWarm.chapterNumber),
                queryFn: () => fetchReaderChapter(activePayload.story.id, nextChapterToWarm.chapterNumber),
                staleTime: 1000 * 60 * 8
              })
              .then((nextPayload) => {
                if (nextPayload.chapter.audioHlsUrl) {
                  const warmUrl = nextPayload.chapter.audioHlsUrl.replace(/\/master\.m3u8(?:$|\?)/, "");
                  fetch(warmUrl, { method: "POST", keepalive: true }).catch(() => undefined);
                }
              })
              .catch(() => undefined);
          };
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(warmNextChapter, { timeout: 2000 });
          } else {
            globalThis.setTimeout(warmNextChapter, 0);
          }
        }

        if (isCompactViewport) {
          const hasMobileOverlay = mobileMenuOpenRef.current || mobileSheetOpenRef.current;
          const shouldHideChrome = !hasMobileOverlay && scrollTop > 150 && scrollingDown;
          const shouldShowChrome = hasMobileOverlay || scrollTop < 80 || scrollingUp;
          const nextHidden = shouldHideChrome ? true : shouldShowChrome ? false : readerChromeHiddenRef.current;
          if (readerChromeHiddenRef.current !== nextHidden) {
            readerChromeHiddenRef.current = nextHidden;
            setReaderChromeHidden(nextHidden);
          }
        } else if (readerChromeHiddenRef.current) {
          readerChromeHiddenRef.current = false;
          setReaderChromeHidden(false);
        }
        lastScrollTopRef.current = Math.max(0, scrollTop);

        const localPersistInterval = isCompactViewport ? MOBILE_LOCAL_PROGRESS_PERSIST_MS : DESKTOP_LOCAL_PROGRESS_PERSIST_MS;
        if (now - lastLocalPersistRef.current > localPersistInterval) {
          const remotePersistInterval = isCompactViewport ? MOBILE_REMOTE_PROGRESS_PERSIST_MS : DESKTOP_REMOTE_PROGRESS_PERSIST_MS;
          const shouldSyncRemote = now - lastRemotePersistRef.current > remotePersistInterval;
          persistProgress(scrollTop, current, shouldSyncRemote);
          window.localStorage.setItem(paragraphPositionKey, String(activeParagraphIndexRef.current));
          lastLocalPersistRef.current = now;
          if (shouldSyncRemote) lastRemotePersistRef.current = now;
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      if (mobileProgressIdleTimerRef.current) {
        window.clearTimeout(mobileProgressIdleTimerRef.current);
        mobileProgressIdleTimerRef.current = null;
      }
      persistProgress(window.scrollY, progressRef.current, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, [activePayload.chapter, activePayload.nextChapter, activePayload.story, audioPanelOpen, dispatch, paragraphPositionKey, queryClient, storageKey, totalReadingMinutes]);

  // Sync continue button DOM state after any React re-render so the class isn't lost
  useLayoutEffect(() => {
    const isVisible = showContinuePromptRef.current;
    const shouldHighlight = highlightContinuePromptRef.current;
    const btn = continueButtonRef.current;
    if (btn) {
      btn.classList.toggle("reader-continue-fab-visible", isVisible);
      btn.classList.toggle("reader-continue-fab-near-end", shouldHighlight);
      btn.setAttribute("aria-hidden", isVisible ? "false" : "true");
      btn.tabIndex = isVisible ? 0 : -1;
    }
    const navCard = navCardNextRef.current;
    if (navCard) {
      navCard.classList.toggle("nav-card-next-active", shouldHighlight);
    }
  });

  useLayoutEffect(() => {
    const currentProgress = mobileProgressRef.current;
    if (mobileProgressLabelRef.current) {
      mobileProgressLabelRef.current.textContent = `${currentProgress}%`;
    }
    if (focusProgressLabelRef.current) {
      focusProgressLabelRef.current.textContent = `${currentProgress}%`;
    }
    if (mobileMinutesLabelRef.current) {
      const nextMinutesLeft = Math.max(0, Math.ceil(totalReadingMinutes * (1 - currentProgress / 100)));
      mobileMinutesLabelRef.current.textContent = nextMinutesLeft > 0 ? `~${nextMinutesLeft} phút` : "";
      mobileMinutesLabelRef.current.hidden = nextMinutesLeft <= 0;
    }
  });

  useEffect(() => {
    const button = scrollTopButtonRef.current;
    if (!button || prefersReducedMotion() || !animeRef.current) return;

    const animation = animeRef.current(button, {
      scale: showScrollTop ? [0.84, 1] : [1, 0.9],
      rotate: showScrollTop ? [-8, 0] : [0, 4],
      opacity: showScrollTop ? [0, 1] : [1, 0],
      duration: showScrollTop ? 420 : 180,
      ease: showScrollTop ? "outBack" : "inQuad"
    });

    return () => {
      animation.revert();
    };
  }, [showScrollTop]);

  useEffect(() => {
    const button = formatTriggerRef.current;
    if (!button || prefersReducedMotion() || !animeRef.current) return;

    const animation = animeRef.current(button, {
      rotate: mobileFormatOpen ? [0, -8, 0] : [0, 5, 0],
      scale: mobileFormatOpen ? [1, 1.08, 1] : [1, 0.96, 1],
      duration: 360,
      ease: "outBack"
    });

    return () => {
      animation.revert();
    };
  }, [mobileFormatOpen]);

  // Track active paragraph via IntersectionObserver — replaces per-frame getBoundingClientRect loop.
  // Observes a thin band at ~34% from viewport top; updates activeParagraphIndexRef passively.
  useEffect(() => {
    const container = paragraphContainerRef.current;
    if (!container || !paragraphs.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.paragraphIndex);
            if (Number.isInteger(index)) activeParagraphIndexRef.current = index;
          }
        }
      },
      { rootMargin: "-33% 0px -63% 0px", threshold: 0 }
    );

    container.querySelectorAll<HTMLElement>("[data-paragraph-index]").forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [paragraphs]);

  const loadNextChapters = useCallback(() => {
    if (!chapterCursor || loadingChapters) return;
    setLoadingChapters(true);
    queryClient
      .fetchQuery({
        queryKey: readerQueryKeys.chapterList(activePayload.story.id, chapterCursor, "next"),
        queryFn: async () => {
          const response = await fetch(`/api/stories/${activePayload.story.id}/chapters?cursor=${encodeURIComponent(chapterCursor)}&limit=80`);
          if (!response.ok) throw new Error("Không tải được danh sách chương");
          return response.json() as Promise<CursorPage<ChapterSummary>>;
        },
        staleTime: 1000 * 60 * 10
      })
      .then((page) => {
        setChapters((current) => {
          const existing = new Set(current.map((chapter) => chapter.id));
          return [...current, ...page.items.filter((chapter) => !existing.has(chapter.id))];
        });
        setPreviousChapterCursor((current) => current ?? page.previousCursor ?? null);
        setChapterCursor(page.nextCursor);
      })
      .catch(() => undefined)
      .finally(() => setLoadingChapters(false));
  }, [chapterCursor, loadingChapters, activePayload.story.id, queryClient]);

  const loadPreviousChapters = useCallback(() => {
    if (!previousChapterCursor || loadingChapters) return;
    const sidebar = chapterSidebarRef.current;
    const previousScrollHeight = sidebar?.scrollHeight ?? 0;
    const previousScrollTop = sidebar?.scrollTop ?? 0;

    setLoadingChapters(true);
    queryClient
      .fetchQuery({
        queryKey: readerQueryKeys.chapterList(activePayload.story.id, previousChapterCursor, "previous"),
        queryFn: async () => {
          const response = await fetch(`/api/stories/${activePayload.story.id}/chapters?cursor=${encodeURIComponent(previousChapterCursor)}&direction=previous&limit=80`);
          if (!response.ok) throw new Error("Không tải được danh sách chương");
          return response.json() as Promise<CursorPage<ChapterSummary>>;
        },
        staleTime: 1000 * 60 * 10
      })
      .then((page) => {
        setChapters((current) => {
          const existing = new Set(current.map((chapter) => chapter.id));
          return [...page.items.filter((chapter) => !existing.has(chapter.id)), ...current];
        });
        setPreviousChapterCursor(page.previousCursor ?? null);

        window.requestAnimationFrame(() => {
          const currentSidebar = chapterSidebarRef.current;
          if (!currentSidebar) return;
          currentSidebar.scrollTop = previousScrollTop + Math.max(0, currentSidebar.scrollHeight - previousScrollHeight);
        });
      })
      .catch(() => undefined)
      .finally(() => setLoadingChapters(false));
  }, [loadingChapters, activePayload.story.id, previousChapterCursor, queryClient]);

  useEffect(() => {
    if (chapterSearchText) return;
    const sidebar = chapterSidebarRef.current;
    const previousSentinel = previousChapterSentinelRef.current;
    const nextSentinel = nextChapterSentinelRef.current;
    if (!sidebar || !previousSentinel || !nextSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === previousSentinel) loadPreviousChapters();
          if (entry.target === nextSentinel) loadNextChapters();
        });
      },
      { root: sidebar, rootMargin: "180px 0px" }
    );

    observer.observe(previousSentinel);
    observer.observe(nextSentinel);
    return () => observer.disconnect();
  }, [chapterSearchText, loadNextChapters, loadPreviousChapters]);

  function scrollToTop() {
    const reduceMotion = prefersReducedMotion();
    const button = scrollTopButtonRef.current;

    if (button && !reduceMotion && animeRef.current) {
      animeRef.current(button, {
        y: [0, -8, 0],
        scale: [1, 1.12, 1],
        duration: 520,
        ease: "outElastic(1, .7)"
      });
    }

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  }

  function scrollToAudioPanel() {
    setAudioPanelOpen(true);
    setAudioAutoStartToken((value) => value + 1);
    setMobileSheetOpen(false);
    window.requestAnimationFrame(() => {
      const panel = audioPanelRef.current;
      if (!panel) return;
      panel.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    });
  }

  function keepSheetSectionVisible(event: SyntheticEvent<HTMLDetailsElement>) {
    const details = event.currentTarget;
    if (!details.open) return;

    window.requestAnimationFrame(() => {
      const panel = mobileSheetPanelRef.current;
      if (!panel || !panel.contains(details)) return;

      const panelRect = panel.getBoundingClientRect();
      const detailsRect = details.getBoundingClientRect();
      const bottomPadding = 22;

      if (detailsRect.bottom > panelRect.bottom - bottomPadding || detailsRect.top < panelRect.top + 12) {
        details.scrollIntoView({
          block: "nearest",
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
      }
    });
  }

  function scrollToParagraph(paragraphIndex: number, behavior: ScrollBehavior = "smooth") {
    const paragraph = paragraphContainerRef.current?.querySelector<HTMLElement>(`[data-paragraph-index="${paragraphIndex}"]`);
    if (!paragraph) return;
    paragraph.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : behavior
    });
  }

  function restoreAdminEditScroll(top = adminRestoreScrollTopRef.current) {
    if (top === null) return;
    adminRestoreScrollTopRef.current = null;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollPageTo(top));
    });
  }

  function contentOffsetForParagraph(paragraphIndex: number) {
    return paragraphs.slice(0, paragraphIndex).reduce((offset, paragraph) => offset + paragraph.length + 2, 0);
  }

  function contentCaretOffsetFromPoint(event: ReactMouseEvent<HTMLElement>, paragraphIndex: number) {
    const paragraphText = paragraphs[paragraphIndex] ?? "";
    const paragraphStart = contentOffsetForParagraph(paragraphIndex);
    const textRoot = event.currentTarget.querySelector<HTMLElement>(".reader-paragraph-text") ?? event.currentTarget;
    const pointDocument = document as DocumentWithPointCaret;
    const caretPosition = pointDocument.caretPositionFromPoint?.(event.clientX, event.clientY);
    const caretRange = caretPosition ? null : pointDocument.caretRangeFromPoint?.(event.clientX, event.clientY);
    const caretNode = caretPosition?.offsetNode ?? caretRange?.startContainer ?? null;
    const caretOffset = caretPosition?.offset ?? caretRange?.startOffset ?? 0;

    if (caretNode && textRoot.contains(caretNode)) {
      const range = document.createRange();
      range.setStart(textRoot, 0);
      range.setEnd(caretNode, caretOffset);
      const localOffset = Math.min(paragraphText.length, Math.max(0, range.toString().length));
      return paragraphStart + localOffset;
    }

    const rect = textRoot.getBoundingClientRect();
    if (event.clientX >= rect.right) return paragraphStart + paragraphText.length;
    return paragraphStart;
  }

  function selectedContentRange(content: string) {
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    if (!selection || selection.isCollapsed || !selectedText?.trim()) return null;
    const container = paragraphContainerRef.current;
    if (!container) return null;
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if ((anchorNode && !container.contains(anchorNode)) || (focusNode && !container.contains(focusNode))) return null;
    const start = content.indexOf(selectedText);
    if (start < 0) return null;
    return { start, end: start + selectedText.length };
  }

  function selectedContentAction(content: string): ReaderSelectionAction {
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    if (!selection || selection.isCollapsed || !selectedText?.trim() || selection.rangeCount === 0) return null;
    const container = paragraphContainerRef.current;
    if (!container) return null;
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if ((anchorNode && !container.contains(anchorNode)) || (focusNode && !container.contains(focusNode))) return null;
    const selectionStart = content.indexOf(selectedText);
    if (selectionStart < 0) return null;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const x = Math.min(window.innerWidth - 18, Math.max(18, rect.left + rect.width / 2));
    const y = Math.min(window.innerHeight - 72, Math.max(16, rect.top - 14));
    return {
      text: selectedText,
      selectionStart,
      selectionEnd: selectionStart + selectedText.length,
      x,
      y
    };
  }

  function applyComfortPreset(presetKey: keyof typeof READER_COMFORT_PRESETS) {
    const preset = READER_COMFORT_PRESETS[presetKey];
    dispatch(setReaderStyle(preset.config));
    if (presetKey === "focus") setFocusModeEnabled(true);
    if (presetKey === "mobile") {
      setReaderDimEnabled(false);
      setFocusModeEnabled(false);
    }
    setMobileSheetOpen(false);
  }

  function startAdminEdit(field: AdminEditField, value: string | null | undefined, options: { selectionStart?: number; selectionEnd?: number } = {}) {
    if (!currentUser?.isAdmin || adminEditSaving) return;
    const restoreScrollTop = getPageScrollMetrics().scrollTop;
    adminRestoreScrollTopRef.current = restoreScrollTop;
    setAdminEdit({
      field,
      value: value ?? "",
      restoreScrollTop,
      selectionStart: options.selectionStart,
      selectionEnd: options.selectionEnd
    });
    setSelectionAction(null);
    setAdminEditError(null);
  }

  function startContentAdminEdit(options: { paragraphIndex?: number; caretOffset?: number } = {}) {
    if (adminEdit) return;
    const content = activePayload.chapter.content ?? paragraphs.join("\n\n");
    if (typeof options.caretOffset === "number") {
      const caretOffset = Math.min(content.length, Math.max(0, options.caretOffset));
      startAdminEdit("content", content, { selectionStart: caretOffset, selectionEnd: caretOffset });
      return;
    }
    if (typeof options.paragraphIndex === "number") {
      const start = contentOffsetForParagraph(options.paragraphIndex);
      startAdminEdit("content", content, { selectionStart: start, selectionEnd: start });
      return;
    }
    const selectionRange = selectedContentRange(content);
    if (selectionRange) {
      startAdminEdit("content", content, { selectionStart: selectionRange.start, selectionEnd: selectionRange.end });
      return;
    }
    startAdminEdit("content", content);
  }

  function maybeShowContentSelectionActions() {
    if (adminEdit) return;
    if (Date.now() < suppressSelectionActionUntilRef.current) return;
    if (isMobile || compactViewportRef.current) {
      setSelectionAction(null);
      return;
    }
    const content = activePayload.chapter.content ?? paragraphs.join("\n\n");
    setSelectionAction(selectedContentAction(content));
  }

  async function copySelectedContent() {
    if (!selectionAction?.text) return;
    try {
      await navigator.clipboard.writeText(selectionAction.text);
      setSwipeNotice("Đã copy đoạn chọn");
    } catch {
      setSwipeNotice("Không copy được đoạn chọn");
    }
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
  }

  function editSelectedContent() {
    if (!selectionAction || !currentUser?.isAdmin) return;
    const content = activePayload.chapter.content ?? paragraphs.join("\n\n");
    const { selectionStart, selectionEnd } = selectionAction;
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
    startAdminEdit("content", content, { selectionStart, selectionEnd });
  }

  function cancelAdminEdit() {
    const restoreTop = adminEdit?.restoreScrollTop ?? adminRestoreScrollTopRef.current;
    setAdminEdit(null);
    setSelectionAction(null);
    setAdminEditError(null);
    restoreAdminEditScroll(restoreTop);
  }

  async function saveAdminEdit() {
    if (!adminEdit || !currentUser?.isAdmin) return;
    setAdminEditSaving(true);
    setAdminEditError(null);
    const body: Record<string, string> = {
      storyId: activePayload.story.id,
      chapterId: activePayload.chapter.id
    };
    if (adminEdit.field === "storyTitle") body.storyTitle = adminEdit.value;
    if (adminEdit.field === "author") body.author = adminEdit.value;
    if (adminEdit.field === "chapterTitle") body.chapterTitle = adminEdit.value;
    if (adminEdit.field === "content") body.content = adminEdit.value;

    try {
      const response = await fetch("/api/admin/reader-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Không lưu được chỉnh sửa.");
      }
      const refreshed = await fetchReaderChapter(activePayload.story.id, activePayload.chapter.chapterNumber);
      queryClient.setQueryData(readerQueryKeys.chapter(activePayload.story.id, activePayload.chapter.chapterNumber), refreshed);
      setCachedPayload(refreshed);
      adminRestoreScrollTopRef.current = adminEdit.restoreScrollTop ?? adminRestoreScrollTopRef.current;
      setAdminEdit(null);
      restoreAdminEditScroll(adminRestoreScrollTopRef.current);
    } catch (error) {
      setAdminEditError(error instanceof Error ? error.message : "Không lưu được chỉnh sửa.");
    } finally {
      setAdminEditSaving(false);
    }
  }

  function toggleParagraphBookmark(paragraphIndex: number, paragraph: string) {
    const exists = bookmarkedParagraphIndexes.has(paragraphIndex);
    const next = exists
      ? removeParagraphBookmark(paragraphBookmarks, {
          storyId: activePayload.story.id,
          chapterNumber: activePayload.chapter.chapterNumber,
          paragraphIndex
        })
      : upsertParagraphBookmark(paragraphBookmarks, {
          id: `paragraph-${activePayload.story.id}-${activePayload.chapter.chapterNumber}-${paragraphIndex}`,
          storyId: activePayload.story.id,
          chapterId: activePayload.chapter.id,
          chapterNumber: activePayload.chapter.chapterNumber,
          chapterTitle: activePayload.chapter.title,
          paragraphIndex,
          excerpt: paragraph.slice(0, 120),
          progressPercent: Math.round(progressRef.current * 100) / 100,
          createdAt: new Date().toISOString()
        });

    setParagraphBookmarks(next);
    writeParagraphBookmarks(next);
    if (exists) {
      deleteParagraphBookmarkOnServer(activePayload.story.id, activePayload.chapter.chapterNumber, paragraphIndex);
    } else {
      const bookmark = next.find(
        (item) =>
          item.storyId === activePayload.story.id &&
          item.chapterNumber === activePayload.chapter.chapterNumber &&
          item.paragraphIndex === paragraphIndex
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

  async function openNextChapterFast() {
    const nextChapter = activePayload.nextChapter;
    if (!nextChapter) return;
    setChapterTransitionDirection("next");
    setChapterTransitionTrigger((t) => t + 1);
    markChapterListNavigation(nextChapter.chapterNumber);

    const queryPayload = queryClient.getQueryData<ReaderPayload>(readerQueryKeys.chapter(activePayload.story.id, nextChapter.chapterNumber));
    const cached = queryPayload ? null : await getCachedChapter(activePayload.story.id, nextChapter.chapterNumber);
    const nextPayload = queryPayload ?? cached?.payload;

    if (nextPayload) {
      setCachedPayload(nextPayload);
      queryClient.setQueryData(readerQueryKeys.chapter(nextPayload.story.id, nextPayload.chapter.chapterNumber), nextPayload);
      window.history.replaceState(null, "", storyHref(nextPayload.story, nextPayload.chapter.chapterNumber));
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    router.push(storyHref(activePayload.story, nextChapter.chapterNumber));
  }

  async function openCachedChapter(chapterNumber: number) {
    const queryPayload = queryClient.getQueryData<ReaderPayload>(readerQueryKeys.chapter(activePayload.story.id, chapterNumber));
    const cached = queryPayload ? null : await getCachedChapter(activePayload.story.id, chapterNumber);
    const nextPayload = queryPayload ?? cached?.payload;
    if (!nextPayload) return;
    setCachedPayload(nextPayload);
    setMobileSheetOpen(false);
    setMobileMenuOpen(false);
    queryClient.setQueryData(readerQueryKeys.chapter(nextPayload.story.id, nextPayload.chapter.chapterNumber), nextPayload);
    window.history.replaceState(null, "", storyHref(nextPayload.story, chapterNumber));
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function showSwipeNotice(message: string) {
    setSwipeNotice(message);
    if (swipeNoticeTimerRef.current) {
      window.clearTimeout(swipeNoticeTimerRef.current);
    }
    swipeNoticeTimerRef.current = window.setTimeout(() => {
      setSwipeNotice(null);
      swipeNoticeTimerRef.current = null;
    }, 1100);
  }

  async function navigateBySwipe(direction: "previous" | "next") {
    const targetChapter = direction === "previous" ? activePayload.previousChapter : activePayload.nextChapter;
    if (!targetChapter) {
      showSwipeNotice(direction === "previous" ? "Không có chương trước" : "Không có chương sau");
      return;
    }

    setChapterTransitionDirection(direction === "next" ? "next" : "prev");
    setChapterTransitionTrigger((t) => t + 1);
    markChapterListNavigation(targetChapter.chapterNumber);
    showSwipeNotice(direction === "previous" ? "Chương trước" : "Chương sau");

    if (!navigator.onLine && cachedChapterNumbers.has(targetChapter.chapterNumber)) {
      await openCachedChapter(targetChapter.chapterNumber);
      return;
    }

    router.push(storyHref(activePayload.story, targetChapter.chapterNumber));
  }

  function canStartReaderSwipe(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return !target.closest("a, button, input, textarea, select, audio, .chapter-comments, .reader-mobile-dock, .reader-mobile-sheet, .background-audio");
  }

  function handleReaderPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch" || mobileMenuOpen || mobileSheetOpen) return;
    if (!canStartReaderSwipe(event.target)) return;
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };
  }

  function handleReaderPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX < 78 || absX < absY * 1.45 || absY > 86) return;

    event.preventDefault();
    navigateBySwipe(deltaX > 0 ? "previous" : "next");
  }

  function openMobileChapterList() {
    setMobileSheetOpen(false);
    window.requestAnimationFrame(() => {
      setMobileMenuOpen(true);
      window.requestAnimationFrame(() => centerActiveChapter("smooth"));
    });
  }

  function maybeOpenCachedChapter(event: ReactMouseEvent<HTMLAnchorElement>, chapterNumber?: number | null) {
    if (!chapterNumber || navigator.onLine || !cachedChapterNumbers.has(chapterNumber)) return;
    event.preventDefault();
    openCachedChapter(chapterNumber);
  }

  function markChapterListNavigation(chapterNumber: number) {
    window.sessionStorage.setItem(`reader:force-top:${activePayload.story.id}:${chapterNumber}`, "true");
  }

  function renderChapterSidebarLink(chapter: ChapterSummary, virtualStyle?: CSSProperties) {
    const isActive = chapter.chapterNumber === activePayload.chapter.chapterNumber;
    const isRead = chapter.chapterNumber <= maxReadChapter;
    const isNew = maxReadChapter > 0 && chapter.chapterNumber > maxReadChapter;
    const addedToday = isTodayLocal(chapter.updatedAt);

    return (
      <Link
        className={`sidebar-link ${virtualStyle ? "sidebar-link-virtual" : ""} ${isActive ? "sidebar-link-active" : ""} ${isRead ? "sidebar-link-read" : "sidebar-link-unread"}`}
        data-active-chapter={isActive ? "true" : undefined}
        href={storyHref(activePayload.story, chapter.chapterNumber)}
        key={chapter.id}
        style={virtualStyle}
        onMouseEnter={() => {
          if (isActive || !navigator.onLine) return;
          queryClient.prefetchQuery({
            queryKey: readerQueryKeys.chapter(activePayload.story.id, chapter.chapterNumber),
            queryFn: () => fetchReaderChapter(activePayload.story.id, chapter.chapterNumber),
            staleTime: 1000 * 60 * 8
          });
        }}
        onClick={(event) => {
          markChapterListNavigation(chapter.chapterNumber);
          setMobileMenuOpen(false);
          maybeOpenCachedChapter(event, chapter.chapterNumber);
        }}
      >
        <span className="sidebar-link-title">
          {chapter.chapterNumber}. {chapter.title}
        </span>
        <span className="chapter-status-row">
          {isRead ? <span className="chapter-status chapter-status-read">Đã đọc</span> : maxReadChapter > 0 ? <span className="chapter-status">Chưa đọc</span> : null}
          {isNew ? <span className="chapter-status chapter-status-new">New</span> : null}
          {addedToday ? <span className="chapter-status chapter-status-today">Hôm nay</span> : null}
          {chapter.textSource === "polished" ? <span className="chapter-status chapter-status-polished">Polish</span> : null}
          {chapter.hasAudio ? <span className="chapter-status chapter-status-audio">Audio</span> : null}
          {cachedChapterNumbers.has(chapter.chapterNumber) ? <span className="chapter-status chapter-status-offline">Đã tải</span> : null}
        </span>
      </Link>
    );
  }

  function prepareBookmarkNavigation(bookmark: ReaderBookmarkItem) {
    window.sessionStorage.setItem(
      `reader:bookmark-scroll:${bookmark.storyId}:${bookmark.chapterNumber}`,
      String(Math.max(0, bookmark.scrollPosition))
    );
    setMobileSheetOpen(false);
  }

  function jumpToBookmark(event: ReactMouseEvent<HTMLAnchorElement>, bookmark: ReaderBookmarkItem) {
    prepareBookmarkNavigation(bookmark);
    if (bookmark.chapterNumber !== activePayload.chapter.chapterNumber) return;

    event.preventDefault();
    window.scrollTo({
      top: Math.max(0, bookmark.scrollPosition),
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
  }

  function scrollToComments() {
    document.querySelector(".chapter-comments")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start"
    });
    setMobileSheetOpen(false);
  }

  function startAutoScroll() {
    if (autoScrollStartTimerRef.current) {
      window.clearTimeout(autoScrollStartTimerRef.current);
      autoScrollStartTimerRef.current = null;
    }
    autoScrollRemainderRef.current = 0;
    autoScrollLastTimeRef.current = null;
    autoScrollTouchGuardUntilRef.current = performance.now() + AUTO_SCROLL_START_DELAY_MS + AUTO_SCROLL_TOUCH_GUARD_MS;
    setMobileSheetOpen(false);
    autoScrollStartTimerRef.current = window.setTimeout(() => {
      autoScrollStartTimerRef.current = null;
      setAutoScrollEnabled(true);
    }, AUTO_SCROLL_START_DELAY_MS);
  }

  function stopAutoScroll() {
    if (autoScrollStartTimerRef.current) {
      window.clearTimeout(autoScrollStartTimerRef.current);
      autoScrollStartTimerRef.current = null;
    }
    if (autoScrollStepTimerRef.current) {
      window.clearTimeout(autoScrollStepTimerRef.current);
      autoScrollStepTimerRef.current = null;
    }
    if (autoScrollFrameRef.current) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    setAutoScrollEnabled(false);
    autoScrollRemainderRef.current = 0;
    autoScrollLastTimeRef.current = null;
  }

  function toggleAutoScroll() {
    if (autoScrollEnabled) {
      stopAutoScroll();
      return;
    }
    startAutoScroll();
  }

  function buildCurrentBookmark(): ReaderBookmarkItem {
    const now = new Date().toISOString();
    return {
      id: `local-${activePayload.story.id}-${activePayload.chapter.chapterNumber}`,
      storyId: activePayload.story.id,
      storyTitle: activePayload.story.title,
      coverImageUrl: activePayload.story.coverImageUrl,
      chapterId: activePayload.chapter.id,
      chapterNumber: activePayload.chapter.chapterNumber,
      chapterTitle: activePayload.chapter.title,
      scrollPosition: Math.max(0, Math.round(window.scrollY)),
      progressPercent: Math.round(progressRef.current * 100) / 100,
      note: null,
      createdAt: currentBookmark?.createdAt ?? now,
      updatedAt: now
    };
  }

  function toggleBookmark() {
    if (currentBookmark) {
      dispatch(removeBookmarkItem({ storyId: activePayload.story.id, chapterNumber: activePayload.chapter.chapterNumber }));
      fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: activePayload.story.id,
          chapterNumber: activePayload.chapter.chapterNumber
        })
      }).catch(() => undefined);
      return;
    }

    const item = buildCurrentBookmark();
    dispatch(upsertBookmarkItem(item));
    fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { item?: ReaderBookmarkItem } | null) => {
        if (data?.item) dispatch(upsertBookmarkItem(data.item));
      })
      .catch(() => undefined);
  }

  const chapterNumber = activePayload.chapter.chapterNumber;
  const title = activePayload.chapter.title ?? "";

  const cleanTitle = title
    .replace(
      new RegExp(`^\\s*(chương\\s*)?${chapterNumber}\\s*[-–—:.]?\\s*`, "i"),
      ""
    )
    .trim();

  const pageTitle = `Chương ${chapterNumber} - ${cleanTitle}`;
  const minutesLeft = Math.max(0, Math.ceil(totalReadingMinutes * (1 - mobileProgress / 100)));
  const floatingReaderActions = floatingActionsMounted
    ? createPortal(
        <div
          className="reader-floating-actions-portal"
          data-theme={theme}
          data-font={fontFamily}
          style={readerShellStyle}
        >
          <button
            className={`scroll-top-button ${showScrollTop ? "scroll-top-button-visible" : ""}`}
            ref={scrollTopButtonRef}
            type="button"
            title="Scroll to top"
            aria-label="Scroll to top"
            aria-hidden={!showScrollTop}
            tabIndex={showScrollTop ? 0 : -1}
            onClick={scrollToTop}
          >
            <ArrowUp size={18} />
          </button>

          {activePayload.nextChapter ? (
            <button
              ref={continueButtonRef}
              className={`reader-continue-fab reader-continue-fab-active ${showContinuePrompt ? "reader-continue-fab-visible" : ""} ${highlightContinuePrompt ? "reader-continue-fab-near-end" : ""}`}
              type="button"
              aria-hidden={!showContinuePrompt}
              tabIndex={showContinuePrompt ? 0 : -1}
              onClick={openNextChapterFast}
            >
              <span>Đọc tiếp</span>
              <ChevronRight size={17} />
            </button>
          ) : null}
        </div>,
        document.body
      )
    : null;


  return (
    <main
      className={`reader-shell ${readerChromeHidden ? "reader-shell-chrome-hidden" : ""} ${focusModeEnabled ? "reader-shell-focus-mode" : ""}`}
      data-theme={theme}
      data-font={fontFamily}
      style={readerShellStyle}
    >
      {focusModeEnabled ? null : <MotionFX variant="reader" />}
      {focusModeEnabled ? null : <SkillEffectLayer storyId={activePayload.story.id} chapterId={activePayload.chapter.id} />}
      {focusModeEnabled ? null : <BackgroundAudioPlayer />}
      <div className="reader-progress" aria-hidden="true">
        {decorativeWebglEnabled && !focusModeEnabled ? <ThreeReaderProgress progress={mobileProgress} /> : null}
        <div className="reader-progress-bar" ref={progressBarRef} />
      </div>
      <div className={`reader-dim-overlay ${readerDimEnabled ? "reader-dim-overlay-active" : ""}`} aria-hidden="true" />
      <div className="reader-focus-veil" aria-hidden="true" />
      {swipeNotice ? (
        <div className="reader-swipe-notice" role="status" aria-live="polite">
          {swipeNotice}
        </div>
      ) : null}

      <ChapterTransition trigger={chapterTransitionTrigger} direction={chapterTransitionDirection} />

      {showCompletionOverlay ? (
        <StoryCompletionOverlay
          story={activePayload.story}
          chaptersRead={maxReadChapter}
          onDismiss={() => setShowCompletionOverlay(false)}
        />
      ) : null}

      {focusModeEnabled ? (
        <button className="reader-focus-toggle" type="button" aria-label="Tắt focus mode" onClick={() => setFocusModeEnabled(false)}>
          <Eye size={17} />
          <span>Thoát focus</span>
          <strong ref={focusProgressLabelRef}>{mobileProgress}%</strong>
        </button>
      ) : null}

      {adminEdit ? (
        <div className="admin-edit-floating" role="status">
          {adminEditSaving ? <span>Đang lưu...</span> : null}
          {adminEditError ? <strong>{adminEditError}</strong> : null}
          <button type="button" onClick={saveAdminEdit} disabled={adminEditSaving}>
            Save
          </button>
          <button type="button" onClick={cancelAdminEdit} disabled={adminEditSaving}>
            Cancel
          </button>
        </div>
      ) : null}

      {selectionAction ? (
        <div
          className="reader-selection-actions"
          style={{ left: selectionAction.x, top: selectionAction.y }}
          onMouseDown={(event) => event.preventDefault()}
          role="toolbar"
          aria-label="Text selection actions"
        >
          <button type="button" onClick={copySelectedContent}>
            Copy
          </button>
          {currentUser?.isAdmin ? (
            <button type="button" onClick={editSelectedContent}>
              Edit
            </button>
          ) : null}
        </div>
      ) : null}

      {floatingReaderActions}

      <nav className="reader-mobile-dock" aria-label="Mobile reader quick actions">
        {autoScrollEnabled ? (
          /* ── Auto-scroll speed controls ─────────────────────────── */
          <>
            <button
              className="reader-mobile-dock-button"
              type="button"
              aria-label="Giảm tốc độ cuộn"
              disabled={autoScrollSpeed <= 80}
              onClick={() => setAutoScrollSpeed((s) => Math.max(80, s - 40))}
            >
              <Minus size={17} />
            </button>
            <button
              className="reader-mobile-dock-primary reader-mobile-dock-primary-active"
              type="button"
              aria-label="Dừng tự cuộn"
              onClick={stopAutoScroll}
            >
              <span>Auto</span>
              <Pause size={17} />
            </button>
            <button
              className="reader-mobile-dock-button"
              type="button"
              aria-label="Tăng tốc độ cuộn"
              disabled={autoScrollSpeed >= 400}
              onClick={() => setAutoScrollSpeed((s) => Math.min(400, s + 40))}
            >
              <Plus size={17} />
            </button>
          </>
        ) : (
          /* ── Normal navigation ───────────────────────────────────── */
          <>
            <Link
              className="reader-mobile-dock-button"
              aria-disabled={!activePayload.previousChapter}
              href={activePayload.previousChapter ? storyHref(activePayload.story, activePayload.previousChapter.chapterNumber) : "#"}
              onClick={(event) => {
                if (!activePayload.previousChapter) { event.preventDefault(); return; }
                setChapterTransitionDirection("prev");
                setChapterTransitionTrigger((t) => t + 1);
                markChapterListNavigation(activePayload.previousChapter.chapterNumber);
                maybeOpenCachedChapter(event, activePayload.previousChapter.chapterNumber);
              }}
            >
              <ChevronLeft size={18} />
            </Link>
            <button
              className="reader-mobile-dock-primary"
              type="button"
              aria-label="Mở công cụ đọc"
              onClick={() => setMobileSheetOpen(true)}
            >
              <span className="reader-dock-meta">
                <span ref={mobileProgressLabelRef}>{mobileProgress}%</span>
                <span ref={mobileMinutesLabelRef} className="reader-dock-time" hidden={minutesLeft <= 0}>
                  {minutesLeft > 0 ? `~${minutesLeft} phút` : ""}
                </span>
              </span>
              <Settings2 size={17} />
            </button>
            <Link
              className="reader-mobile-dock-button"
              aria-disabled={!activePayload.nextChapter}
              href={activePayload.nextChapter ? storyHref(activePayload.story, activePayload.nextChapter.chapterNumber) : "#"}
              onClick={(event) => {
                if (!activePayload.nextChapter) { event.preventDefault(); return; }
                setChapterTransitionDirection("next");
                setChapterTransitionTrigger((t) => t + 1);
                markChapterListNavigation(activePayload.nextChapter.chapterNumber);
                maybeOpenCachedChapter(event, activePayload.nextChapter.chapterNumber);
              }}
            >
              <ChevronRight size={18} />
            </Link>
          </>
        )}
      </nav>

      <header className="reader-topbar">
        <Link href="/" className="brand" aria-label={`Về thư viện — ${activePayload.story.title}: ${pageTitle}`}>
          <ReaderLogo />
          <span className="reader-title-stack" aria-hidden="true">
            <span className="reader-story-title" onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startAdminEdit("storyTitle", activePayload.story.title);
            }}>{activePayload.story.title}</span>
            <span className="reader-chapter-kicker">{pageTitle}</span>
          </span>
        </Link>

        <div className="reader-controls" aria-label="Reader controls">
          <div className="reader-control-group reader-session-group">
            <UserIdentity compact className="reader-identity" />
            <NotificationBell className="reader-notification" />
            {isMobile || <CultivationPanel compact className="reader-cultivation" />}
          </div>
          <div className="reader-control-group reader-action-group" ref={readerOverflowRef}>
            <FollowButton story={activePayload.story} compact />
            {!isMobile ? (
              <FloatingTooltip label="Thêm tùy chọn">
                <button
                  className={`icon-button ${readerOverflowOpen || currentBookmark || focusModeEnabled || audioPanelOpen || offlineReady ? "icon-button-active" : ""}`}
                  type="button"
                  title="Thêm tùy chọn"
                  aria-expanded={readerOverflowOpen}
                  aria-controls="reader-overflow-panel"
                  onClick={() => setReaderOverflowOpen((v) => !v)}
                >
                  <MoreHorizontal size={17} />
                </button>
              </FloatingTooltip>
            ) : null}
            {!isMobile && readerOverflowOpen ? (
              <div className="reader-overflow-panel" id="reader-overflow-panel">
                <button
                  className={`reader-overflow-item ${currentBookmark ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleBookmark(); setReaderOverflowOpen(false); }}
                >
                  <img src="/icons/bookmark-jade.svg" className="bookmark-jade-icon" alt="" aria-hidden="true" style={{ width: 16, height: 16 }} />
                  {currentBookmark ? "Bỏ dấu ấn chương này" : "Đánh dấu chương này"}
                </button>
                <button
                  className={`reader-overflow-item ${focusModeEnabled ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { setFocusModeEnabled((v) => !v); setReaderOverflowOpen(false); }}
                >
                  {focusModeEnabled ? <Eye size={15} /> : <EyeOff size={15} />}
                  {focusModeEnabled ? "Tắt focus mode" : "Focus mode"}
                </button>
                <div className="reader-overflow-sep" />
                <button
                  className={`reader-overflow-item ${audioPanelOpen ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { scrollToAudioPanel(); setReaderOverflowOpen(false); }}
                >
                  <Headphones size={15} />
                  {activePayload.chapter.audioUrl ? "Nghe audio chương" : "Tạo audio chương"}
                </button>
                <button
                  className={`reader-overflow-item reader-offline-button ${offlineReady ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  disabled={offlineLoading}
                  onClick={() => { refreshOfflineCache(true); setReaderOverflowOpen(false); }}
                >
                  {offlineLoading ? <LoaderCircle size={15} className="spin" /> : <WifiOff size={15} />}
                  {offlineReady ? `Đã tải ${cachedChapters.length} chương offline` : "Tải offline"}
                </button>
              </div>
            ) : null}
            {!isMobile ? (
              <FloatingTooltip label={desktopSidebarOpen ? "Đóng mục lục" : "Mở mục lục"}>
                <button
                  className="icon-button desktop-sidebar-trigger"
                  type="button"
                  ref={desktopSidebarButtonRef}
                  title={desktopSidebarOpen ? "Đóng mục lục" : "Mở mục lục"}
                  aria-expanded={desktopSidebarOpen}
                  aria-controls="chapter-sidebar"
                  onClick={() => setDesktopSidebarOpen((value) => !value)}
                >
                  {desktopSidebarOpen ? <X size={17} /> : <Menu size={17} />}
                </button>
              </FloatingTooltip>
            ) : null}
          </div>
          {isMobile &&
          <button
            className="icon-button reader-sheet-trigger"
            type="button"
            title="Reader menu"
            aria-expanded={mobileSheetOpen}
            aria-controls="reader-mobile-sheet"
            onClick={() => setMobileSheetOpen(true)}
          >
            <Settings2 size={17} />
          </button>}
          <div className="segmented" aria-label="Theme">
            <button type="button" title="Light" aria-pressed={theme === "light"} onClick={() => dispatch(setReaderTheme("light"))}>
              <Sun size={15} />
            </button>
            <button type="button" title="Sepia" aria-pressed={theme === "sepia"} onClick={() => dispatch(setReaderTheme("sepia"))}>
              <BookOpen size={15} />
            </button>
            <button type="button" title="Dark" aria-pressed={theme === "dark"} onClick={() => dispatch(setReaderTheme("dark"))}>
              <Moon size={15} />
            </button>
          </div>
          {!isMobile ? (
            <button
              className="icon-button format-trigger"
              type="button"
              title="Cài đặt chữ và bố cục"
              aria-expanded={mobileFormatOpen}
              aria-controls="format-controls"
              ref={(node) => {
                formatTriggerRef.current = node;
                formatFloatingRefs.setReference(node);
              }}
              {...getFormatReferenceProps({
                onClick: () => setMobileFormatOpen((value) => !value)
              })}
            >
              <Type size={16} />
            </button>
          ) : null}
          <div
            className={`format-controls ${mobileFormatOpen ? "format-controls-open" : ""}`}
            id="format-controls"
            ref={(node) => {
              formatPanelRef.current = node;
              formatFloatingRefs.setFloating(node);
            }}
            style={formatFloatingStyles}
            {...getFormatFloatingProps()}
          >
            <button
              className="icon-button"
              type="button"
              title="Smaller text"
              aria-disabled={fontSize <= READER_FONT_SIZE_MIN}
              onClick={() => dispatch(setReaderFontSize(fontSize - 1))}
            >
              <Minus size={16} />
            </button>
            <span className="font-size-value" aria-label={`Font size ${fontSize}px`}>
              {fontSize}
            </span>
            <button
              className="icon-button"
              type="button"
              title="Larger text"
              aria-disabled={fontSize >= READER_FONT_SIZE_MAX}
              onClick={() => dispatch(setReaderFontSize(fontSize + 1))}
            >
              <Plus size={16} />
            </button>
            <select className="reader-select" value={fontFamily} title="Font family" onChange={(event) => dispatch(setReaderFontFamily(event.target.value as ReaderFontFamily))}>
              <option value="literata">Literata</option>
              <option value="noto-serif">Noto Serif</option>
              <option value="sora">Sora (Việt)</option>
              <option value="merriweather">Merriweather</option>
              <option value="serif">Georgia</option>
              <option value="sans">Sans</option>
            </select>
            <label className="reader-range-control">
              <span>Dòng {lineHeight.toFixed(2)}</span>
              <input
                type="range"
                min={READER_LINE_HEIGHT_MIN}
                max={READER_LINE_HEIGHT_MAX}
                step="0.05"
                value={lineHeight}
                onChange={(event) => dispatch(setReaderLineHeight(Number(event.target.value)))}
              />
            </label>
            <label className="reader-range-control">
              <span>Đoạn {paragraphSpacing.toFixed(2)}em</span>
              <input
                type="range"
                min={READER_PARAGRAPH_SPACING_MIN}
                max={READER_PARAGRAPH_SPACING_MAX}
                step="0.05"
                value={paragraphSpacing}
                onChange={(event) => dispatch(setReaderParagraphSpacing(Number(event.target.value)))}
              />
            </label>
            <label className="reader-range-control">
              <span>Khổ {contentWidth}px</span>
              <input
                type="range"
                min={READER_CONTENT_WIDTH_MIN}
                max={READER_CONTENT_WIDTH_MAX}
                step="20"
                value={contentWidth}
                onChange={(event) => dispatch(setReaderContentWidth(Number(event.target.value)))}
              />
            </label>
          </div>
        </div>
      </header>

      <Drawer.Root open={mobileSheetOpen} onOpenChange={setMobileSheetOpen} shouldScaleBackground={false}>
        <Drawer.Portal>
          <Drawer.Overlay className="reader-mobile-sheet-backdrop" />
          <Drawer.Content className="reader-mobile-sheet-panel" id="reader-mobile-sheet" ref={mobileSheetPanelRef} aria-label="Reader tools">
            <div className="reader-mobile-sheet-sticky-top">
              <span className="reader-mobile-sheet-grip" aria-hidden="true" />
              <div className="reader-mobile-sheet-header">
                <div>
                  <p className="eyebrow">Công cụ đọc</p>
                  <Drawer.Title asChild>
                    <h2>Chương {activePayload.chapter.chapterNumber}</h2>
                  </Drawer.Title>
                </div>
                <button className="icon-button" type="button" aria-label="Đóng" onClick={() => setMobileSheetOpen(false)}>
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="reader-mobile-sheet-scroll">
            <div className="reader-sheet-current">
              <div>
                <span>Tiến độ</span>
                <strong>{sheetProgress}%</strong>
              </div>
              <div>
                <span>Offline</span>
                <strong>{cachedChapters.length > 0 ? `${cachedChapters.length} chương` : "Chưa tải"}</strong>
              </div>
              <div>
                <span>Audio</span>
                <strong>{activePayload.chapter.audioUrl ? "Có sẵn" : "Chưa có"}</strong>
              </div>
            </div>

            <div className="reader-sheet-grid reader-sheet-grid-primary">
              <button className="reader-sheet-action" type="button" onClick={openMobileChapterList}>
                <Menu size={16} />
                Mục lục
              </button>
              <button className="reader-sheet-action" type="button" onClick={toggleBookmark}>
                <img src="/icons/bookmark-jade.svg" className="bookmark-jade-icon" alt="" aria-hidden="true" />
                {currentBookmark ? "Bỏ dấu" : "Đánh dấu"}
              </button>
              <button
                className={`reader-sheet-action ${autoScrollEnabled ? "reader-sheet-action-active" : ""}`}
                type="button"
                aria-pressed={autoScrollEnabled}
                onClick={toggleAutoScroll}
              >
                {autoScrollEnabled ? <Pause size={16} /> : <Play size={16} />}
                {autoScrollEnabled ? "Dừng cuộn" : "Tự cuộn"}
              </button>
              <button className="reader-sheet-action" type="button" onClick={scrollToComments}>
                <BookOpen size={16} />
                Luận đạo
              </button>
            </div>

            <details className="reader-sheet-section reader-sheet-collapsible" onToggle={keepSheetSectionVisible}>
              <summary>
                <span>Cài đọc</span>
                <Settings2 size={15} />
              </summary>
              <div className="reader-sheet-section-body">
                <div className="segmented reader-sheet-segmented" aria-label="Theme">
                  <button type="button" aria-pressed={theme === "light"} onClick={() => dispatch(setReaderTheme("light"))}>
                    <Sun size={15} />
                  </button>
                  <button type="button" aria-pressed={theme === "sepia"} onClick={() => dispatch(setReaderTheme("sepia"))}>
                    <BookOpen size={15} />
                  </button>
                  <button type="button" aria-pressed={theme === "dark"} onClick={() => dispatch(setReaderTheme("dark"))}>
                    <Moon size={15} />
                  </button>
                </div>
                <div className="reader-sheet-font-row">
                  <button className="icon-button" type="button" aria-disabled={fontSize <= READER_FONT_SIZE_MIN} onClick={() => dispatch(setReaderFontSize(fontSize - 1))}>
                    <Minus size={16} />
                  </button>
                  <strong>{fontSize}px</strong>
                  <button className="icon-button" type="button" aria-disabled={fontSize >= READER_FONT_SIZE_MAX} onClick={() => dispatch(setReaderFontSize(fontSize + 1))}>
                    <Plus size={16} />
                  </button>
                </div>
                <select className="reader-select" value={fontFamily} title="Font family" onChange={(event) => dispatch(setReaderFontFamily(event.target.value as ReaderFontFamily))}>
                  <option value="literata">Literata</option>
                  <option value="noto-serif">Noto Serif</option>
                  <option value="sora">Sora (Việt)</option>
              <option value="merriweather">Merriweather</option>
                  <option value="serif">Georgia</option>
                  <option value="sans">Sans</option>
                </select>
                <label className="reader-range-control reader-sheet-range">
                  <span>Dòng {lineHeight.toFixed(2)}</span>
                  <input
                    type="range"
                    min={READER_LINE_HEIGHT_MIN}
                    max={READER_LINE_HEIGHT_MAX}
                    step="0.05"
                    value={lineHeight}
                    onChange={(event) => dispatch(setReaderLineHeight(Number(event.target.value)))}
                  />
                </label>
                <label className="reader-range-control reader-sheet-range">
                  <span>Đoạn {paragraphSpacing.toFixed(2)}em</span>
                  <input
                    type="range"
                    min={READER_PARAGRAPH_SPACING_MIN}
                    max={READER_PARAGRAPH_SPACING_MAX}
                    step="0.05"
                    value={paragraphSpacing}
                    onChange={(event) => dispatch(setReaderParagraphSpacing(Number(event.target.value)))}
                  />
                </label>
                <label className="reader-range-control reader-sheet-range">
                  <span>Lọc sáng {Math.round(readerDimLevel * 100)}%</span>
                  <input
                    type="range"
                    min="0.06"
                    max="0.48"
                    step="0.02"
                    value={readerDimLevel}
                    onChange={(event) => {
                      setReaderDimLevel(clampDimLevel(event.target.value));
                      setReaderDimEnabled(true);
                    }}
                  />
                </label>
                <label className="reader-range-control reader-sheet-range">
                  <span>Khổ {contentWidth}px</span>
                  <input
                    type="range"
                    min={READER_CONTENT_WIDTH_MIN}
                    max={READER_CONTENT_WIDTH_MAX}
                    step="20"
                    value={contentWidth}
                    onChange={(event) => dispatch(setReaderContentWidth(Number(event.target.value)))}
                  />
                </label>
              </div>
            </details>

            <details className="reader-sheet-section reader-sheet-collapsible" onToggle={keepSheetSectionVisible}>
              <summary>
                <span>Preset đọc</span>
                <ClipboardCheck size={15} />
              </summary>
              <div className="reader-sheet-grid reader-sheet-section-body">
                {(Object.entries(READER_COMFORT_PRESETS) as Array<[keyof typeof READER_COMFORT_PRESETS, (typeof READER_COMFORT_PRESETS)[keyof typeof READER_COMFORT_PRESETS]]>).map(([key, preset]) => {
                  const PresetIcon = PRESET_ICON_COMPONENT[key];
                  return (
                    <button className="reader-sheet-action" type="button" key={key} onClick={() => applyComfortPreset(key)}>
                      <PresetIcon size={16} />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </details>

            <details className="reader-sheet-section reader-sheet-collapsible" onToggle={keepSheetSectionVisible}>
              <summary>
                <span>Tiện ích</span>
                <Headphones size={15} />
              </summary>
              <div className="reader-sheet-grid reader-sheet-section-body">
                <AmbientSoundPlayer />
                <button className="reader-sheet-action" type="button" disabled={!activePayload.chapter.audioUrl}>
                  <Headphones size={16} />
                  {activePayload.chapter.audioUrl ? "Audio chương" : "Chưa audio"}
                </button>
                <button
                  className={`reader-sheet-action reader-sheet-status ${offlineReady ? "reader-sheet-status-ready" : ""}`}
                  type="button"
                  disabled={offlineLoading}
                  onClick={() => refreshOfflineCache(true)}
                >
                  {offlineLoading ? <LoaderCircle size={16} className="spin" /> : <WifiOff size={16} />}
                  {offlineReady ? "Đã tải" : offlineLoading ? "Đang tải" : "Offline"}
                </button>
                <button
                  className={`reader-sheet-action ${wakeLockActive ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  title={wakeLockSupported ? "Giữ màn hình sáng khi đọc" : "Trình duyệt có thể chưa hỗ trợ"}
                  aria-pressed={wakeLockActive}
                  onClick={() => {
                    if (wakeLockActive || wakeLockRequestedRef.current) {
                      releaseWakeLock();
                    } else {
                      requestWakeLock();
                    }
                  }}
                >
                  {wakeLockActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  {wakeLockActive ? "Đang sáng" : "Giữ sáng"}
                </button>
                <button
                  className={`reader-sheet-action ${readerDimEnabled ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  aria-pressed={readerDimEnabled}
                  onClick={() => setReaderDimEnabled((value) => !value)}
                >
                  {readerDimEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  {readerDimEnabled ? "Dịu mắt" : "Lọc sáng"}
                </button>
                <button
                  className={`reader-sheet-action ${focusModeEnabled ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  aria-pressed={focusModeEnabled}
                  onClick={() => {
                    setFocusModeEnabled((value) => !value);
                    setMobileSheetOpen(false);
                  }}
                >
                  {focusModeEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  {focusModeEnabled ? "Đang focus" : "Focus"}
                </button>
                <button className={`reader-sheet-action ${audioPanelOpen ? "reader-sheet-action-active" : ""}`} type="button" onClick={scrollToAudioPanel}>
                  <Headphones size={16} />
                  {activePayload.chapter.audioUrl ? "Nghe audio" : "Tạo audio"}
                </button>
              </div>
            </details>
            {offlineError ? <p className="reader-sheet-error">{offlineError}</p> : null}
            {wakeLockError ? <p className="reader-sheet-error">{wakeLockError}</p> : null}

            <div className="reader-sheet-chapter-nav" aria-label="Điều hướng chương">
              <Link
                className="reader-sheet-nav-card"
                aria-disabled={!activePayload.previousChapter}
                href={activePayload.previousChapter ? storyHref(activePayload.story, activePayload.previousChapter.chapterNumber) : "#"}
                onClick={(event) => {
                  if (activePayload.previousChapter) markChapterListNavigation(activePayload.previousChapter.chapterNumber);
                  setMobileSheetOpen(false);
                  maybeOpenCachedChapter(event, activePayload.previousChapter?.chapterNumber);
                }}
              >
                <ChevronLeft size={16} />
                <span>
                  <small>Trước</small>
                  {activePayload.previousChapter ? activePayload.previousChapter.title : "Không có chương trước"}
                </span>
              </Link>
              <Link
                className="reader-sheet-nav-card"
                aria-disabled={!activePayload.nextChapter}
                href={activePayload.nextChapter ? storyHref(activePayload.story, activePayload.nextChapter.chapterNumber) : "#"}
                onClick={(event) => {
                  if (activePayload.nextChapter) markChapterListNavigation(activePayload.nextChapter.chapterNumber);
                  setMobileSheetOpen(false);
                  maybeOpenCachedChapter(event, activePayload.nextChapter?.chapterNumber);
                }}
              >
                <span>
                  <small>Sau</small>
                  {activePayload.nextChapter ? activePayload.nextChapter.title : "Không có chương sau"}
                </span>
                <ChevronRight size={16} />
              </Link>
            </div>

            {storyBookmarks.length > 0 ? (
              <div className="reader-sheet-section reader-sheet-bookmarks">
                <span>Dấu ấn truyện này</span>
                <div className="reader-sheet-bookmark-row">
                  {storyBookmarks.slice(0, 8).map((bookmark) => (
                    <Link
                      className={`reader-sheet-bookmark ${bookmark.chapterNumber === activePayload.chapter.chapterNumber ? "reader-sheet-bookmark-active" : ""}`}
                      href={storyHref(activePayload.story, bookmark.chapterNumber)}
                      key={`${bookmark.storyId}-${bookmark.chapterNumber}`}
                      onClick={(event) => jumpToBookmark(event, bookmark)}
                    >
                      <BookMarked size={14} />
                      <span>
                        <strong>Ch.{bookmark.chapterNumber}</strong>
                        <small>{Math.round(bookmark.progressPercent)}%</small>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {currentChapterParagraphBookmarks.length > 0 ? (
              <div className="reader-sheet-section reader-sheet-bookmarks">
                <span>Dấu đoạn chương này</span>
                <div className="reader-sheet-paragraph-bookmarks">
                  {currentChapterParagraphBookmarks.slice(0, 8).map((bookmark) => (
                    <button
                      className="reader-sheet-paragraph-bookmark"
                      type="button"
                      key={bookmark.id}
                      onClick={() => {
                        setMobileSheetOpen(false);
                        window.requestAnimationFrame(() => scrollToParagraph(bookmark.paragraphIndex));
                      }}
                    >
                      <BookMarked size={14} />
                      <span>{bookmark.excerpt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <details className="reader-sheet-section reader-sheet-collapsible" onToggle={keepSheetSectionVisible}>
              <summary>
                <span>Bố cục nâng cao</span>
                <Plus size={15} />
              </summary>
              <div className="reader-sheet-section-body">
                <label className="reader-range-control reader-sheet-range">
                  <span>Tự cuộn {autoScrollSpeed}px/nhịp</span>
                  <input
                    type="range"
                    min={80}
                    max={360}
                    step={20}
                    value={autoScrollSpeed}
                    onChange={(event) => setAutoScrollSpeed(Number(event.target.value))}
                  />
                </label>
              </div>
            </details>

            <details className="reader-sheet-section reader-sheet-collapsible" onToggle={keepSheetSectionVisible}>
              <summary>
                <span>Đọc offline</span>
                <strong>{sortedCachedChapters.length > 0 ? `${sortedCachedChapters.length} chương` : "Chưa tải"}</strong>
                <WifiOff size={15} />
              </summary>
              <div className="reader-sheet-section-body reader-offline-cache-panel">
                {sortedCachedChapters.length > 0 ? (
                  <>
                    <p>
                      Các chương đã tải có thể mở ngay cả khi mất mạng. Chương hiện tại sẽ được đánh dấu nổi bật.
                    </p>
                    <div className="offline-chapter-grid">
                      {sortedCachedChapters.map((record) => (
                        <button
                          className={`offline-chapter-pill ${record.chapterNumber === activePayload.chapter.chapterNumber ? "offline-chapter-pill-active" : ""}`}
                          type="button"
                          key={record.key}
                          onClick={() => openCachedChapter(record.chapterNumber)}
                        >
                          Ch.{record.chapterNumber}
                        </button>
                      ))}
                    </div>
                  </>
                ) : <small>Chưa có chương đã tải.</small>}
              </div>
            </details>

            {currentUser?.isAdmin ? (
              <details className="reader-sheet-section reader-sheet-collapsible" open={qualityPanelOpen} onToggle={(event) => {
                setQualityPanelOpen(event.currentTarget.open);
                keepSheetSectionVisible(event);
              }}>
                <summary>
                  <span>Quality tools</span>
                  <ClipboardCheck size={15} />
                </summary>
                <div className="reader-quality-panel reader-sheet-section-body">
                  <dl>
                    <div>
                      <dt>Dòng raw</dt>
                      <dd>{qualityStats?.rawLines ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Đoạn đang đọc</dt>
                      <dd>{qualityStats?.paragraphs ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Preview format</dt>
                      <dd>{qualityStats?.formattedParagraphs ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Dòng ngắn</dt>
                      <dd>{qualityStats?.shortLineCount ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Quote rời</dt>
                      <dd>{qualityStats?.danglingQuoteCount ?? "—"}</dd>
                    </div>
                  </dl>
                  <div className="reader-quality-preview">
                    {formattedPreviewParagraphs?.slice(0, 3).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </details>
            ) : null}
            </div>{/* end reader-mobile-sheet-scroll */}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div className="reader-layout" data-sidebar={desktopSidebarOpen ? "open" : "closed"} style={readerLayoutStyle}>
        <button
          className={`drawer-backdrop ${mobileMenuOpen ? "drawer-backdrop-visible" : ""}`}
          type="button"
          aria-label="Close chapter navigation"
          onClick={() => setMobileMenuOpen(false)}
        />

        <aside
          className={`chapter-sidebar ${mobileMenuOpen ? "chapter-sidebar-open" : ""}`}
          id="chapter-sidebar"
          aria-label="Chapter navigation"
          ref={chapterSidebarRef}
        >
          <p className="chapter-sidebar-title">Mục lục</p>
          <label className="chapter-sidebar-search">
            <Search size={14} />
            <input
              type="search"
              inputMode="search"
              placeholder="Tìm chương"
              value={chapterSearch}
              onChange={(event) => setChapterSearch(event.target.value)}
            />
            {chapterSearch ? (
              <button type="button" aria-label="Xóa tìm kiếm chương" onClick={() => setChapterSearch("")}>
                <X size={14} />
              </button>
            ) : null}
          </label>
          {sortedCachedChapters.length > 0 ? (
            <div className="chapter-sidebar-offline" aria-label="Chương đã tải offline">
              <span>Offline</span>
              <div className="offline-chapter-row chapter-sidebar-offline-row">
                {sortedCachedChapters.map((record) => (
                  <button
                    className={`offline-chapter-pill ${record.chapterNumber === activePayload.chapter.chapterNumber ? "offline-chapter-pill-active" : ""}`}
                    type="button"
                    key={record.key}
                    onClick={() => openCachedChapter(record.chapterNumber)}
                  >
                    Ch.{record.chapterNumber}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {chapters.length === 0 ? (
            <p className="sidebar-link">Chưa có chapter</p>
          ) : canVirtualizeChapterList ? (
            <>
              <div className="chapter-virtual-list" ref={chapterVirtualizerScrollRef}>
                <div
                  className="chapter-virtual-list-inner"
                  style={{
                    height: `${chapterVirtualizer.getTotalSize()}px`
                  }}
                >
                  {chapterVirtualizer.getVirtualItems().map((virtualItem) => {
                    const chapter = filteredChapters[virtualItem.index];
                    if (!chapter) return null;
                    return renderChapterSidebarLink(chapter, {
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`
                    });
                  })}
                </div>
              </div>
              {chapterSearchText && filteredChapters.length === 0 ? (
                <p className="chapter-search-empty">Không tìm thấy chương trong danh sách đã tải.</p>
              ) : null}
            </>
          ) : (
            <>
              {!chapterSearchText ? <div className="chapter-scroll-sentinel" ref={previousChapterSentinelRef} aria-hidden="true" /> : null}
              {!chapterSearchText && previousChapterCursor ? (
                <button className="sidebar-load" type="button" onClick={loadPreviousChapters} disabled={loadingChapters}>
                  {loadingChapters ? <LoaderCircle size={14} className="spin" /> : null}
                  Tải chương trước
                </button>
              ) : null}
              {filteredChapters.map((chapter) => renderChapterSidebarLink(chapter))}
              {chapterSearchText && filteredChapters.length === 0 ? (
                <p className="chapter-search-empty">Không tìm thấy chương trong danh sách đã tải.</p>
              ) : null}
              {!chapterSearchText ? <div className="chapter-scroll-sentinel" ref={nextChapterSentinelRef} aria-hidden="true" /> : null}
              {!chapterSearchText && chapterCursor ? (
                <button className="sidebar-load" type="button" onClick={loadNextChapters} disabled={loadingChapters}>
                  {loadingChapters ? <LoaderCircle size={14} className="spin" /> : null}
                  Tải chương sau
                </button>
              ) : null}
            </>
          )}
          <button
            className="chapter-sidebar-resize"
            type="button"
            aria-label="Kéo để chỉnh độ rộng danh sách chương"
            onPointerDown={startDesktopSidebarResize}
          />
        </aside>

        <article
          className="reader-main"
          onPointerDown={handleReaderPointerDown}
          onPointerCancel={() => {
            swipeStartRef.current = null;
          }}
          onPointerUp={handleReaderPointerUp}
        >
          {decorativeWebglEnabled && !focusModeEnabled ? (
            <ThreeReaderAtmosphere
              chapterNumber={activePayload.chapter.chapterNumber}
              progress={mobileProgress}
              autoScrollEnabled={autoScrollEnabled}
              theme={theme}
            />
          ) : null}
          <div className="reader-article">
            <header className="reader-heading">
              {adminEdit?.field === "chapterTitle" ? (
                <input
                  className="admin-inline-input admin-inline-title"
                  value={adminEdit.value}
                  autoFocus
                  onChange={(event) => setAdminEdit((current) => current?.field === "chapterTitle" ? { ...current, value: event.target.value } : current)}
                />
              ) : (
                <h1
                  className={currentUser?.isAdmin ? "admin-editable-hidden" : undefined}
                  title={currentUser?.isAdmin ? "Double click để sửa chapter title" : undefined}
                  onDoubleClick={() => startAdminEdit("chapterTitle", activePayload.chapter.title)}
                >
                  {activePayload.chapter.title}
                </h1>
              )}
              <p>
                {adminEdit?.field === "storyTitle" ? (
                  <input className="admin-inline-input" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit((current) => current?.field === "storyTitle" ? { ...current, value: event.target.value } : current)} />
                ) : (
                  <span className={currentUser?.isAdmin ? "admin-editable-hidden" : undefined} onDoubleClick={() => startAdminEdit("storyTitle", activePayload.story.title)}>
                    {activePayload.story.title}
                  </span>
                )}
                {" · "}
                {adminEdit?.field === "author" ? (
                  <input className="admin-inline-input" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit((current) => current?.field === "author" ? { ...current, value: event.target.value } : current)} />
                ) : (
                  <span className={currentUser?.isAdmin ? "admin-editable-hidden" : undefined} onDoubleClick={() => startAdminEdit("author", activePayload.story.author)}>
                    {activePayload.story.author || "Unknown author"}
                  </span>
                )}
                {" · "}
                {activePayload.story.totalChapters || chapters.length} chương
                {activePayload.chapter.textSource ? ` · ${activePayload.chapter.textSource}` : ""}
                {totalReadingMinutes > 0 ? ` · ~${totalReadingMinutes} phút đọc` : ""}
              </p>
            </header>

            {audioPanelOpen ? (
              <section className="audio-panel" aria-label="Chapter audio" ref={audioPanelRef}>
                <ChapterAudioPlayer
                  chapterId={activePayload.chapter.id}
                  audioUrl={activePayload.chapter.audioUrl}
                  hlsUrl={activePayload.chapter.audioHlsUrl}
                  title={activePayload.chapter.title}
                  autoStartToken={audioAutoStartToken}
                />
              </section>
            ) : null}

            <section
              className={`reader-content ${currentUser?.isAdmin ? "admin-editable-content-hidden" : ""}`}
              aria-label="Chapter content"
              ref={paragraphContainerRef}
              onMouseUp={() => window.setTimeout(() => maybeShowContentSelectionActions(), 0)}
            >
              {adminEdit?.field === "content" ? (
                <textarea ref={adminContentEditorRef} className="admin-content-editor" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit((current) => current?.field === "content" ? { ...current, value: event.target.value } : current)} />
              ) : paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => {
                  const bookmarked = bookmarkedParagraphIndexes.has(index);
                  return (
                    <p
                      className={bookmarked ? "reader-paragraph reader-paragraph-bookmarked" : "reader-paragraph"}
                      data-paragraph-index={index}
                      key={`${index}-${paragraph.slice(0, 12)}`}
                      onDoubleClick={(event) => {
                        const target = event.target instanceof Element ? event.target : null;
                        if (target?.closest("button")) return;
                        event.preventDefault();
                        suppressSelectionActionUntilRef.current = Date.now() + 450;
                        window.getSelection()?.removeAllRanges();
                        startContentAdminEdit({ paragraphIndex: index, caretOffset: contentCaretOffsetFromPoint(event, index) });
                      }}
                    >
                      <button
                        className="paragraph-bookmark-button"
                        type="button"
                        aria-label={bookmarked ? "Bỏ dấu đoạn" : "Đánh dấu đoạn"}
                        title={bookmarked ? "Bỏ dấu đoạn" : "Đánh dấu đoạn"}
                        onClick={() => toggleParagraphBookmark(index, paragraph)}
                      >
                        {bookmarked ? <BookMarked size={13} /> : <Highlighter size={13} />}
                      </button>
                      <span className="reader-paragraph-text">{paragraph}</span>
                    </p>
                  );
                })
              ) : (
                <div className="reader-empty">
                  <p>
                    Chương này chưa đọc được nội dung từ đường dẫn text trong database.
                  </p>
                  <p>{activePayload.chapter.textPath ? `Path hiện tại: ${activePayload.chapter.textPath}` : "Chapter chưa có raw/polished/translated text path."}</p>
                </div>
              )}
            </section>

            <ChapterComments chapterId={activePayload.chapter.id} />

            <nav className="chapter-nav" aria-label="Previous and next chapter">
              <Link
                className="nav-card"
                aria-disabled={!activePayload.previousChapter}
                href={activePayload.previousChapter ? storyHref(activePayload.story, activePayload.previousChapter.chapterNumber) : "#"}
                onClick={(event) => maybeOpenCachedChapter(event, activePayload.previousChapter?.chapterNumber)}
              >
                <ChevronLeft size={18} />
                <span>{activePayload.previousChapter ? activePayload.previousChapter.title : "Không có chương trước"}</span>
              </Link>
              <Link
                ref={navCardNextRef}
                className="nav-card"
                aria-disabled={!activePayload.nextChapter}
                href={activePayload.nextChapter ? storyHref(activePayload.story, activePayload.nextChapter.chapterNumber) : "#"}
                onClick={(event) => maybeOpenCachedChapter(event, activePayload.nextChapter?.chapterNumber)}
              >
                <span>
                  <small>{activePayload.nextChapter ? "Đọc tiếp" : "Sau"}</small>
                  {activePayload.nextChapter ? activePayload.nextChapter.title : "Không có chương sau"}
                </span>
                <ChevronRight size={18} />
              </Link>
            </nav>
          </div>
        </article>
      </div>
    </main>
  );
}
