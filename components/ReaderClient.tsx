"use client";

import { ArrowUp, BookMarked, BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, Eye, EyeOff, Headphones, Highlighter, HelpCircle, Languages, LoaderCircle, Menu, MessageCircle, Minus, Moon, Pause, Play, Plus, RotateCcw, Search, Settings2, StickyNote, Sun, Type, WifiOff, X } from "lucide-react";
import type { animate as AnimateType } from "animejs";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { useQueryClient } from "@tanstack/react-query";
import { autoUpdate, flip, FloatingPortal, offset, shift, useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import { saveReaderPreferencesOnServer, saveReadingSessionOnServer } from "@/lib/api-client";
import { getAnonymousReaderId } from "@/lib/anonymous-reader-id";
import type { ChapterSummary, ReaderPayload } from "@/lib/types";
import type { ReaderBookmarkItem } from "@/lib/bookmarks";
import { formatChapterCardTitle, formatChapterLabel } from "@/lib/chapter-title";
import { storyHref } from "@/lib/urls";
import { selectCurrentBookmark, selectMaxReadChapter, selectStoryBookmarks } from "@/lib/selectors";
import { UserIdentity } from "@/components/UserIdentity";
import { FollowButton } from "@/components/FollowButton";
import { NotificationBell } from "@/components/NotificationBell";
import { ReaderGlossaryInlineText } from "@/components/ReaderGlossaryInlineText";
import { ReaderGlossaryTapPopover } from "@/components/ReaderGlossaryTapPopover";
import { ReaderInlineChapterBlock } from "@/components/ReaderInlineChapterBlock";
import { RealtimeFxPreference } from "@/components/RealtimeFxPreference";
import { FloatingTooltip } from "@/components/FloatingTooltip";
import { formatNovelContent } from "@/lib/formatNovelContent";
import { isMobile, prefersReducedMotion, shouldReduceReaderBackgroundWork } from "@/lib/browser";
import { countReadableWords, estimateReadingMinutes } from "@/lib/reading-estimate";
import { isTodayLocal } from "@/lib/date";
import type { OfflineChapterRecord } from "@/lib/offline-chapters";
import { estimateOfflineCacheBytes, formatOfflineCacheSize, OFFLINE_DOWNLOAD_PRESETS } from "@/lib/offline-chapters-utils";
import { useReaderOfflineCache } from "@/components/reader/ReaderOfflineCacheProvider";
import { ReaderChapterFreshHint, type ReaderChapterFreshHintState } from "@/components/ReaderChapterFreshHint";
import { ReaderAmbienceLayer } from "@/components/ReaderAmbienceLayer";
import { ReaderSpiritCompanion } from "@/components/ReaderSpiritCompanion";
import { ReaderLogo } from "@/components/ReaderLogo";
import { ReaderThemeSegmented } from "@/components/ReaderThemeSegmented";
import { fetchReaderChapter, readerQueryKeys } from "@/lib/reader-query";
import {
  bilingualFetchOptions,
  learnEnglishPreset,
  readReaderBilingualPrefs,
  writeReaderBilingualPrefs,
  type ReaderBilingualPrefs
} from "@/lib/reader-bilingual-prefs";
import {
  clipPairedText,
  clipPhrase,
  createPhraseNoteId,
  phraseNotesForStory,
  readPhraseNotes,
  removePhraseNote,
  upsertPhraseNote,
  writePhraseNotes,
  type ReaderPhraseNote
} from "@/lib/reader-phrase-notes";
import { normalizeLookupQuery, extractLookupContextSentence } from "@/lib/reader-lookup";
import { supportsBilingualReader } from "@/lib/reader-source-language";
import { useReaderRealtimeListener } from "@/lib/reader-realtime-bus";
import type { ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { isRealtimeShimmerEnabled } from "@/lib/reader-realtime-fx";
import {
  setReaderContentWidth,
  setReaderFontFamily,
  setReaderFontSize,
  setReaderLayoutMode,
  setReaderLineHeight,
  setReaderParagraphSpacing,
  setReaderSkillEffectsEnabled,
  setReaderStyle,
  setReaderTapEdgeEnabled,
  store,
  removeBookmarkItem,
  upsertBookmarkItem,
  upsertHistoryItem,
  recordDailyRead
} from "@/lib/store";
import {
  isDefaultReaderStyleConfig,
  DEFAULT_READER_STYLE_CONFIG,
  sanitizeReaderStyleConfig,
  READER_CONTENT_WIDTH_MAX,
  READER_CONTENT_WIDTH_MIN,
  READER_FONT_SIZE_MAX,
  READER_FONT_SIZE_MIN,
  READER_LINE_HEIGHT_MAX,
  READER_LINE_HEIGHT_MIN,
  READER_PARAGRAPH_SPACING_MAX,
  READER_PARAGRAPH_SPACING_MIN,
  type ReaderFontFamily,
  type ReaderLayoutMode
} from "@/lib/reader-preferences";
import {
  markMobilePresetBootstrapped,
  markSwipeHintShown,
  readReaderFocusModeDefault,
  readReaderDesktopSidebarOpen,
  READER_SWIPE_HINT_DURATION_MS,
  READER_SWIPE_HINT_MESSAGE,
  shouldShowSwipeHint,
  wasMobilePresetBootstrapped,
  writeReaderFocusModeDefault,
  writeReaderDesktopSidebarOpen
} from "@/lib/reader-onboarding";
import {
  readReaderContinuousChapter,
  writeReaderContinuousChapter
} from "@/lib/reader-continuous-chapter";
import {
  canAppendInlineChapter,
  resolveTailNextChapter,
  type ReaderInlineChapterBlock as InlineChapterBlock
} from "@/lib/reader-inline-chapters";
import {
  inlineBlocksAfterHeadPromotion,
  shouldAutoPromotePrimaryChapter
} from "@/lib/reader-inline-promote";
import { ChapterTimestamp } from "@/components/ChapterTimestamp";
import { formatChapterTimestamp } from "@/lib/content-timestamps";
import { chapterContentToParagraphs } from "@/lib/reader-chapter-paragraphs";
import {
  readReaderAudioReadAlong,
  writeReaderAudioReadAlong
} from "@/lib/reader-audio-read-along";
import { readReaderCommentsSplit, writeReaderCommentsSplit } from "@/lib/reader-comments-split";
import {
  pickBestVisibleParagraphEntry,
  readVisibleChapterFromParagraph,
  readerParagraphPositionKey,
  readerScrollPositionKey,
  type ReaderVisibleChapter
} from "@/lib/reader-visible-chapter";
import { buildParagraphPages, buildParagraphPagesFromHeights, pageIndexForParagraph } from "@/lib/reader-pagination";
import {
  estimateParagraphHeight,
  PARAGRAPH_VIRTUALIZE_THRESHOLD
} from "@/lib/reader-navigation";
import { buildGlossaryIndex, lookupGlossarySelection, type GlossaryCharacter, type GlossaryIndex } from "@/lib/reader-glossary";
import { useStoryContentSearch } from "@/hooks/useStoryContentSearch";
import { readReaderPageColumns, writeReaderPageColumns, type ReaderPageColumns } from "@/lib/reader-page-columns";
import type { StoryContentSearchHit } from "@/lib/reader-story-search";
import {
  dismissResumeHint,
  resolveReaderRestoreTarget,
  shouldOfferResumeHint,
  writeResumeNavigationTarget,
  type ReaderResumeHint
} from "@/lib/reader-resume";
import { shareSelectedQuote } from "@/lib/reader-share";
import { renderQuoteShareImage, shareQuoteImage } from "@/lib/reader-quote-image";
import {
  readReaderPerformanceMode,
  writeReaderPerformanceMode,
  readerPerformanceModeLabel,
  type ReaderPerformanceMode
} from "@/lib/reader-performance-mode";
import {
  ReaderChapterFooter,
  ReaderGlossaryDrawer,
  ReaderInChapterSearchPanel,
  ReaderStatsPill,
  renderParagraphSearchText
} from "@/components/ReaderChapterExtras";
import {
  ReaderChapterRecap,
  ReaderParagraphNoteEditor,
  ReaderResumeBanner,
  ReaderSelectionToolbar
} from "@/components/ReaderEnhancements";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { getPageScrollMetrics, schedulePageScrollRestore, scheduleUntil, scrollPageTo } from "@/lib/reader-scroll";
import { buildParagraphProgressWeights, paragraphIndexForAudioProgress } from "@/lib/reader-audio-sync";
import { clampDimLevel, useReaderDim } from "@/hooks/useReaderDim";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useReaderPanels } from "@/hooks/useReaderPanels";
import { useInChapterSearch } from "@/hooks/useInChapterSearch";
import { useParagraphBookmarksAndNotes } from "@/hooks/useParagraphBookmarksAndNotes";
import { useReaderChapterList } from "@/hooks/useReaderChapterList";
import { useReadingSessionMinutes } from "@/hooks/useReadingSessionMinutes";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";
import { useWebGLRuntimeWatchdog } from "@/hooks/useWebGLRuntimeWatchdog";

const ThreeReaderProgress = dynamic(() => import("@/components/ThreeReaderProgress").then((mod) => mod.ThreeReaderProgress), {
  ssr: false
});

const CultivationPanel = dynamic(() => import("@/components/CultivationPanel").then((mod) => mod.CultivationPanel));
const ChapterComments = dynamic(() => import("@/components/ChapterComments").then((mod) => mod.ChapterComments));
const ChapterAudioPlayer = dynamic(() => import("@/components/ChapterAudioPlayer").then((mod) => mod.ChapterAudioPlayer));
const SkillEffectLayer = dynamic(() => import("@/components/SkillEffectLayer").then((mod) => mod.SkillEffectLayer), { ssr: false });
const BackgroundAudioPlayer = dynamic(() => import("@/components/BackgroundAudioPlayer").then((mod) => mod.BackgroundAudioPlayer), { ssr: false });
const AmbientSoundPlayer = dynamic(() => import("@/components/AmbientSoundPlayer").then((mod) => mod.AmbientSoundPlayer), { ssr: false });
const ReaderOnboardingCoach = dynamic(() => import("@/components/ReaderOnboardingCoach").then((mod) => mod.ReaderOnboardingCoach), { ssr: false });
const ReaderEngagementPrompt = dynamic(() => import("@/components/ReaderEngagementPrompt").then((mod) => mod.ReaderEngagementPrompt), { ssr: false });
const ReaderNotesSidebar = dynamic(() => import("@/components/ReaderNotesSidebar").then((mod) => mod.ReaderNotesSidebar));
const ReaderCommentsSidebar = dynamic(() => import("@/components/ReaderCommentsSidebar").then((mod) => mod.ReaderCommentsSidebar));
const ReaderLookupPanel = dynamic(() => import("@/components/ReaderLookupPanel").then((mod) => mod.ReaderLookupPanel));
const ChapterSidebarHeatmap = dynamic(() => import("@/components/ChapterSidebarHeatmap").then((mod) => mod.ChapterSidebarHeatmap));
const ReaderKeyboardHelp = dynamic(() => import("@/components/ReaderKeyboardHelp").then((mod) => mod.ReaderKeyboardHelp));
const ReaderBilingualSettings = dynamic(() => import("@/components/ReaderBilingualSettings").then((mod) => mod.ReaderBilingualSettings));
const ChapterTransition = dynamic(() => import("@/components/ChapterTransition").then((mod) => mod.ChapterTransition));

const StoryCompletionOverlay = dynamic(
  () => import("@/components/StoryCompletionOverlay").then((mod) => mod.StoryCompletionOverlay),
  { ssr: false }
);


const COMPACT_VIEWPORT_QUERY = "(max-width: 839px)";
const READER_PARAGRAPH_POSITION_PREFIX = "reader:paragraph-position";
const MOBILE_PROGRESS_COMMIT_INTERVAL_MS = 900;
const DESKTOP_PROGRESS_COMMIT_INTERVAL_MS = 250;
/** Cheap localStorage-only memory for reload restore (no Redux/network). */
const MOBILE_LOCAL_POSITION_PERSIST_MS = 2000;
const DESKTOP_LOCAL_POSITION_PERSIST_MS = 1500;
/** Redux history upsert — keep mobile cooler; unload flush still captures latest. */
const MOBILE_HISTORY_PERSIST_MS = 5000;
const DESKTOP_HISTORY_PERSIST_MS = 4000;
const MOBILE_REMOTE_PROGRESS_PERSIST_MS = 20000;
const DESKTOP_REMOTE_PROGRESS_PERSIST_MS = 5000;

async function readCachedChapterPayload(storyId: string, chapterNumber: number) {
  const { getCachedChapter } = await import("@/lib/offline-chapters");
  const cached = await getCachedChapter(storyId, chapterNumber);
  return cached?.payload ?? null;
}

const READER_COMFORT_PRESETS = {
  focus: {
    label: "Focus",
    config: { theme: "parchment", fontSize: 20, fontFamily: "literata", lineHeight: 1.9, paragraphSpacing: 1.28, contentWidth: 760 }
  },
  night: {
    label: "Đêm",
    config: { theme: "dark", fontSize: 20, fontFamily: "noto-serif", lineHeight: 1.88, paragraphSpacing: 1.22, contentWidth: 740 }
  },
  ban_dem: {
    label: "Ban đêm",
    config: { theme: "oled", fontSize: 19, fontFamily: "noto-serif", lineHeight: 1.9, paragraphSpacing: 1.2, contentWidth: 720 }
  },
  mobile: {
    label: "Mobile nhẹ",
    config: { theme: "parchment", fontSize: 18, fontFamily: "sans", lineHeight: 1.78, paragraphSpacing: 1.08, contentWidth: 680 }
  },
  wide: {
    label: "Desktop rộng",
    config: { theme: "light", fontSize: 19, fontFamily: "sora", lineHeight: 1.84, paragraphSpacing: 1.18, contentWidth: 860 }
  }
} as const;

const PRESET_ICON_COMPONENT = {
  focus: Eye,
  night: Moon,
  ban_dem: Moon,
  mobile: BookOpen,
  wide: Type
} as const;


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
  glossaryCharacter: GlossaryCharacter | null;
} | null;

type DocumentWithPointCaret = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

export function ReaderClient({ payload }: { payload: ReaderPayload }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ tier: "reader", compactMaxWidth: 839 });
  const { theme, fontSize, fontFamily, lineHeight, paragraphSpacing, contentWidth, layoutMode, tapEdgeEnabled, skillEffectsEnabled } = useAppSelector((state) => state.readerStyle.config);
  const historyHydrated = useAppSelector((state) => state.history.hydrated);
  const currentBookmark = useAppSelector(useMemo(() => selectCurrentBookmark(payload.story.id, payload.chapter.chapterNumber), [payload.story.id, payload.chapter.chapterNumber]));
  const currentUser = useAppSelector((state) => state.identity.user);
  const maxReadChapter = useAppSelector(useMemo(() => selectMaxReadChapter(payload.story.id), [payload.story.id]));
  const [showScrollTop, setShowScrollTop] = useState(false);
  const {
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileFormatOpen,
    setMobileFormatOpen,
    mobileSheetOpen,
    setMobileSheetOpen,
    mobileSheetTab,
    setMobileSheetTab,
    audioPanelOpen,
    setAudioPanelOpen,
    readerOverflowOpen,
    setReaderOverflowOpen,
    qualityPanelOpen,
    setQualityPanelOpen,
    glossaryDrawerOpen,
    setGlossaryDrawerOpen,
    mobileMenuOpenRef,
    mobileSheetOpenRef,
  } = useReaderPanels();
  const [audioAutoStartToken, setAudioAutoStartToken] = useState(0);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(292);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineDownloadProgress, setOfflineDownloadProgress] = useState<{ done: number; total: number } | null>(null);
  const [sheetProgress, setSheetProgress] = useState(0);
  const [mobileProgress, setMobileProgress] = useState(0);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  useWebGLRuntimeWatchdog({ enabled: decorativeWebglEnabled && !focusModeEnabled });
  const readerOverflowRef = useRef<HTMLDivElement>(null);
  const [floatingActionsMounted, setFloatingActionsMounted] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [highlightContinuePrompt, setHighlightContinuePrompt] = useState(false);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const {
    enabled: readerDimEnabled,
    level: readerDimLevel,
    setEnabled: setReaderDimEnabled,
    setLevel: setReaderDimLevel,
  } = useReaderDim();
  const {
    supported: wakeLockSupported,
    active: wakeLockActive,
    error: wakeLockError,
    toggle: toggleWakeLock,
  } = useWakeLock();
  const [swipeNotice, setSwipeNotice] = useState<string | null>(null);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const [freshChapterHint, setFreshChapterHint] = useState<ReaderChapterFreshHintState | null>(null);
  const [shellFreshPulse, setShellFreshPulse] = useState(false);
  const freshHintTimerRef = useRef<number | null>(null);
  const [compactReader, setCompactReader] = useState(false);
  const [paragraphScrollMargin, setParagraphScrollMargin] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageViewportHeight, setPageViewportHeight] = useState(640);
  const [measuredParagraphHeights, setMeasuredParagraphHeights] = useState<number[] | null>(null);
  const [chapterTransitionTrigger, setChapterTransitionTrigger] = useState(0);
  const [chapterTransitionDirection, setChapterTransitionDirection] = useState<"next" | "prev">("next");
  const [adminEdit, setAdminEdit] = useState<AdminEditState>(null);
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);
  const [selectionAction, setSelectionAction] = useState<ReaderSelectionAction>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resumeHint, setResumeHint] = useState<ReaderResumeHint | null>(null);
  const [glossaryIndex, setGlossaryIndex] = useState<GlossaryIndex>(() => new Map());
  const [performanceMode, setPerformanceMode] = useState<ReaderPerformanceMode>(() => readReaderPerformanceMode());
  const [focusModeDefault, setFocusModeDefault] = useState(() => readReaderFocusModeDefault());
  const [audioHighlightIndex, setAudioHighlightIndex] = useState<number | null>(null);
  const [readAlongEnabled, setReadAlongEnabled] = useState(true);
  const [glossaryTapCharacter, setGlossaryTapCharacter] = useState<GlossaryCharacter | null>(null);
  const [continuousChapterEnabled, setContinuousChapterEnabled] = useState(() => readReaderContinuousChapter());
  const continuousChapterTriggeredRef = useRef(false);
  const continuousChapterEnabledRef = useRef(continuousChapterEnabled);
  const openNextChapterFastRef = useRef<() => void>(() => undefined);
  const appendInlineNextChapterRef = useRef<() => void>(() => undefined);
  const promoteHeadInlineRef = useRef<() => Promise<boolean>>(async () => false);
  const inlineChaptersRef = useRef<InlineChapterBlock[]>([]);
  const inlineAppendInFlightRef = useRef(false);
  const promoteInlineInFlightRef = useRef(false);
  const skipInlineClearRef = useRef(false);
  const [chapterSearchMode, setChapterSearchMode] = useState<"chapter" | "story">("chapter");
  const [storySearchHitIndex, setStorySearchHitIndex] = useState(0);
  const [notesSidebarOpen, setNotesSidebarOpen] = useState(false);
  const [commentsSplitOpen, setCommentsSplitOpen] = useState(false);
  const [inlineChapters, setInlineChapters] = useState<InlineChapterBlock[]>([]);
  const [commentsChapterId, setCommentsChapterId] = useState(payload.chapter.id);
  const visibleChapterRef = useRef<ReaderVisibleChapter>({
    chapterId: payload.chapter.id,
    chapterNumber: payload.chapter.chapterNumber,
    chapterTitle: payload.chapter.title,
    paragraphIndex: 0
  });
  const syncedReaderUrlChapterRef = useRef(payload.chapter.chapterNumber);
  const lastPersistedHistoryRef = useRef<{
    chapterNumber: number;
    paragraphIndex: number;
    progressBucket: number;
  } | null>(null);
  const lastVirtualVisibleParagraphRef = useRef<number | null>(null);
  const [pageColumns, setPageColumns] = useState<ReaderPageColumns>(() => readReaderPageColumns());
  const panelScrollAnchorRef = useRef<{ scrollY: number; paragraphIndex: number } | null>(null);
  const [jumpBackTarget, setJumpBackTarget] = useState<{ scrollY: number; paragraphIndex: number } | null>(null);
  const focusDefaultBootstrappedRef = useRef(false);
  const lastAudioScrollIndexRef = useRef<number | null>(null);
  const { cachedChapters, ready: offlineSubsystemReady } = useReaderOfflineCache();
  const [cachedPayload, setCachedPayload] = useState<ReaderPayload | null>(null);
  const {
    context: formatFloatingContext,
    floatingStyles: formatFloatingStyles,
    refs: formatFloatingRefs
  } = useFloating({
    open: mobileFormatOpen,
    onOpenChange: setMobileFormatOpen,
    placement: "bottom-end",
    strategy: "fixed",
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate
  });
  const formatDismiss = useDismiss(formatFloatingContext);
  const { getFloatingProps: getFormatFloatingProps, getReferenceProps: getFormatReferenceProps } = useInteractions([formatDismiss]);
  const activePayload = cachedPayload ?? payload;
  const activePayloadRef = useRef(activePayload);
  activePayloadRef.current = activePayload;
  const [bilingualPrefs, setBilingualPrefs] = useState<ReaderBilingualPrefs>(() => readReaderBilingualPrefs());
  const supportsBilingual = useMemo(() => supportsBilingualReader(activePayload.story.sourceCode), [activePayload.story.sourceCode]);
  const bilingualQueryOptions = useMemo(
    () => (supportsBilingual ? bilingualFetchOptions(bilingualPrefs) : undefined),
    [supportsBilingual, bilingualPrefs]
  );
  const bilingualActive = Boolean(
    supportsBilingual &&
      bilingualPrefs.enabled &&
      activePayload.chapter.bilingualEnabled &&
      (activePayload.chapter.bilingualPairs?.length ?? 0) > 0
  );
  const bilingualPairs = useMemo(
    () => (bilingualActive ? activePayload.chapter.bilingualPairs ?? [] : []),
    [bilingualActive, activePayload.chapter.bilingualPairs],
  );
  const bilingualSecondaryVisible = bilingualActive && bilingualPrefs.secondaryVisible;
  const bilingualScrollHighlight = bilingualActive && bilingualPrefs.scrollHighlight && !prefersReducedMotion();
  const bilingualColumnsLayout = bilingualActive && bilingualPrefs.layoutStyle === "columns";
  const [scrollFocusParagraphIndex, setScrollFocusParagraphIndex] = useState<number | null>(null);
  const [bilingualRevealedIndexes, setBilingualRevealedIndexes] = useState<Set<number>>(() => new Set());
  const [phraseNotes, setPhraseNotes] = useState<ReaderPhraseNote[]>([]);
  const [phraseNoteEditor, setPhraseNoteEditor] = useState<ReaderPhraseNote | null>(null);
  const [lookupRequest, setLookupRequest] = useState<{
    query: string;
    contextEnglish: string | null;
    contextPaired: string | null;
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    paragraphIndex: number;
  } | null>(null);
  const bilingualScrollHighlightRef = useRef(bilingualScrollHighlight);
  const sessionMinutes = useReadingSessionMinutes(activePayload.chapter.id);
  const chapterSidebarRef = useRef<HTMLElement | null>(null);
  const desktopSidebarButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousChapterSentinelRef = useRef<HTMLDivElement | null>(null);
  const nextChapterSentinelRef = useRef<HTMLDivElement | null>(null);
  const chapterVirtualizerScrollRef = useRef<HTMLDivElement | null>(null);
  const {
    chapters,
    filteredChapters,
    loadingChapters,
    chapterSearch,
    setChapterSearch,
    chapterSearchText,
    previousChapterCursor,
    chapterCursor,
    loadNextChapters,
    loadPreviousChapters,
  } = useReaderChapterList({
    payload,
    storyId: activePayload.story.id,
    sidebarRef: chapterSidebarRef,
    previousSentinelRef: previousChapterSentinelRef,
    nextSentinelRef: nextChapterSentinelRef,
  });
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const scrollTopButtonRef = useRef<HTMLButtonElement | null>(null);
  const audioPanelRef = useRef<HTMLElement | null>(null);
  const adminContentEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const adminRestoreScrollTopRef = useRef<number | null>(null);
  const paragraphContainerRef = useRef<HTMLElement | null>(null);
  const pageMeasureContainerRef = useRef<HTMLDivElement | null>(null);
  const formatTriggerRef = useRef<HTMLButtonElement | null>(null);
  const formatPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetScrollRef = useRef<HTMLDivElement | null>(null);
  const lastLocalPersistRef = useRef(0);
  const lastHistoryPersistRef = useRef(0);
  const lastRemotePersistRef = useRef(0);
  const lastSavedLocalPositionRef = useRef<{ scroll: number; paragraph: number; chapter: number } | null>(null);
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
  const headingEtaLabelRef = useRef<HTMLSpanElement | null>(null);
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
  const lastScrollTopRef = useRef(0);
  const compactViewportRef = useRef(false);
  const readerChromeHiddenRef = useRef(false);
  const readerShellRef = useRef<HTMLElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const zenTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
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

  const buildCurrentBookmark = useCallback((): ReaderBookmarkItem => {
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
  }, [activePayload.chapter, activePayload.story, currentBookmark?.createdAt]);

  const toggleBookmark = useCallback(() => {
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
  }, [activePayload.chapter, activePayload.story, buildCurrentBookmark, currentBookmark, dispatch]);

  useEffect(() => {
    setFloatingActionsMounted(true);
  }, []);
  const paragraphs = useMemo(() => {
    if (bilingualActive && bilingualPairs.length > 0) {
      return bilingualPairs.map((pair) => pair.primary.text);
    }
    if (!activePayload.chapter.content) return [];
    if (activePayload.chapter.isContentPreformatted) {
      return activePayload.chapter.content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    }

    return formatNovelContent(activePayload.chapter.content, undefined, activePayload.chapter.title);
  }, [
    activePayload.chapter.content,
    activePayload.chapter.isContentPreformatted,
    activePayload.chapter.title,
    bilingualActive,
    bilingualPairs
  ]);
  const storyBookmarks = useAppSelector(useMemo(() => selectStoryBookmarks(activePayload.story.id), [activePayload.story.id]));
  const {
    storyParagraphBookmarks,
    paragraphBookmarksForChapter,
    bookmarkedIndexesForChapter,
    noteEditor: paragraphNoteEditor,
    setNoteEditor: setParagraphNoteEditor,
    openNoteEditor: openParagraphNoteEditor,
    saveNote: saveParagraphNote,
    toggleBookmark: toggleParagraphBookmark,
  } = useParagraphBookmarksAndNotes({
    storyId: activePayload.story.id,
    currentUser,
    progressRef,
    onNotice: setSwipeNotice,
  });
  const storyPhraseNotes = useMemo(
    () => phraseNotesForStory(phraseNotes, activePayload.story.id),
    [phraseNotes, activePayload.story.id]
  );
  useEffect(() => {
    setPhraseNotes(readPhraseNotes());
  }, []);
  useEffect(() => {
    setBilingualRevealedIndexes(new Set());
  }, [activePayload.chapter.id, bilingualPrefs.secondaryVisible]);
  const primaryChapterNumber = activePayload.chapter.chapterNumber;
  const currentChapterParagraphBookmarks = paragraphBookmarksForChapter(primaryChapterNumber);
  const bookmarkedParagraphIndexes = bookmarkedIndexesForChapter(primaryChapterNumber);
  const formattedPreviewParagraphs = useMemo(
    () => qualityPanelOpen ? formatNovelContent(activePayload.chapter.content, undefined, activePayload.chapter.title) : null,
    [qualityPanelOpen, activePayload.chapter.content, activePayload.chapter.title]
  );
  const totalReadingMinutes = useMemo(
    () => estimateReadingMinutes(countReadableWords(activePayload.chapter.content)),
    [activePayload.chapter.content]
  );
  const shouldVirtualizeParagraphs = layoutMode === "scroll" && paragraphs.length >= PARAGRAPH_VIRTUALIZE_THRESHOLD;
  const paragraphVirtualizer = useWindowVirtualizer({
    count: shouldVirtualizeParagraphs ? paragraphs.length : 0,
    estimateSize: (index) =>
      estimateParagraphHeight(paragraphs[index] ?? "", {
        fontSize,
        lineHeight,
        paragraphSpacing,
        contentWidth
      }),
    overscan: 10,
    scrollMargin: paragraphScrollMargin
  });
  const paragraphVirtualizerRef = useRef(paragraphVirtualizer);
  paragraphVirtualizerRef.current = paragraphVirtualizer;
  const shouldVirtualizeParagraphsRef = useRef(shouldVirtualizeParagraphs);
  shouldVirtualizeParagraphsRef.current = shouldVirtualizeParagraphs;
  const isPageLayout = layoutMode === "page";
  const {
    enabled: autoScrollEnabled,
    speed: autoScrollSpeed,
    setSpeed: setAutoScrollSpeed,
    stop: stopAutoScroll,
    toggle: toggleAutoScroll,
  } = useAutoScroll({
    blocked: mobileMenuOpen || mobileSheetOpen,
    disabled: isPageLayout,
    onStart: () => setMobileSheetOpen(false),
  });
  const pageHeadingReserve = compactReader ? 148 : 168;
  const paragraphPages = useMemo(() => {
    const pageOptions = {
      pageHeight: pageViewportHeight,
      headingReserve: pageHeadingReserve
    };

    if (
      isPageLayout &&
      measuredParagraphHeights &&
      measuredParagraphHeights.length === paragraphs.length
    ) {
      return buildParagraphPagesFromHeights(measuredParagraphHeights, pageOptions);
    }

    return buildParagraphPages(paragraphs, {
      fontSize,
      lineHeight,
      paragraphSpacing,
      contentWidth,
      ...pageOptions
    });
  }, [
    paragraphs,
    fontSize,
    lineHeight,
    paragraphSpacing,
    contentWidth,
    pageViewportHeight,
    pageHeadingReserve,
    isPageLayout,
    measuredParagraphHeights
  ]);
  const currentPageParagraphIndexes = paragraphPages[pageIndex] ?? [];
  const glossaryCharacters = useMemo(() => {
    const seen = new Set<string>();
    const items: GlossaryCharacter[] = [];
    for (const character of glossaryIndex.values()) {
      if (seen.has(character.name)) continue;
      seen.add(character.name);
      items.push(character);
    }
    return items.sort((left, right) => left.name.localeCompare(right.name, "vi"));
  }, [glossaryIndex]);
  const chapterSearchBlocks = useMemo(
    () => [
      { chapterNumber: activePayload.chapter.chapterNumber, paragraphs },
      ...inlineChapters.map((block) => ({ chapterNumber: block.chapterNumber, paragraphs: block.paragraphs }))
    ],
    [activePayload.chapter.chapterNumber, paragraphs, inlineChapters]
  );
  const sessionParagraphBookmarks = useMemo(() => {
    const chapterNumbers = new Set([
      activePayload.chapter.chapterNumber,
      ...inlineChapters.map((block) => block.chapterNumber)
    ]);
    return storyParagraphBookmarks.filter((bookmark) => chapterNumbers.has(bookmark.chapterNumber));
  }, [activePayload.chapter.chapterNumber, inlineChapters, storyParagraphBookmarks]);
  const {
    open: chapterSearchOpen,
    setOpen: setChapterSearchOpen,
    query: chapterSearchQuery,
    setQuery: setChapterSearchQuery,
    matchIndex: chapterSearchMatchIndex,
    matches: chapterSearchMatches,
    activeMatch: activeChapterSearchMatch,
    jump: jumpChapterSearchMatch,
  } = useInChapterSearch({
    blocks: chapterSearchBlocks,
    paragraphContainerRef,
    resetKey: `${activePayload.chapter.id}:${inlineChapters.map((block) => block.chapterId).join(",")}`,
  });
  const {
    hits: storySearchHits,
    loading: storySearchLoading,
    error: storySearchError
  } = useStoryContentSearch(activePayload.story.id, chapterSearchQuery, chapterSearchOpen && chapterSearchMode === "story");
  const spreadPageMode = isPageLayout && pageColumns === 2 && !compactReader;
  const tailNextChapter = useMemo(
    () => resolveTailNextChapter(inlineChapters, activePayload.nextChapter),
    [inlineChapters, activePayload.nextChapter]
  );
  const primaryChapterParagraphAttrs = useMemo(
    () => ({
      "data-chapter-number": activePayload.chapter.chapterNumber,
      "data-chapter-id": activePayload.chapter.id,
      "data-chapter-title": activePayload.chapter.title
    }),
    [activePayload.chapter.chapterNumber, activePayload.chapter.id, activePayload.chapter.title]
  );
  const visiblePageIndexes = useMemo(() => {
    if (!spreadPageMode) return [pageIndex];
    const next = pageIndex + 1;
    return next < paragraphPages.length ? [pageIndex, next] : [pageIndex];
  }, [pageIndex, paragraphPages.length, spreadPageMode]);
  const paragraphAudioWeights = useMemo(() => buildParagraphProgressWeights(paragraphs), [paragraphs]);

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
  const offlineCacheBytes = useMemo(() => estimateOfflineCacheBytes(sortedCachedChapters), [sortedCachedChapters]);
  const readingFromOfflineCache = Boolean(cachedPayload) || offlineReady;
  const canVirtualizeChapterList = filteredChapters.length > 80 && (Boolean(chapterSearchText) || (!previousChapterCursor && !chapterCursor));
  const chapterVirtualizer = useVirtualizer({
    count: filteredChapters.length,
    getScrollElement: () => chapterVirtualizerScrollRef.current,
    estimateSize: () => 78,
    overscan: 8,
    getItemKey: (index) => filteredChapters[index]?.id ?? index
  });
  const filteredChaptersRef = useRef(filteredChapters);
  filteredChaptersRef.current = filteredChapters;
  const chapterVirtualizerRef = useRef(chapterVirtualizer);
  chapterVirtualizerRef.current = chapterVirtualizer;
  const canVirtualizeChapterListRef = useRef(canVirtualizeChapterList);
  canVirtualizeChapterListRef.current = canVirtualizeChapterList;
  const storageKey = `reader:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;
  const forceTopKey = `reader:force-top:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;
  const paragraphPositionKey = `${READER_PARAGRAPH_POSITION_PREFIX}:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;

  const goToPage = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(paragraphPages.length - 1, Math.max(0, nextIndex));
      setPageIndex(clamped);
      const firstParagraph = paragraphPages[clamped]?.[0];
      if (typeof firstParagraph === "number") {
        activeParagraphIndexRef.current = firstParagraph;
        window.localStorage.setItem(paragraphPositionKey, String(firstParagraph));
      }
      const pageProgress = paragraphPages.length > 0 ? ((clamped + 1) / paragraphPages.length) * 100 : 0;
      progressRef.current = pageProgress;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${pageProgress / 100})`;
      }
    },
    [paragraphPages, paragraphPositionKey]
  );

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
        anonymousId: currentUser ? undefined : getAnonymousReaderId(),
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
  }, [activePayload.chapter.chapterNumber, activePayload.chapter.id, activePayload.story.id, currentUser]);

  useEffect(() => {
    const compactQuery = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const update = () => {
      compactViewportRef.current = compactQuery.matches;
      setCompactReader(compactQuery.matches);
    };

    update();
    compactQuery.addEventListener("change", update);
    return () => compactQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isPageLayout) return;
    const update = () => {
      const dockReserve = compactReader ? 96 : 28;
      setPageViewportHeight(Math.max(280, window.innerHeight - dockReserve));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [compactReader, isPageLayout]);

  useEffect(() => {
    if (!isPageLayout) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPageLayout]);

  useEffect(() => {
    setPageIndex(0);
    setMeasuredParagraphHeights(null);
  }, [activePayload.chapter.id, isPageLayout]);

  useEffect(() => {
    if (!isPageLayout || !historyHydrated) return;
    const savedParagraph = Number(window.localStorage.getItem(paragraphPositionKey));
    if (!Number.isFinite(savedParagraph)) return;
    setPageIndex(pageIndexForParagraph(paragraphPages, savedParagraph));
  }, [activePayload.chapter.id, historyHydrated, isPageLayout, paragraphPages, paragraphPositionKey]);

  useLayoutEffect(() => {
    if (!isPageLayout || paragraphs.length === 0) {
      setMeasuredParagraphHeights(null);
      return;
    }

    const container = pageMeasureContainerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>("[data-measure-index]");
    if (nodes.length !== paragraphs.length) return;

    const heights = Array.from(nodes).map((node) => node.getBoundingClientRect().height);
    setMeasuredParagraphHeights((current) => {
      if (
        current &&
        current.length === heights.length &&
        current.every((height, index) => Math.abs(height - heights[index]!) < 0.5)
      ) {
        return current;
      }
      return heights;
    });
  }, [isPageLayout, paragraphs, fontSize, lineHeight, paragraphSpacing, contentWidth, pageViewportHeight]);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(0, paragraphPages.length - 1)));
  }, [paragraphPages.length]);

  useEffect(() => {
    if (mobileSheetTab === "settings" && currentUser?.isAdmin) {
      setQualityPanelOpen(true);
    }
  }, [mobileSheetTab, currentUser, setQualityPanelOpen]);

  useEffect(() => {
    setAudioPanelOpen(false);
    setAdminEdit(null);
    setAdminEditError(null);
  }, [activePayload.chapter.id, setAdminEdit, setAdminEditError, setAudioPanelOpen]);

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
    if (restoredScrollKeyRef.current === storageKey) return;

    const forceTop = window.sessionStorage.getItem(forceTopKey) === "true";
    const bookmarkScrollKey = `reader:bookmark-scroll:${activePayload.story.id}:${activePayload.chapter.chapterNumber}`;
    const bookmarkScrollRaw = window.sessionStorage.getItem(bookmarkScrollKey);
    const bookmarkScroll = bookmarkScrollRaw != null ? Number(bookmarkScrollRaw) : null;
    const localParagraphRaw = Number(window.localStorage.getItem(paragraphPositionKey));
    const localScrollRaw = Number(window.localStorage.getItem(storageKey));
    const hasLocalTarget =
      forceTop ||
      (bookmarkScroll != null && Number.isFinite(bookmarkScroll) && bookmarkScroll > 0) ||
      (Number.isInteger(localParagraphRaw) && localParagraphRaw > 0) ||
      (Number.isFinite(localScrollRaw) && localScrollRaw > 0);

    // localStorage is enough for reload restore; wait for history only when we need Redux fallback.
    if (!historyHydrated && !hasLocalTarget) return;
    restoredScrollKeyRef.current = storageKey;

    // Avoid browser scroll restoration fighting our explicit resume position (esp. on reload).
    let previousScrollRestoration: ScrollRestoration | null = null;
    try {
      if ("scrollRestoration" in window.history) {
        previousScrollRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";
      }
    } catch {
      previousScrollRestoration = null;
    }

    setShowResumeBanner(false);
    setResumeHint(null);

    if (forceTop) {
      window.sessionStorage.removeItem(forceTopKey);
    }

    const cancelFns: Array<() => void> = [];
    if (bookmarkScroll != null && Number.isFinite(bookmarkScroll) && bookmarkScroll > 0) {
      window.sessionStorage.removeItem(bookmarkScrollKey);
    }

    const historyItem = store.getState().history.items.find((item) => item.storyId === activePayload.story.id);
    const sameChapter = historyItem?.chapterNumber === activePayload.chapter.chapterNumber;
    const progressPercent = sameChapter ? historyItem.progressPercent : 0;
    const historyParagraph = sameChapter ? (historyItem.paragraphIndex ?? null) : null;

    const restoreTarget = resolveReaderRestoreTarget({
      forceTop,
      bookmarkScroll,
      localParagraph: Number.isInteger(localParagraphRaw) ? localParagraphRaw : null,
      historyParagraph,
      localScroll: Number.isFinite(localScrollRaw) ? localScrollRaw : null,
      historyScroll: sameChapter ? historyItem?.scrollPosition ?? null : null,
      sameChapter
    });

    if (restoreTarget.kind === "force-top") {
      scrollPageTo(0);
      return () => {
        if (restoredScrollKeyRef.current === storageKey) restoredScrollKeyRef.current = null;
        if (previousScrollRestoration != null) {
          try {
            window.history.scrollRestoration = previousScrollRestoration;
          } catch {
            // Ignore.
          }
        }
      };
    }

    const restoreOpts = compactViewportRef.current
      ? { maxAttempts: 14, intervalMs: 80, backoff: true }
      : { maxAttempts: 16, intervalMs: 64, backoff: true };

    let restoreLanded = false;

    // Prefer paragraph restore (stable across font/layout/URL-bar changes on mobile).
    if (restoreTarget.kind === "paragraph" && !isPageLayout) {
      const paragraphIndex = restoreTarget.paragraphIndex;
      cancelFns.push(
        scheduleUntil(() => {
          const ok = scrollToParagraph(paragraphIndex, "auto", activePayload.chapter.chapterNumber);
          if (ok) restoreLanded = true;
          return ok;
        }, restoreOpts)
      );
    } else if (restoreTarget.kind === "scroll" && !isPageLayout) {
      cancelFns.push(
        schedulePageScrollRestore(restoreTarget.top, {
          ...restoreOpts,
          maxAttempts: compactViewportRef.current ? 18 : 16
        })
      );
    }

    // One quiet fonts nudge only if first restore path hasn't settled yet.
    if (restoreTarget.kind === "paragraph" && !isPageLayout && typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (restoreLanded || restoredScrollKeyRef.current !== storageKey) return;
        scrollToParagraph(restoreTarget.paragraphIndex, "auto", activePayload.chapter.chapterNumber);
      });
    } else if (restoreTarget.kind === "scroll" && !isPageLayout && typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (restoredScrollKeyRef.current !== storageKey) return;
        const { scrollTop } = getPageScrollMetrics();
        if (Math.abs(scrollTop - restoreTarget.top) > 48) scrollPageTo(restoreTarget.top);
      });
    }

    if (
      historyHydrated &&
      sameChapter &&
      shouldOfferResumeHint(activePayload.story.id, activePayload.chapter.chapterNumber, progressPercent, historyParagraph)
    ) {
      const bannerParagraph =
        restoreTarget.kind === "paragraph"
          ? restoreTarget.paragraphIndex
          : historyParagraph;
      setResumeHint({ paragraphIndex: bannerParagraph, progressPercent });
      setShowResumeBanner(true);
    }

    return () => {
      cancelFns.forEach((cancel) => cancel());
      // Allow Strict Mode remount / dep churn to retry restore after cancel.
      if (restoredScrollKeyRef.current === storageKey) restoredScrollKeyRef.current = null;
      if (previousScrollRestoration != null) {
        try {
          window.history.scrollRestoration = previousScrollRestoration;
        } catch {
          // Ignore.
        }
      }
    };
    // isPageLayout / scrollToParagraph omitted — restore runs once per chapter/storage key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePayload.chapter.chapterNumber, activePayload.story.id, forceTopKey, historyHydrated, paragraphPositionKey, storageKey]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileFormatOpen(false);
    setMobileSheetOpen(false);
    setReaderOverflowOpen(false);
    stopAutoScroll();
    setChapterSearchOpen(false);
    setChapterSearchQuery("");
    setGlossaryDrawerOpen(false);
    setCachedPayload(null);
    setShowCompletionOverlay(false);
    setParagraphNoteEditor(null);
    completionShownRef.current = false;
    continuousChapterTriggeredRef.current = false;
    setJumpBackTarget(null);
    setInlineChapters([]);
    visibleChapterRef.current = {
      chapterId: activePayload.chapter.id,
      chapterNumber: activePayload.chapter.chapterNumber,
      chapterTitle: activePayload.chapter.title,
      paragraphIndex: 0
    };
    syncedReaderUrlChapterRef.current = activePayload.chapter.chapterNumber;
    setCommentsChapterId(activePayload.chapter.id);
  }, [
    activePayload.chapter.chapterNumber,
    activePayload.chapter.id,
    activePayload.chapter.title,
    payload.chapters,
    payload.previousChapterCursor,
    payload.chapterCursor,
    setChapterSearchOpen,
    setChapterSearchQuery,
    setGlossaryDrawerOpen,
    setMobileFormatOpen,
    setMobileMenuOpen,
    setMobileSheetOpen,
    setParagraphNoteEditor,
    setReaderOverflowOpen,
    stopAutoScroll
  ]);

  useEffect(() => {
    inlineChaptersRef.current = inlineChapters;
  }, [inlineChapters]);

  useEffect(() => {
    if (skipInlineClearRef.current) {
      skipInlineClearRef.current = false;
      visibleChapterRef.current = {
        chapterId: activePayload.chapter.id,
        chapterNumber: activePayload.chapter.chapterNumber,
        chapterTitle: activePayload.chapter.title,
        paragraphIndex: visibleChapterRef.current.paragraphIndex
      };
      syncedReaderUrlChapterRef.current = activePayload.chapter.chapterNumber;
      setCommentsChapterId(activePayload.chapter.id);
      return;
    }

    setInlineChapters([]);
    continuousChapterTriggeredRef.current = false;
    visibleChapterRef.current = {
      chapterId: activePayload.chapter.id,
      chapterNumber: activePayload.chapter.chapterNumber,
      chapterTitle: activePayload.chapter.title,
      paragraphIndex: 0
    };
    syncedReaderUrlChapterRef.current = activePayload.chapter.chapterNumber;
    setCommentsChapterId(activePayload.chapter.id);
    lastVirtualVisibleParagraphRef.current = null;
    lastPersistedHistoryRef.current = null;
  }, [activePayload.chapter.id, activePayload.chapter.chapterNumber, activePayload.chapter.title]);

  useEffect(() => {
    if (!commentsSplitOpen || compactReader) return;
    setNotesSidebarOpen(false);
  }, [commentsSplitOpen, compactReader]);

  useEffect(() => {
    const saved = readReaderCommentsSplit();
    if (saved) setCommentsSplitOpen(true);
  }, []);

  useEffect(() => {
    fetch(`/api/stories/${activePayload.story.id}/char-map`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { available?: boolean; characters?: GlossaryCharacter[]; aliases?: Record<string, string> } | null) => {
        if (!data?.available || !Array.isArray(data.characters)) {
          setGlossaryIndex(new Map());
          return;
        }
        setGlossaryIndex(buildGlossaryIndex(data.characters, data.aliases ?? {}));
      })
      .catch(() => setGlossaryIndex(new Map()));
  }, [activePayload.story.id]);

  useEffect(() => {
    if (focusDefaultBootstrappedRef.current) return;
    focusDefaultBootstrappedRef.current = true;
    if (readReaderFocusModeDefault()) setFocusModeEnabled(true);
    setReadAlongEnabled(readReaderAudioReadAlong());
  }, []);

  function setReadAlongPreference(enabled: boolean) {
    setReadAlongEnabled(enabled);
    writeReaderAudioReadAlong(enabled);
  }

  useEffect(() => {
    const saved = readReaderDesktopSidebarOpen();
    if (saved !== null) setDesktopSidebarOpen(saved);
  }, []);

  useEffect(() => {
    setAudioHighlightIndex(null);
    lastAudioScrollIndexRef.current = null;
  }, [activePayload.chapter.id]);

  useEffect(() => {
    if (!mobileMenuOpen && !mobileSheetOpen) return;
    readerChromeHiddenRef.current = false;
    readerShellRef.current?.classList.remove("reader-shell-chrome-hidden");
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
  }, [mobileMenuOpen, setMobileMenuOpen]);

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
  }, [readerOverflowOpen, setReaderOverflowOpen]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    import("animejs").then((mod) => { animeRef.current = mod.animate; });
  }, []);

  const centerActiveChapter = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (canVirtualizeChapterListRef.current) {
      const chapters = filteredChaptersRef.current;
      const activeIndex = chapters.findIndex((chapter) => chapter.chapterNumber === activePayload.chapter.chapterNumber);
      if (activeIndex >= 0) {
        chapterVirtualizerRef.current.scrollToIndex(activeIndex, {
          align: "center",
          behavior: prefersReducedMotion() ? "auto" : behavior
        });
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
  }, [activePayload.chapter.chapterNumber]);

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
    // Intentionally omit centerActiveChapter — stable callback; including it re-ran sidebar anime every render.
  }, [activePayload.chapter.chapterNumber, chapters.length, desktopSidebarOpen, mobileMenuOpen]);

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
    setOfflineDownloadProgress(null);
    void import("@/lib/offline-chapters")
      .then(({ preloadNextChapters }) => preloadNextChapters(activePayload, 3))
      .catch(() => {
        if (surfaceErrors) setOfflineError("Chưa cache được chương. Kiểm tra mạng rồi thử lại.");
      })
      .finally(() => setOfflineLoading(false));
  }, [activePayload]);

  const downloadOfflinePreset = useCallback(async (count: number) => {
    setOfflineError(null);
    setOfflineLoading(true);
    setOfflineDownloadProgress({ done: 0, total: count });
    try {
      const { downloadChaptersFrom } = await import("@/lib/offline-chapters");
      await downloadChaptersFrom(activePayload, activePayload.chapter.chapterNumber, count, {
        includeCurrent: true,
        onProgress: (done, total) => setOfflineDownloadProgress({ done, total })
      });
      showSwipeNotice(`Đã tải ${count} chương offline`);
    } catch {
      setOfflineError("Không tải được offline. Kiểm tra mạng rồi thử lại.");
    } finally {
      setOfflineLoading(false);
      setOfflineDownloadProgress(null);
    }
  }, [activePayload]);

  useEffect(() => {
    if (!offlineSubsystemReady) return;
    refreshOfflineCache(false);
  }, [offlineSubsystemReady, refreshOfflineCache]);

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

  useLayoutEffect(() => {
    const updateContentMetrics = () => {
      const contentNode = paragraphContainerRef.current;
      if (!contentNode) return;
      const rect = contentNode.getBoundingClientRect();
      contentTopRef.current = rect.top + window.scrollY;
      contentHeightRef.current = Math.max(1, contentNode.offsetHeight);
      const nextMargin = contentNode.offsetTop;
      setParagraphScrollMargin((current) => (current === nextMargin ? current : nextMargin));
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
  }, [paragraphs.length, fontSize, lineHeight, paragraphSpacing, contentWidth, shouldVirtualizeParagraphs]);

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
  }, [mobileSheetOpen, setMobileSheetOpen]);

  // Reader keyboard shortcuts: ←/→ chapter nav, B bookmark, F focus mode, T chapter list
  useEffect(() => {
    function onReaderKey(event: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if ((document.activeElement as HTMLElement | null)?.isContentEditable) return;

      if ((event.ctrlKey || event.metaKey) && (event.key === "f" || event.key === "F")) {
        event.preventDefault();
        setChapterSearchOpen(true);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setKeyboardHelpOpen((prev) => !prev);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setChapterSearchOpen(true);
        setChapterSearchMode("chapter");
        return;
      }

      if (event.key === "j" || event.key === "J") {
        if (isPageLayout && pageIndex < paragraphPages.length - (spreadPageMode ? (visiblePageIndexes.length > 1 ? 2 : 1) : 1)) {
          event.preventDefault();
          goToPage(pageIndex + (spreadPageMode ? 2 : 1));
          return;
        }
        const next = tailNextChapter ?? activePayload.nextChapter;
        if (next) {
          event.preventDefault();
          router.push(storyHref(activePayload.story, next.chapterNumber));
        }
        return;
      }

      if (event.key === "k" || event.key === "K") {
        if (isPageLayout && pageIndex > 0) {
          event.preventDefault();
          goToPage(pageIndex - (spreadPageMode ? 2 : 1));
          return;
        }
        if (activePayload.previousChapter) {
          event.preventDefault();
          router.push(storyHref(activePayload.story, activePayload.previousChapter.chapterNumber));
        }
        return;
      }

      if (event.key === "n" || event.key === "N") {
        if (!compactViewportRef.current) {
          event.preventDefault();
          setNotesSidebarOpen((prev) => !prev);
        }
        return;
      }

      if (event.key === "ArrowRight") {
        if (isPageLayout && pageIndex < paragraphPages.length - (spreadPageMode ? (visiblePageIndexes.length > 1 ? 2 : 1) : 1)) {
          event.preventDefault();
          goToPage(pageIndex + (spreadPageMode ? 2 : 1));
          return;
        }
        if (activePayload.nextChapter) {
          event.preventDefault();
          router.push(storyHref(activePayload.story, activePayload.nextChapter.chapterNumber));
        }
      } else if (event.key === "ArrowLeft") {
        if (isPageLayout && pageIndex > 0) {
          event.preventDefault();
          goToPage(pageIndex - (spreadPageMode ? 2 : 1));
          return;
        }
        if (activePayload.previousChapter) {
          event.preventDefault();
          router.push(storyHref(activePayload.story, activePayload.previousChapter.chapterNumber));
        }
      } else if (event.key === "b" || event.key === "B") {
        toggleBookmark();
      } else if (event.key === "f" || event.key === "F") {
        setFocusModeEnabled((prev) => !prev);
      } else if (event.key === "z" || event.key === "Z") {
        setFocusModeEnabled((prev) => !prev);
      } else if (event.key === "g" || event.key === "G") {
        if (glossaryCharacters.length > 0) setGlossaryDrawerOpen((prev) => !prev);
      } else if (event.key === "h" || event.key === "H") {
        if (bilingualActive) {
          event.preventDefault();
          const next = { ...bilingualPrefs, secondaryVisible: !bilingualPrefs.secondaryVisible };
          setBilingualPrefs(next);
          writeReaderBilingualPrefs(next);
        }
      } else if (event.key === "t" || event.key === "T") {
        if (compactViewportRef.current) {
          setMobileMenuOpen((prev) => !prev);
        } else {
          setDesktopSidebarOpen((prev) => !prev);
        }
      }
    }
    window.addEventListener("keydown", onReaderKey);
    return () => window.removeEventListener("keydown", onReaderKey);
  }, [
    activePayload.nextChapter,
    activePayload.previousChapter,
    activePayload.story,
    bilingualActive,
    bilingualPrefs,
    goToPage,
    glossaryCharacters.length,
    isPageLayout,
    pageIndex,
    paragraphPages.length,
    router,
    spreadPageMode,
    tailNextChapter,
    visiblePageIndexes.length,
    setChapterSearchMode,
    setChapterSearchOpen,
    setChapterSearchQuery,
    setDesktopSidebarOpen,
    setFocusModeEnabled,
    setGlossaryDrawerOpen,
    setKeyboardHelpOpen,
    setMobileMenuOpen,
    setNotesSidebarOpen,
    toggleBookmark
  ]);

  function setReaderPerformanceMode(mode: ReaderPerformanceMode) {
    writeReaderPerformanceMode(mode);
    setPerformanceMode(mode);
    window.dispatchEvent(new Event("reader:performance-mode"));
    void saveReaderPreferencesOnServer({ performanceMode: mode });
  }

  function setFocusModeDefaultPreference(enabled: boolean) {
    writeReaderFocusModeDefault(enabled);
    setFocusModeDefault(enabled);
    void saveReaderPreferencesOnServer({ focusModeDefault: enabled });
  }

  const handleAudioPlaybackProgress = useCallback(
    (snapshot: { progressRatio: number }) => {
      if (!readAlongEnabled) {
        setAudioHighlightIndex(null);
        return;
      }
      const nextIndex = paragraphIndexForAudioProgress(paragraphAudioWeights, snapshot.progressRatio);
      setAudioHighlightIndex(nextIndex);
      if (lastAudioScrollIndexRef.current === nextIndex) return;
      lastAudioScrollIndexRef.current = nextIndex;
      if (!audioPanelOpen) return;
      if (isPageLayout) {
        const nextPage = pageIndexForParagraph(paragraphPages, nextIndex);
        if (nextPage !== pageIndex) goToPage(nextPage);
        return;
      }
      const node = paragraphContainerRef.current?.querySelector(`[data-paragraph-index="${nextIndex}"]`);
      node?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    },
    [audioPanelOpen, goToPage, isPageLayout, pageIndex, paragraphAudioWeights, paragraphPages, readAlongEnabled]
  );

  function paragraphClassName(index: number, bookmarked: boolean, hasNote: boolean) {
    const classes = ["reader-paragraph"];
    if (bilingualActive) classes.push("reader-paragraph-bilingual");
    if (bookmarked) classes.push("reader-paragraph-bookmarked");
    if (hasNote) classes.push("reader-paragraph-has-note");
    if (audioHighlightIndex === index) classes.push("reader-paragraph-audio-active");
    if (bilingualScrollHighlight && scrollFocusParagraphIndex === index) {
      classes.push("reader-paragraph-bilingual-focus");
    }
    if (bilingualRevealedIndexes.has(index)) classes.push("reader-paragraph-bilingual-revealed");
    return classes.join(" ");
  }

  function isBilingualSecondaryVisibleForIndex(index: number) {
    if (!bilingualActive) return false;
    if (bilingualSecondaryVisible) return true;
    return bilingualRevealedIndexes.has(index);
  }

  function toggleBilingualParagraphReveal(index: number) {
    if (!bilingualActive || !bilingualPairs[index]?.secondary?.text) return;
    setBilingualRevealedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function renderBilingualSecondary(index: number, options?: { measureHiddenSecondary?: boolean }) {
    const secondary = bilingualPairs[index]?.secondary;
    if (!secondary?.text) return null;
    const visible = options?.measureHiddenSecondary ? false : isBilingualSecondaryVisibleForIndex(index);
    return (
      <span
        className={`reader-paragraph-bilingual-secondary${visible ? "" : " reader-paragraph-bilingual-secondary-collapsed"}`}
        lang={secondary.lang}
        aria-hidden={!visible}
      >
        <span className="reader-paragraph-bilingual-lang" aria-hidden>
          {secondary.lang.toUpperCase()}
        </span>
        {secondary.text}
      </span>
    );
  }

  function renderParagraphBody(index: number, paragraph: string) {
    const text = renderParagraphText(index, paragraph);
    if (!bilingualActive) {
      return <span className="reader-paragraph-text">{text}</span>;
    }
    const secondary = bilingualPairs[index]?.secondary;
    const canReveal = Boolean(secondary?.text) && !bilingualSecondaryVisible;
    const primaryLang = bilingualPairs[index]?.primary.lang ?? "en";
    return (
      <span className="reader-paragraph-bilingual-pair">
        <span className="reader-paragraph-bilingual-primary" lang={primaryLang}>
          <span className="reader-paragraph-bilingual-lang" aria-hidden>
            {primaryLang.toUpperCase()}
          </span>
          {/* Keep plain .reader-paragraph-text for drop-cap / search / glossary spans */}
          <span className="reader-paragraph-text">{text}</span>
        </span>
        {canReveal ? (
          <button
            type="button"
            className="reader-paragraph-bilingual-reveal"
            aria-pressed={bilingualRevealedIndexes.has(index)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleBilingualParagraphReveal(index);
            }}
          >
            {bilingualRevealedIndexes.has(index) ? "Ẩn đối chiếu" : "Xem đối chiếu"}
          </button>
        ) : null}
        {renderBilingualSecondary(index)}
      </span>
    );
  }

  async function clearOfflineCacheForStory() {
    const { clearStoryOfflineCache } = await import("@/lib/offline-chapters");
    const removed = await clearStoryOfflineCache(activePayload.story.id);
    showSwipeNotice(removed > 0 ? `Đã xóa ${removed} chương offline` : "Không có cache offline để xóa");
  }

  function renderParagraphText(paragraphIndex: number, paragraph: string, chapterNumber = primaryChapterNumber) {
    if (chapterSearchQuery.trim()) {
      return renderParagraphSearchText(paragraph, chapterSearchQuery, activeChapterSearchMatch, chapterNumber, paragraphIndex);
    }
    return (
      <ReaderGlossaryInlineText
        text={paragraph}
        glossaryIndex={glossaryIndex}
        searchActive={false}
        onTermClick={(character) => setGlossaryTapCharacter(character)}
      />
    );
  }

  const applyVisibleChapter = useCallback((next: ReaderVisibleChapter) => {
    visibleChapterRef.current = next;
    activeParagraphIndexRef.current = next.paragraphIndex;

    if (
      bilingualScrollHighlightRef.current &&
      next.chapterNumber === activePayload.chapter.chapterNumber
    ) {
      setScrollFocusParagraphIndex((current) =>
        current === next.paragraphIndex ? current : next.paragraphIndex
      );
    }

    if (next.chapterNumber !== syncedReaderUrlChapterRef.current) {
      syncedReaderUrlChapterRef.current = next.chapterNumber;
      const href = storyHref(activePayload.story, next.chapterNumber);
      if (window.location.pathname !== new URL(href, window.location.origin).pathname) {
        window.history.replaceState(null, "", href);
      }
      setCommentsChapterId(next.chapterId);
    }

    if (
      shouldAutoPromotePrimaryChapter({
        continuousEnabled: continuousChapterEnabledRef.current,
        primaryChapterNumber: activePayload.chapter.chapterNumber,
        visibleChapterNumber: next.chapterNumber,
        inlineChapters: inlineChaptersRef.current,
        primarySectionBottomPx: paragraphContainerRef.current?.getBoundingClientRect().bottom ?? 0,
        viewportHeight: window.innerHeight,
        promoteInFlight: promoteInlineInFlightRef.current
      })
    ) {
      void promoteHeadInlineRef.current();
    }
  }, [activePayload.chapter.chapterNumber, activePayload.story]);

  const applyVisibleChapterRef = useRef(applyVisibleChapter);
  applyVisibleChapterRef.current = applyVisibleChapter;

  const syncVisibleChapterFromVirtualizer = useCallback(() => {
    const virtualizer = paragraphVirtualizerRef.current;
    const payload = activePayloadRef.current;
    if (!virtualizer) return;

    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;

    // First visible virtual row ≈ paragraph at top of reading zone.
    const best = items[Math.min(1, items.length - 1)] ?? items[0];

    if (lastVirtualVisibleParagraphRef.current === best.index) return;
    lastVirtualVisibleParagraphRef.current = best.index;

    applyVisibleChapterRef.current({
      chapterId: payload.chapter.id,
      chapterNumber: payload.chapter.chapterNumber,
      chapterTitle: payload.chapter.title,
      paragraphIndex: best.index
    });
  }, []);

  const syncVisibleChapterFromVirtualizerRef = useRef(syncVisibleChapterFromVirtualizer);
  syncVisibleChapterFromVirtualizerRef.current = syncVisibleChapterFromVirtualizer;

  useEffect(() => {
    function persistLocalPosition(scrollY: number) {
      const visible = visibleChapterRef.current;
      const scroll = Math.round(scrollY);
      const paragraph = visible.paragraphIndex;
      const last = lastSavedLocalPositionRef.current;
      if (
        last &&
        last.chapter === visible.chapterNumber &&
        last.scroll === scroll &&
        last.paragraph === paragraph
      ) {
        return;
      }
      window.localStorage.setItem(
        readerScrollPositionKey(activePayload.story.id, visible.chapterNumber),
        String(scroll)
      );
      window.localStorage.setItem(
        readerParagraphPositionKey(activePayload.story.id, visible.chapterNumber),
        String(paragraph)
      );
      lastSavedLocalPositionRef.current = {
        scroll,
        paragraph,
        chapter: visible.chapterNumber
      };
    }

    function persistProgress(scrollY: number, currentProgress: number, syncRemote: boolean) {
      const visible = visibleChapterRef.current;
      const progressBucket = Math.floor(currentProgress / 4);
      const lastPersisted = lastPersistedHistoryRef.current;
      const historyChanged =
        !lastPersisted ||
        lastPersisted.chapterNumber !== visible.chapterNumber ||
        lastPersisted.paragraphIndex !== visible.paragraphIndex ||
        lastPersisted.progressBucket !== progressBucket;

      const item = {
        storyId: activePayload.story.id,
        storyTitle: activePayload.story.title,
        coverImageUrl: activePayload.story.coverImageUrl,
        chapterId: visible.chapterId,
        chapterNumber: visible.chapterNumber,
        chapterTitle: visible.chapterTitle,
        scrollPosition: Math.round(scrollY),
        paragraphIndex: visible.paragraphIndex,
        progressPercent: Math.round(currentProgress * 100) / 100,
        maxReadChapterNumber: Math.max(activePayload.chapter.chapterNumber, visible.chapterNumber),
        totalChapters: activePayload.story.totalChapters,
        lastReadAt: new Date().toISOString()
      };

      persistLocalPosition(scrollY);

      if (!historyChanged) return;

      lastPersistedHistoryRef.current = {
        chapterNumber: visible.chapterNumber,
        paragraphIndex: visible.paragraphIndex,
        progressBucket
      };

      dispatch(upsertHistoryItem(item));
      dispatch(recordDailyRead(new Date().toISOString().slice(0, 10))); // "YYYY-MM-DD"

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
        if (isPageLayout) return;
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
        const tailNextChapter = resolveTailNextChapter(inlineChaptersRef.current, activePayload.nextChapter);
        const shouldShowContinue = Boolean(tailNextChapter) && (current >= 92 || contentProgress >= 92 || nearPageEnd);
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
          // Desktop: DOM class toggle below is enough — setState re-renders the whole reader on scroll.
          if (isCompactViewport) setShowScrollTop(shouldShowScrollTop);
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
          if (headingEtaLabelRef.current) {
            const nextMinutesLeft = Math.max(0, Math.ceil(totalReadingMinutes * (1 - roundedProgress / 100)));
            headingEtaLabelRef.current.textContent = nextMinutesLeft > 0 ? ` · còn ~${nextMinutesLeft} phút` : "";
            headingEtaLabelRef.current.hidden = nextMinutesLeft <= 0;
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
            // Desktop: keep progress in refs/DOM/CSS only while scrolling. setState here was
            // re-rendering the whole reader + re-triggering chapter-list anime (flash).
            if (isCompactViewport) setMobileProgress(roundedProgress);
            else readerShellRef.current?.style.setProperty("--reader-dock-progress", String(roundedProgress));
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
            }
            // Sync React consumers only after scroll settles. Desktop keeps progress in refs/CSS
            // to avoid re-rendering the reader + WebGL progress bar while scrolling.
            if (compactViewportRef.current) {
              setMobileProgress(latestProgress);
            } else {
              readerShellRef.current?.style.setProperty("--reader-dock-progress", String(latestProgress));
            }
          }, isCompactViewport ? 360 : 480);
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
          // Desktop FAB visibility is driven via continueButtonRef below; skip setState while scrolling.
          if (isCompactViewport) {
            setShowContinuePrompt(shouldShowContinue);
            setHighlightContinuePrompt(shouldHighlightContinue);
          }
          const navCard = navCardNextRef.current;
          if (navCard) {
            navCard.classList.toggle("nav-card-next-active", shouldHighlightContinue);
          }
        }

        if (shouldVirtualizeParagraphsRef.current) {
          syncVisibleChapterFromVirtualizerRef.current();
        }

        if (
          continuousChapterEnabledRef.current &&
          !isPageLayout &&
          shouldShowContinue &&
          scrollingDown &&
          !continuousChapterTriggeredRef.current &&
          tailNextChapter
        ) {
          continuousChapterTriggeredRef.current = true;
          appendInlineNextChapterRef.current();
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
            readerShellRef.current?.classList.toggle("reader-shell-chrome-hidden", nextHidden);
          }
        } else if (readerChromeHiddenRef.current) {
          readerChromeHiddenRef.current = false;
          readerShellRef.current?.classList.remove("reader-shell-chrome-hidden");
        }
        lastScrollTopRef.current = Math.max(0, scrollTop);

        const localPersistInterval = isCompactViewport ? MOBILE_LOCAL_POSITION_PERSIST_MS : DESKTOP_LOCAL_POSITION_PERSIST_MS;
        if (now - lastLocalPersistRef.current > localPersistInterval) {
          persistLocalPosition(scrollTop);
          lastLocalPersistRef.current = now;
        }

        const historyPersistInterval = isCompactViewport ? MOBILE_HISTORY_PERSIST_MS : DESKTOP_HISTORY_PERSIST_MS;
        if (now - lastHistoryPersistRef.current > historyPersistInterval) {
          const remotePersistInterval = isCompactViewport ? MOBILE_REMOTE_PROGRESS_PERSIST_MS : DESKTOP_REMOTE_PROGRESS_PERSIST_MS;
          const shouldSyncRemote = now - lastRemotePersistRef.current > remotePersistInterval;
          persistProgress(scrollTop, current, shouldSyncRemote);
          lastHistoryPersistRef.current = now;
          if (shouldSyncRemote) lastRemotePersistRef.current = now;
        }
      });
    };

    function flushProgressForUnload() {
      if (isPageLayout) return;
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      const scrollTop = scrollingElement.scrollTop || window.scrollY || 0;
      const now = Date.now();
      // Always keep cheap local keys fresh for reload.
      persistLocalPosition(scrollTop);
      lastLocalPersistRef.current = now;
      // Avoid Redux/network storms when iOS fires hide/show rapidly.
      if (now - lastHistoryPersistRef.current < 800) return;
      persistProgress(scrollTop, progressRef.current, true);
      lastHistoryPersistRef.current = now;
      lastRemotePersistRef.current = now;
    }

    const onVisibilityHidden = () => {
      if (document.visibilityState === "hidden") flushProgressForUnload();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Mobile hard-reload / tab switch often skips React cleanup — flush position here.
    window.addEventListener("pagehide", flushProgressForUnload);
    document.addEventListener("visibilitychange", onVisibilityHidden);
    return () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      if (mobileProgressIdleTimerRef.current) {
        window.clearTimeout(mobileProgressIdleTimerRef.current);
        mobileProgressIdleTimerRef.current = null;
      }
      flushProgressForUnload();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flushProgressForUnload);
      document.removeEventListener("visibilitychange", onVisibilityHidden);
    };
  }, [
    activePayload.chapter,
    activePayload.nextChapter,
    activePayload.story,
    audioPanelOpen,
    dispatch,
    isPageLayout,
    mobileMenuOpenRef,
    mobileSheetOpenRef,
    paragraphPositionKey,
    queryClient,
    storageKey,
    totalReadingMinutes
  ]);

  useEffect(() => {
    if (!isPageLayout) return;
    const pageProgress = paragraphPages.length > 0 ? ((pageIndex + 1) / paragraphPages.length) * 100 : 0;
    progressRef.current = pageProgress;
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${pageProgress / 100})`;
    }
    const rounded = Math.round(pageProgress);
    mobileProgressRef.current = rounded;
    setMobileProgress(rounded);
    setSheetProgress(rounded);
    const shouldShowContinue = Boolean(activePayload.nextChapter) && pageIndex >= paragraphPages.length - 1;
    showContinuePromptRef.current = shouldShowContinue;
    setShowContinuePrompt(shouldShowContinue);
  }, [activePayload.nextChapter, isPageLayout, pageIndex, paragraphPages.length]);

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
    if (headingEtaLabelRef.current) {
      const nextMinutesLeft = Math.max(0, Math.ceil(totalReadingMinutes * (1 - currentProgress / 100)));
      headingEtaLabelRef.current.textContent = nextMinutesLeft > 0 ? ` · còn ~${nextMinutesLeft} phút` : "";
      headingEtaLabelRef.current.hidden = nextMinutesLeft <= 0;
    }
  });

  useLayoutEffect(() => {
    readerShellRef.current?.classList.toggle("reader-shell-chrome-hidden", readerChromeHiddenRef.current);
  });

  useLayoutEffect(() => {
    readerShellRef.current?.style.setProperty("--reader-dock-progress", String(mobileProgressRef.current));
  }, [mobileProgress]);

  useEffect(() => {
    const button = scrollTopButtonRef.current;
    if (!button || compactReader || prefersReducedMotion() || !animeRef.current) return;

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

  // Track active paragraph + visible chapter (primary or inline-appended).
  useEffect(() => {
    bilingualScrollHighlightRef.current = bilingualScrollHighlight;
    if (!bilingualScrollHighlight) setScrollFocusParagraphIndex(null);
  }, [bilingualScrollHighlight]);

  useEffect(() => {
    // Virtualized chapters track visible paragraph via scroll + virtualizer (see onScroll).
    if (shouldVirtualizeParagraphs) return;

    const article = document.querySelector(".reader-article");
    if (!article) return;

    const fallback: ReaderVisibleChapter = {
      chapterId: activePayload.chapter.id,
      chapterNumber: activePayload.chapter.chapterNumber,
      chapterTitle: activePayload.chapter.title,
      paragraphIndex: 0
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const best = pickBestVisibleParagraphEntry(entries);
        if (!best) return;

        const next = readVisibleChapterFromParagraph(best.target as HTMLElement, fallback);
        if (!next) return;

        applyVisibleChapterRef.current(next);
      },
      { rootMargin: "-33% 0px -63% 0px", threshold: [0, 0.2, 0.45, 0.7, 1] }
    );

    article.querySelectorAll<HTMLElement>("[data-paragraph-index][data-chapter-number]").forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [
    shouldVirtualizeParagraphs,
    activePayload.chapter.chapterNumber,
    activePayload.chapter.id,
    activePayload.chapter.title,
    activePayload.story,
    inlineChapters.length,
    paragraphs.length
  ]);

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
      const scrollEl = mobileSheetScrollRef.current;
      if (!scrollEl || !scrollEl.contains(details)) return;

      const scrollRect = scrollEl.getBoundingClientRect();
      const detailsRect = details.getBoundingClientRect();
      const bottomPadding = 22;

      if (detailsRect.bottom > scrollRect.bottom - bottomPadding || detailsRect.top < scrollRect.top) {
        details.scrollIntoView({
          block: "nearest",
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
      }
    });
  }

  function scrollToParagraph(paragraphIndex: number, behavior: ScrollBehavior = "smooth", chapterNumber = primaryChapterNumber) {
    if (shouldVirtualizeParagraphs && chapterNumber === primaryChapterNumber) {
      if (paragraphs.length === 0 || paragraphIndex < 0 || paragraphIndex >= paragraphs.length) return false;
      paragraphVirtualizer.scrollToIndex(paragraphIndex, {
        align: "center",
        behavior: prefersReducedMotion() ? "auto" : behavior
      });
      return true;
    }
    const paragraph = paragraphContainerRef.current?.querySelector<HTMLElement>(
      `[data-chapter-number="${chapterNumber}"][data-paragraph-index="${paragraphIndex}"]`
    );
    if (!paragraph) return false;
    paragraph.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : behavior
    });
    return true;
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
      y,
      glossaryCharacter: lookupGlossarySelection(selectedText, glossaryIndex)
    };
  }

  function applyComfortPreset(presetKey: keyof typeof READER_COMFORT_PRESETS) {
    const preset = READER_COMFORT_PRESETS[presetKey];
    dispatch(
      setReaderStyle(
        sanitizeReaderStyleConfig({
          ...store.getState().readerStyle.config,
          ...preset.config
        })
      )
    );
    if (presetKey === "focus" || presetKey === "ban_dem") setFocusModeEnabled(true);
    if (presetKey === "ban_dem") {
      setReaderDimEnabled(true);
      setReaderDimLevel(clampDimLevel(0.28));
      if (wakeLockActive) void toggleWakeLock();
    }
    if (presetKey === "mobile") {
      setReaderDimEnabled(false);
      setFocusModeEnabled(false);
    }
    setMobileSheetOpen(false);
  }

  function toggleContinuousChapter() {
    const next = !continuousChapterEnabled;
    setContinuousChapterEnabled(next);
    writeReaderContinuousChapter(next);
    continuousChapterTriggeredRef.current = false;
    if (!next) setInlineChapters([]);
    showSwipeNotice(next ? "Cuộn liên tục: nối chương trong trang" : "Đã tắt cuộn liên tục");
  }

  function toggleCommentsSplit() {
    setCommentsSplitOpen((current) => {
      const next = !current;
      writeReaderCommentsSplit(next);
      if (next) setNotesSidebarOpen(false);
      showSwipeNotice(next ? "Luận đạo cạnh nội dung" : "Luận đạo dưới chương");
      return next;
    });
  }

  function togglePageColumns() {
    if (!isPageLayout || compactReader) return;
    const next: ReaderPageColumns = pageColumns === 2 ? 1 : 2;
    setPageColumns(next);
    writeReaderPageColumns(next);
    showSwipeNotice(next === 2 ? "Hai cột trang" : "Một cột trang");
  }

  function jumpStorySearchHit(direction: "previous" | "next") {
    if (storySearchHits.length === 0) return;
    setStorySearchHitIndex((current) => {
      if (direction === "next") return (current + 1) % storySearchHits.length;
      return (current - 1 + storySearchHits.length) % storySearchHits.length;
    });
  }

  async function navigateToStorySearchHit(hit: StoryContentSearchHit) {
    writeResumeNavigationTarget(activePayload.story.id, hit.chapterNumber, { paragraphIndex: hit.paragraphIndex });
    setChapterSearchOpen(false);
    setChapterSearchQuery("");
    if (hit.chapterNumber === activePayload.chapter.chapterNumber) {
      window.requestAnimationFrame(() => scrollToParagraph(hit.paragraphIndex, "smooth", hit.chapterNumber));
      return;
    }
    if (inlineChapters.some((block) => block.chapterNumber === hit.chapterNumber)) {
      window.requestAnimationFrame(() => scrollToParagraph(hit.paragraphIndex, "smooth", hit.chapterNumber));
      return;
    }
    await openCachedChapter(hit.chapterNumber);
    window.localStorage.setItem(`${READER_PARAGRAPH_POSITION_PREFIX}:${activePayload.story.id}:${hit.chapterNumber}`, String(hit.paragraphIndex));
  }

  function jumpBackToReadingPosition() {
    if (!jumpBackTarget) return;
    if (isPageLayout) {
      goToPage(pageIndexForParagraph(paragraphPages, jumpBackTarget.paragraphIndex));
    } else if (jumpBackTarget.paragraphIndex > 0) {
      scrollToParagraph(jumpBackTarget.paragraphIndex, prefersReducedMotion() ? "auto" : "smooth");
    } else {
      window.scrollTo({ top: jumpBackTarget.scrollY, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
    setJumpBackTarget(null);
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

  function resetReaderSettings() {
    dispatch(setReaderStyle(DEFAULT_READER_STYLE_CONFIG));
    setReaderDimEnabled(false);
    setFocusModeEnabled(false);
    stopAutoScroll();
    setReaderOverflowOpen(false);
    setMobileSheetOpen(false);
    showSwipeNotice("Đã về cài đặt mặc định");
  }

  function maybeShowContentSelectionActions() {
    if (adminEdit) return;
    if (Date.now() < suppressSelectionActionUntilRef.current) return;
    const content = activePayload.chapter.content ?? paragraphs.join("\n\n");
    const action = selectedContentAction(content);
    if (!action) {
      setSelectionAction(null);
      return;
    }

    if (isMobile || compactViewportRef.current) {
      setSelectionAction({
        ...action,
        x: window.innerWidth / 2,
        y: Math.min(window.innerHeight - 96, Math.max(72, action.y))
      });
      return;
    }

    setSelectionAction(action);
  }

  async function copySelectedContent() {
    if (!selectionAction?.text) return;
    try {
      await navigator.clipboard.writeText(selectionAction.text);
      setSwipeNotice("Đã sao chép đoạn chọn");
    } catch {
      setSwipeNotice("Không sao chép được đoạn chọn");
    }
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
  }

  function resolveSelectionParagraphContext(): {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    paragraphIndex: number;
  } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.anchorNode;
    const element = node instanceof Element ? node : node?.parentElement;
    const paragraphEl = element?.closest("[data-paragraph-index]") as HTMLElement | null;
    if (!paragraphEl) return null;
    const paragraphIndex = Number(paragraphEl.getAttribute("data-paragraph-index"));
    if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0) return null;
    const chapterNumberAttr = paragraphEl.getAttribute("data-chapter-number");
    const chapterNumber = chapterNumberAttr != null ? Number(chapterNumberAttr) : primaryChapterNumber;
    const chapterId = paragraphEl.getAttribute("data-chapter-id") || activePayload.chapter.id;
    const chapterTitle = paragraphEl.getAttribute("data-chapter-title") || activePayload.chapter.title;
    if (!Number.isInteger(chapterNumber)) return null;
    return { chapterId, chapterNumber, chapterTitle, paragraphIndex };
  }

  function saveSelectedPhrase() {
    if (!selectionAction?.text) return;
    const phrase = clipPhrase(selectionAction.text);
    if (!phrase) {
      showSwipeNotice("Chọn cụm từ / câu trước đã");
      return;
    }
    const context = resolveSelectionParagraphContext();
    const chapterId = context?.chapterId ?? activePayload.chapter.id;
    const chapterNumber = context?.chapterNumber ?? primaryChapterNumber;
    const chapterTitle = context?.chapterTitle ?? activePayload.chapter.title;
    const paragraphIndex = context?.paragraphIndex ?? 0;
    const pairedText =
      bilingualActive && chapterNumber === primaryChapterNumber
        ? clipPairedText(bilingualPairs[paragraphIndex]?.secondary?.text)
        : null;
    const draft: ReaderPhraseNote = {
      id: createPhraseNoteId(activePayload.story.id, chapterNumber, paragraphIndex, phrase),
      storyId: activePayload.story.id,
      chapterId,
      chapterNumber,
      chapterTitle,
      paragraphIndex,
      phrase,
      pairedText,
      note: null,
      createdAt: new Date().toISOString()
    };
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
    setPhraseNoteEditor(draft);
  }

  function openLookupFromSelection() {
    if (!selectionAction?.text) return;
    const normalized = normalizeLookupQuery(selectionAction.text);
    if (!normalized) {
      showSwipeNotice("Chọn từ hoặc cụm ngắn để tra");
      return;
    }
    const context = resolveSelectionParagraphContext();
    const chapterId = context?.chapterId ?? activePayload.chapter.id;
    const chapterNumber = context?.chapterNumber ?? primaryChapterNumber;
    const chapterTitle = context?.chapterTitle ?? activePayload.chapter.title;
    const paragraphIndex = context?.paragraphIndex ?? 0;
    const paragraphText =
      chapterNumber === primaryChapterNumber
        ? paragraphs[paragraphIndex] ?? ""
        : inlineChapters.find((block) => block.chapterNumber === chapterNumber)?.paragraphs[paragraphIndex] ?? "";
    const contextEnglish = extractLookupContextSentence(paragraphText, normalized.query);
    const pairedText =
      bilingualActive && chapterNumber === primaryChapterNumber
        ? clipPairedText(bilingualPairs[paragraphIndex]?.secondary?.text)
        : null;
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
    setLookupRequest({
      query: normalized.query,
      contextEnglish,
      contextPaired: pairedText,
      chapterId,
      chapterNumber,
      chapterTitle,
      paragraphIndex
    });
  }

  function savePhraseFromLookup(payload: { phrase: string; pairedText: string | null }) {
    const phrase = clipPhrase(payload.phrase);
    if (!phrase) return;
    const chapterId = lookupRequest?.chapterId ?? activePayload.chapter.id;
    const chapterNumber = lookupRequest?.chapterNumber ?? primaryChapterNumber;
    const chapterTitle = lookupRequest?.chapterTitle ?? activePayload.chapter.title;
    const paragraphIndex = lookupRequest?.paragraphIndex ?? 0;
    const draft: ReaderPhraseNote = {
      id: createPhraseNoteId(activePayload.story.id, chapterNumber, paragraphIndex, phrase),
      storyId: activePayload.story.id,
      chapterId,
      chapterNumber,
      chapterTitle,
      paragraphIndex,
      phrase,
      pairedText: clipPairedText(payload.pairedText),
      note: null,
      createdAt: new Date().toISOString()
    };
    setLookupRequest(null);
    setPhraseNoteEditor(draft);
  }

  function persistPhraseNote(note: ReaderPhraseNote) {
    const next = upsertPhraseNote(phraseNotes, note);
    setPhraseNotes(next);
    writePhraseNotes(next);
  }

  function savePhraseNoteEditor() {
    if (!phraseNoteEditor) return;
    const noteText = phraseNoteEditor.note?.trim() ? phraseNoteEditor.note.trim() : null;
    persistPhraseNote({
      ...phraseNoteEditor,
      note: noteText,
      updatedAt: new Date().toISOString()
    });
    setPhraseNoteEditor(null);
    showSwipeNotice("Đã lưu cụm từ");
  }

  function deleteStoryPhraseNote(note: ReaderPhraseNote) {
    const next = removePhraseNote(phraseNotes, note.id);
    setPhraseNotes(next);
    writePhraseNotes(next);
    showSwipeNotice("Đã xóa cụm từ");
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
      const refreshed = await fetchReaderChapter(
        activePayload.story.id,
        activePayload.chapter.chapterNumber,
        bilingualQueryOptions
      );
      queryClient.setQueryData(
        readerQueryKeys.chapter(activePayload.story.id, activePayload.chapter.chapterNumber, bilingualQueryOptions),
        refreshed
      );
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

  async function shareSelectedContent() {
    if (!selectionAction?.text) return;
    try {
      const result = await shareSelectedQuote({
        quote: selectionAction.text,
        storyTitle: activePayload.story.title,
        chapterTitle: activePayload.chapter.title,
        chapterNumber: activePayload.chapter.chapterNumber,
        storyPath: storyHref(activePayload.story, activePayload.chapter.chapterNumber)
      });
      setSwipeNotice(result === "shared" ? "Đã chia sẻ trích đoạn" : "Đã sao chép trích đoạn");
    } catch {
      setSwipeNotice("Không chia sẻ được trích đoạn");
    }
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
  }

  async function shareSelectedContentAsImage() {
    if (!selectionAction?.text) return;
    try {
      const blob = await renderQuoteShareImage({
        quote: selectionAction.text,
        storyTitle: activePayload.story.title,
        chapterTitle: activePayload.chapter.title ?? "",
        chapterNumber: activePayload.chapter.chapterNumber
      });
      const result = await shareQuoteImage(
        blob,
        `trich-doan-${activePayload.story.id}-ch${activePayload.chapter.chapterNumber}.png`,
        activePayload.story.title
      );
      setSwipeNotice(result === "shared" ? "Đã chia sẻ ảnh trích đoạn" : "Đã tải ảnh trích đoạn");
    } catch {
      setSwipeNotice("Không tạo được ảnh trích đoạn");
    }
    setSelectionAction(null);
    window.getSelection()?.removeAllRanges();
  }

  function dismissResumeBanner() {
    dismissResumeHint(activePayload.story.id, activePayload.chapter.chapterNumber);
    setShowResumeBanner(false);
  }

  function continueFromResume() {
    const historyItem = store.getState().history.items.find((item) => item.storyId === activePayload.story.id);
    const localScroll = Number(window.localStorage.getItem(storageKey));
    const savedScroll =
      Number.isFinite(localScroll) && localScroll > 0
        ? localScroll
        : historyItem?.chapterNumber === activePayload.chapter.chapterNumber
          ? historyItem.scrollPosition
          : 0;
    const paragraphTarget =
      resumeHint?.paragraphIndex != null && resumeHint.paragraphIndex > 0
        ? resumeHint.paragraphIndex
        : Number(window.localStorage.getItem(paragraphPositionKey));

    if (Number.isInteger(paragraphTarget) && paragraphTarget > 0) {
      scheduleUntil(() => scrollToParagraph(paragraphTarget, "auto"));
    } else if (savedScroll > 0) {
      schedulePageScrollRestore(savedScroll);
    }

    dismissResumeBanner();
  }

  function renderParagraphTools(
    index: number,
    paragraph: string,
    bookmarked: boolean,
    chapter = {
      id: activePayload.chapter.id,
      number: primaryChapterNumber,
      title: activePayload.chapter.title
    }
  ) {
    const chapterBookmarks = paragraphBookmarksForChapter(chapter.number);
    const hasNote = Boolean(chapterBookmarks.find((item) => item.paragraphIndex === index)?.note);
    return (
      <>
        <button
          className="paragraph-bookmark-button"
          type="button"
          aria-label={bookmarked ? "Bỏ dấu đoạn" : "Đánh dấu đoạn"}
          title={bookmarked ? "Bỏ dấu đoạn" : "Đánh dấu đoạn"}
          onClick={() =>
            toggleParagraphBookmark({
              chapterId: chapter.id,
              chapterNumber: chapter.number,
              chapterTitle: chapter.title,
              paragraphIndex: index,
              paragraph
            })
          }
        >
          {bookmarked ? <BookMarked size={13} /> : <Highlighter size={13} />}
        </button>
        {bookmarked ? (
          <button
            className={`paragraph-note-button ${hasNote ? "paragraph-note-button-active" : ""}`}
            type="button"
            aria-label="Ghi chú đoạn"
            title={hasNote ? "Sửa ghi chú đoạn" : "Thêm ghi chú đoạn"}
            onClick={() => openParagraphNoteEditor(chapter.number, index)}
          >
            <StickyNote size={13} />
          </button>
        ) : null}
      </>
    );
  }

  useEffect(() => {
    continuousChapterEnabledRef.current = continuousChapterEnabled;
  }, [continuousChapterEnabled]);

  useEffect(() => {
    setStorySearchHitIndex(0);
  }, [chapterSearchQuery, chapterSearchMode, activePayload.chapter.id]);

  useEffect(() => {
    const panelOpen = mobileMenuOpen || desktopSidebarOpen;
    if (panelOpen) {
      if (!panelScrollAnchorRef.current) {
        panelScrollAnchorRef.current = {
          scrollY: window.scrollY,
          paragraphIndex: activeParagraphIndexRef.current
        };
      }
      return;
    }

    const anchor = panelScrollAnchorRef.current;
    panelScrollAnchorRef.current = null;
    if (!anchor) return;

    const scrollDelta = Math.abs(window.scrollY - anchor.scrollY);
    const paragraphMoved = activeParagraphIndexRef.current !== anchor.paragraphIndex;
    if (scrollDelta > 420 || paragraphMoved) {
      setJumpBackTarget(anchor);
    }
  }, [desktopSidebarOpen, mobileMenuOpen]);

  useEffect(() => {
    if (!isPageLayout && pageColumns === 2) {
      setPageColumns(1);
      writeReaderPageColumns(1);
    }
  }, [isPageLayout, pageColumns]);

  useEffect(() => {
    if (!isPageLayout || !commentsSplitOpen) return;
    setCommentsSplitOpen(false);
    writeReaderCommentsSplit(false);
  }, [isPageLayout, commentsSplitOpen]);

  async function resolveChapterPayload(chapterNumber: number) {
    const queryPayload = queryClient.getQueryData<ReaderPayload>(
      readerQueryKeys.chapter(activePayload.story.id, chapterNumber, bilingualQueryOptions)
    );
    if (queryPayload) return queryPayload;

    const cachedPayloadFromDisk = await readCachedChapterPayload(activePayload.story.id, chapterNumber);
    if (cachedPayloadFromDisk) return cachedPayloadFromDisk;

    return queryClient
      .fetchQuery({
        queryKey: readerQueryKeys.chapter(activePayload.story.id, chapterNumber, bilingualQueryOptions),
        queryFn: () => fetchReaderChapter(activePayload.story.id, chapterNumber, bilingualQueryOptions),
        staleTime: 1000 * 60 * 8
      })
      .catch(() => null);
  }

  const reloadChapterWithBilingual = useCallback(
    async (prefs: ReaderBilingualPrefs, chapterNumber = payload.chapter.chapterNumber) => {
      if (!supportsBilingualReader(payload.story.sourceCode)) {
        setCachedPayload(null);
        return;
      }
      const options = bilingualFetchOptions(prefs);
      if (!options) {
        setCachedPayload(null);
        return;
      }
      try {
        const refreshed = await fetchReaderChapter(payload.story.id, chapterNumber, options);
        queryClient.setQueryData(readerQueryKeys.chapter(payload.story.id, chapterNumber, options), refreshed);
        setCachedPayload(refreshed);
      } catch {
        setSwipeNotice("Không tải được chương song ngữ");
      }
    },
    [payload.chapter.chapterNumber, payload.story.id, payload.story.sourceCode, queryClient]
  );

  const handleBilingualPrefsChange = useCallback((next: ReaderBilingualPrefs) => {
    setBilingualPrefs(next);
    writeReaderBilingualPrefs(next);
  }, []);

  const openBilingualSettingsSheet = useCallback(() => {
    setMobileSheetTab("settings");
    setMobileSheetOpen(true);
  }, [setMobileSheetOpen, setMobileSheetTab]);

  const toggleBilingualQuick = useCallback(() => {
    if (!supportsBilingual) return;
    if (bilingualPrefs.enabled) {
      handleBilingualPrefsChange({ ...bilingualPrefs, enabled: false });
      return;
    }
    handleBilingualPrefsChange(learnEnglishPreset());
  }, [supportsBilingual, bilingualPrefs, handleBilingualPrefsChange]);

  useEffect(() => {
    if (!supportsBilingualReader(payload.story.sourceCode) || !bilingualPrefs.enabled) {
      if (!bilingualPrefs.enabled) setCachedPayload(null);
      return;
    }
    void reloadChapterWithBilingual(bilingualPrefs, payload.chapter.chapterNumber);
  }, [
    payload.chapter.chapterNumber,
    payload.story.id,
    payload.story.sourceCode,
    bilingualPrefs,
    reloadChapterWithBilingual,
  ]);

  async function promoteHeadInlineToPrimary() {
    if (promoteInlineInFlightRef.current) return false;
    const inline = inlineChaptersRef.current;
    const head = inline[0];
    if (!head) return false;

    promoteInlineInFlightRef.current = true;
    try {
      const primaryHeight = paragraphContainerRef.current?.offsetHeight ?? 0;
      const headPayload = await resolveChapterPayload(head.chapterNumber);
      if (!headPayload) return false;

      skipInlineClearRef.current = true;
      setCachedPayload(headPayload);
      setInlineChapters(inlineBlocksAfterHeadPromotion(inline));
      queryClient.setQueryData(
        readerQueryKeys.chapter(headPayload.story.id, headPayload.chapter.chapterNumber),
        headPayload
      );
      syncedReaderUrlChapterRef.current = head.chapterNumber;
      window.history.replaceState(null, "", storyHref(headPayload.story, head.chapterNumber));

      if (primaryHeight > 0) {
        window.scrollBy({ top: -primaryHeight, behavior: "auto" });
      }

      continuousChapterTriggeredRef.current = false;
      showSwipeNotice(`Chương ${head.chapterNumber}`, 900);
      return true;
    } finally {
      promoteInlineInFlightRef.current = false;
    }
  }
  promoteHeadInlineRef.current = () => promoteHeadInlineToPrimary();

  async function openNextChapterFast() {
    const tailNextChapter = resolveTailNextChapter(inlineChaptersRef.current, activePayload.nextChapter);
    const nextChapter = tailNextChapter;
    if (!nextChapter) return;
    setInlineChapters([]);
    setChapterTransitionDirection("next");
    setChapterTransitionTrigger((t) => t + 1);
    markChapterListNavigation(nextChapter.chapterNumber);

    const queryPayload = queryClient.getQueryData<ReaderPayload>(readerQueryKeys.chapter(activePayload.story.id, nextChapter.chapterNumber));
    const cachedPayloadFromDisk = queryPayload ? null : await readCachedChapterPayload(activePayload.story.id, nextChapter.chapterNumber);
    const nextPayload = queryPayload ?? cachedPayloadFromDisk;

    if (nextPayload) {
      setCachedPayload(nextPayload);
      queryClient.setQueryData(readerQueryKeys.chapter(nextPayload.story.id, nextPayload.chapter.chapterNumber), nextPayload);
      window.history.replaceState(null, "", storyHref(nextPayload.story, nextPayload.chapter.chapterNumber));
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    router.push(storyHref(activePayload.story, nextChapter.chapterNumber));
  }
  openNextChapterFastRef.current = () => {
    void openNextChapterFast();
  };

  async function appendInlineNextChapter() {
    if (inlineAppendInFlightRef.current) return;
    if (!canAppendInlineChapter(inlineChaptersRef.current.length)) {
      const promoted = await promoteHeadInlineToPrimary();
      if (!promoted) {
        openNextChapterFastRef.current();
        return;
      }
    }

    const nextSummary = resolveTailNextChapter(inlineChaptersRef.current, activePayload.nextChapter);
    if (!nextSummary) {
      continuousChapterTriggeredRef.current = false;
      return;
    }

    inlineAppendInFlightRef.current = true;
    try {
      const queryPayload = queryClient.getQueryData<ReaderPayload>(
        readerQueryKeys.chapter(activePayload.story.id, nextSummary.chapterNumber)
      );
      const cachedPayloadFromDisk = queryPayload
        ? null
        : await readCachedChapterPayload(activePayload.story.id, nextSummary.chapterNumber);
      let nextPayload = queryPayload ?? cachedPayloadFromDisk ?? null;
      if (!nextPayload) {
        nextPayload = await resolveChapterPayload(nextSummary.chapterNumber);
      }
      if (!nextPayload) {
        continuousChapterTriggeredRef.current = false;
        openNextChapterFastRef.current();
        return;
      }

      const block: InlineChapterBlock = {
        chapterId: nextPayload.chapter.id,
        chapterNumber: nextPayload.chapter.chapterNumber,
        title: nextPayload.chapter.title,
        paragraphs: chapterContentToParagraphs(nextPayload.chapter),
        nextChapter: nextPayload.nextChapter
      };

      queryClient.setQueryData(
        readerQueryKeys.chapter(nextPayload.story.id, nextPayload.chapter.chapterNumber),
        nextPayload
      );
      setInlineChapters((current) => [...current, block]);
      continuousChapterTriggeredRef.current = false;
      showSwipeNotice(`Chương ${block.chapterNumber}`, 900);
    } catch {
      continuousChapterTriggeredRef.current = false;
      openNextChapterFastRef.current();
    } finally {
      inlineAppendInFlightRef.current = false;
    }
  }
  appendInlineNextChapterRef.current = () => {
    void appendInlineNextChapter();
  };

  async function openCachedChapter(chapterNumber: number) {
    const queryPayload = queryClient.getQueryData<ReaderPayload>(readerQueryKeys.chapter(activePayload.story.id, chapterNumber));
    const cachedPayloadFromDisk = queryPayload ? null : await readCachedChapterPayload(activePayload.story.id, chapterNumber);
    const nextPayload = queryPayload ?? cachedPayloadFromDisk;
    if (!nextPayload) return;
    setCachedPayload(nextPayload);
    setInlineChapters([]);
    setMobileSheetOpen(false);
    setMobileMenuOpen(false);
    queryClient.setQueryData(readerQueryKeys.chapter(nextPayload.story.id, nextPayload.chapter.chapterNumber), nextPayload);
    window.history.replaceState(null, "", storyHref(nextPayload.story, chapterNumber));
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function showSwipeNotice(message: string, durationMs = 1100) {
    setSwipeNotice(message);
    if (swipeNoticeTimerRef.current) {
      window.clearTimeout(swipeNoticeTimerRef.current);
    }
    swipeNoticeTimerRef.current = window.setTimeout(() => {
      setSwipeNotice(null);
      swipeNoticeTimerRef.current = null;
    }, durationMs);
  }

  function toggleReaderSkillEffects() {
    dispatch(setReaderSkillEffectsEnabled(!skillEffectsEnabled));
  }

  function toggleTapEdgeNavigation() {
    dispatch(setReaderTapEdgeEnabled(!tapEdgeEnabled));
  }

  function toggleLayoutMode(nextMode?: ReaderLayoutMode) {
    const mode = nextMode ?? (layoutMode === "page" ? "scroll" : "page");
    dispatch(setReaderLayoutMode(mode));
    if (mode === "page") {
      stopAutoScroll();
      setPageIndex(0);
    }
  }

  function handleTapEdgeNav(direction: "previous" | "next") {
    if (isPageLayout) {
      const step = spreadPageMode ? 2 : 1;
      if (direction === "next") {
        if (pageIndex < paragraphPages.length - (spreadPageMode && visiblePageIndexes.length > 1 ? 2 : 1)) {
          const next = pageIndex + step;
          goToPage(next);
          showSwipeNotice(`Trang ${next + 1}/${paragraphPages.length}`);
          return;
        }
      } else if (pageIndex > 0) {
        const prev = Math.max(0, pageIndex - step);
        goToPage(prev);
        showSwipeNotice(`Trang ${prev + 1}/${paragraphPages.length}`);
        return;
      }
    }
    void navigateBySwipe(direction);
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
    return !target.closest("a, button, input, textarea, select, audio, .chapter-comments, .reader-mobile-dock, .reader-mobile-sheet, .background-audio, .reader-tap-edge");
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

  function handleZenDoubleTap(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, textarea, select, [contenteditable='true'], .reader-selection-toolbar")) return;

    const now = Date.now();
    const prev = zenTapRef.current;
    const dx = prev ? Math.abs(event.clientX - prev.x) : 999;
    const dy = prev ? Math.abs(event.clientY - prev.y) : 999;
    if (prev && now - prev.t < 420 && dx < 32 && dy < 32) {
      setFocusModeEnabled((value) => !value);
      zenTapRef.current = null;
      return;
    }
    zenTapRef.current = { t: now, x: event.clientX, y: event.clientY };
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
          {isRead ? <span className="sidebar-read-dot" aria-hidden title="Đã đọc" /> : null}
          {chapter.chapterNumber}. {formatChapterCardTitle(chapter.chapterNumber, chapter.title)}
        </span>
        <span className="chapter-status-row">
          {isRead ? <span className="chapter-status chapter-status-read">Đã đọc</span> : maxReadChapter > 0 ? <span className="chapter-status">Chưa đọc</span> : null}
          {isNew ? <span className="chapter-status chapter-status-new">New</span> : null}
          {addedToday ? <span className="chapter-status chapter-status-today">Hôm nay</span> : null}
          {chapter.textSource === "polished" ? <span className="chapter-status chapter-status-polished">Polish</span> : null}
          {chapter.hasAudio ? <span className="chapter-status chapter-status-audio">Audio</span> : null}
          {cachedChapterNumbers.has(chapter.chapterNumber) ? <span className="chapter-status chapter-status-offline">Đã tải</span> : null}
          <ChapterTimestamp chapter={chapter} />
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
    window.dispatchEvent(new Event("reader:open-comments"));
    window.requestAnimationFrame(() => {
      document.querySelector(".chapter-comments")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start"
      });
    });
    setMobileSheetOpen(false);
  }

  const chapterNumber = activePayload.chapter.chapterNumber;
  const title = activePayload.chapter.title ?? "";
  const displayChapterTitle = formatChapterLabel(chapterNumber, title);
  const pageTitle = displayChapterTitle;
  const minutesLeft = Math.max(0, Math.ceil(totalReadingMinutes * (1 - progressRef.current / 100)));

  useEffect(() => {
    if (!compactReader) return;
    if (wasMobilePresetBootstrapped()) return;

    const current = store.getState().readerStyle.config;
    if (!isDefaultReaderStyleConfig(current)) {
      markMobilePresetBootstrapped();
      return;
    }

    dispatch(
      setReaderStyle(
        sanitizeReaderStyleConfig({
          ...current,
          ...READER_COMFORT_PRESETS.mobile.config
        })
      )
    );
    markMobilePresetBootstrapped();
  }, [compactReader, dispatch]);

  useEffect(() => {
    if (!compactReader) return;
    if (!shouldShowSwipeHint(payload.story.id)) return;

    markSwipeHintShown(payload.story.id);
    const timer = window.setTimeout(() => {
      showSwipeNotice(READER_SWIPE_HINT_MESSAGE, READER_SWIPE_HINT_DURATION_MS);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [compactReader, payload.story.id]);

  const dismissFreshChapterHint = useCallback(() => {
    if (freshHintTimerRef.current) {
      window.clearTimeout(freshHintTimerRef.current);
      freshHintTimerRef.current = null;
    }
    setFreshChapterHint(null);
    setShellFreshPulse(false);
  }, []);

  const handleReaderRealtime = useCallback(
    (event: ReaderRealtimeEvent) => {
      if (event.type !== "chapter_update" || event.storyId !== activePayload.story.id || !event.chapterNumber) return;

      queryClient.invalidateQueries({
        queryKey: readerQueryKeys.chapter(activePayload.story.id, event.chapterNumber)
      });

      if (event.chapterNumber === activePayload.chapter.chapterNumber) {
        setFreshChapterHint({ chapterNumber: event.chapterNumber, kind: "current" });
        if (isRealtimeShimmerEnabled()) setShellFreshPulse(true);
      } else if (event.chapterNumber > activePayload.chapter.chapterNumber) {
        setFreshChapterHint({ chapterNumber: event.chapterNumber, kind: "next" });
      }

      if (freshHintTimerRef.current) window.clearTimeout(freshHintTimerRef.current);
      freshHintTimerRef.current = window.setTimeout(() => {
        dismissFreshChapterHint();
      }, 12000);
    },
    [activePayload.chapter.chapterNumber, activePayload.story.id, dismissFreshChapterHint, queryClient]
  );

  useReaderRealtimeListener(handleReaderRealtime);

  function renderPageParagraphBlock(pageParagraphIndexes: number[]) {
    return pageParagraphIndexes.map((index) => {
      const paragraph = paragraphs[index] ?? "";
      const bookmarked = bookmarkedParagraphIndexes.has(index);
      const hasNote = currentChapterParagraphBookmarks.some((item) => item.paragraphIndex === index && item.note);
      return (
        <p
          className={paragraphClassName(index, bookmarked, hasNote)}
          data-paragraph-index={index}
          {...primaryChapterParagraphAttrs}
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
          {renderParagraphTools(index, paragraph, bookmarked)}
          {renderParagraphBody(index, paragraph)}
        </p>
      );
    });
  }

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
            title="Cuộn lên đầu"
            aria-label="Cuộn lên đầu"
            aria-hidden={!showScrollTop}
            tabIndex={showScrollTop ? 0 : -1}
            onClick={scrollToTop}
          >
            <ArrowUp size={18} />
          </button>

          {tailNextChapter ? (
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
      ref={readerShellRef}
      className={`reader-shell ${compactReader ? "reader-shell--compact" : "reader-shell--desktop"} ${focusModeEnabled ? "reader-shell-focus-mode" : ""} ${isPageLayout ? "reader-shell-layout-page" : ""} ${spreadPageMode ? "reader-shell-layout-page-spread" : ""} ${notesSidebarOpen && !compactReader ? "reader-shell-notes-open" : ""} ${commentsSplitOpen && !compactReader ? "reader-shell-comments-split" : ""} ${shellFreshPulse ? "reader-shell-fresh-pulse" : ""}`}
      data-theme={theme}
      data-font={fontFamily}
      style={readerShellStyle}
    >
      {focusModeEnabled || !skillEffectsEnabled ? null : (
        <SkillEffectLayer storyId={activePayload.story.id} chapterId={activePayload.chapter.id} />
      )}
      {/* Compact: FAB competes with dock — inline player lives in sheet “Tiện ích thêm”. */}
      {focusModeEnabled || compactReader ? null : <BackgroundAudioPlayer />}
      {focusModeEnabled ? null : <ReaderAmbienceLayer />}
      {focusModeEnabled || compactReader ? null : <ReaderSpiritCompanion />}
      <div className="reader-progress" aria-hidden="true">
        {decorativeWebglEnabled && !focusModeEnabled ? (
          <ThreeReaderProgress progress={mobileProgress} progressRef={mobileProgressRef} />
        ) : null}
        <div className="reader-progress-bar" ref={progressBarRef} />
      </div>
      <div className={`reader-dim-overlay ${readerDimEnabled ? "reader-dim-overlay-active" : ""}`} aria-hidden="true" />
      <div className="reader-focus-veil" aria-hidden="true" />
      {swipeNotice ? (
        <div className="reader-swipe-notice" role="status" aria-live="polite">
          {swipeNotice}
        </div>
      ) : null}

      <ReaderChapterFreshHint
        storyId={activePayload.story.id}
        storyTitle={activePayload.story.title}
        hint={freshChapterHint}
        onDismiss={dismissFreshChapterHint}
      />

      <ReaderEngagementPrompt
        story={activePayload.story}
        chapterNumber={activePayload.chapter.chapterNumber}
        suppressed={Boolean(freshChapterHint)}
      />

      <ReaderOnboardingCoach compact={compactReader} />
      <ReaderGlossaryTapPopover character={glossaryTapCharacter} onClose={() => setGlossaryTapCharacter(null)} />

      <ChapterTransition trigger={chapterTransitionTrigger} direction={chapterTransitionDirection} />

      {showCompletionOverlay && floatingActionsMounted
        ? createPortal(
            <StoryCompletionOverlay
              story={activePayload.story}
              chaptersRead={maxReadChapter}
              onDismiss={() => setShowCompletionOverlay(false)}
            />,
            document.body
          )
        : null}

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
        <ReaderSelectionToolbar
          x={selectionAction.x}
          y={selectionAction.y}
          compact={compactReader}
          glossaryCharacter={selectionAction.glossaryCharacter}
          isAdmin={Boolean(currentUser?.isAdmin)}
          onCopy={copySelectedContent}
          onShare={shareSelectedContent}
          onShareImage={shareSelectedContentAsImage}
          onEdit={editSelectedContent}
          onSavePhrase={supportsBilingual ? saveSelectedPhrase : undefined}
          onLookup={supportsBilingual ? openLookupFromSelection : undefined}
        />
      ) : null}

      {floatingReaderActions}

      {jumpBackTarget ? (
        <button type="button" className="reader-jump-back-fab" onClick={jumpBackToReadingPosition}>
          <BookOpen size={16} />
          Nhảy lại chỗ đọc
        </button>
      ) : null}

      <ReaderInChapterSearchPanel
        open={chapterSearchOpen}
        query={chapterSearchQuery}
        matchIndex={chapterSearchMatchIndex}
        matchCount={chapterSearchMatches.length}
        mode={chapterSearchMode}
        storyHits={storySearchHits}
        storyHitIndex={storySearchHitIndex}
        storyLoading={storySearchLoading}
        storyError={storySearchError}
        onQueryChange={setChapterSearchQuery}
        onModeChange={setChapterSearchMode}
        onClose={() => {
          setChapterSearchOpen(false);
          setChapterSearchQuery("");
          setChapterSearchMode("chapter");
        }}
        onPrevious={() => (chapterSearchMode === "story" ? jumpStorySearchHit("previous") : jumpChapterSearchMatch("previous"))}
        onNext={() => (chapterSearchMode === "story" ? jumpStorySearchHit("next") : jumpChapterSearchMatch("next"))}
        onStoryHitSelect={(hit) => void navigateToStorySearchHit(hit)}
      />

      <ReaderNotesSidebar
        open={notesSidebarOpen && !compactReader}
        bookmarks={sessionParagraphBookmarks}
        phraseNotes={supportsBilingual ? storyPhraseNotes : []}
        showPhraseTab={supportsBilingual}
        onClose={() => setNotesSidebarOpen(false)}
        onJump={(bookmark) => {
          setNotesSidebarOpen(false);
          window.requestAnimationFrame(() => scrollToParagraph(bookmark.paragraphIndex, "smooth", bookmark.chapterNumber));
        }}
        onEditNote={(bookmark) => {
          setNotesSidebarOpen(false);
          openParagraphNoteEditor(bookmark.chapterNumber, bookmark.paragraphIndex);
        }}
        onJumpPhrase={(note) => {
          setNotesSidebarOpen(false);
          window.requestAnimationFrame(() => scrollToParagraph(note.paragraphIndex, "smooth", note.chapterNumber));
        }}
        onEditPhrase={(note) => {
          setNotesSidebarOpen(false);
          setPhraseNoteEditor(note);
        }}
        onDeletePhrase={deleteStoryPhraseNote}
      />

      <ReaderGlossaryDrawer
        open={glossaryDrawerOpen}
        characters={glossaryCharacters}
        onClose={() => setGlossaryDrawerOpen(false)}
        onSelectCharacter={(character) => {
          setGlossaryDrawerOpen(false);
          setChapterSearchMode("story");
          setChapterSearchQuery(character.name);
          setChapterSearchOpen(true);
        }}
      />

      <ReaderKeyboardHelp open={keyboardHelpOpen} onClose={() => setKeyboardHelpOpen(false)} />

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
              className="reader-mobile-dock-primary reader-mobile-dock-primary-progress"
              type="button"
              aria-label="Mở công cụ đọc"
              title="Công cụ đọc"
              onClick={() => {
                setMobileSheetTab("read");
                setMobileSheetOpen(true);
              }}
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

      <header className="reader-topbar reader-topbar-modern">
        <Link href={storyHref(activePayload.story)} className="brand reader-topbar-brand" aria-label={`Về trang truyện: ${activePayload.story.title}, ${pageTitle}`}>
          <ReaderLogo />
          <span className="reader-title-stack" aria-hidden="true">
            <span className="reader-story-title" onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startAdminEdit("storyTitle", activePayload.story.title);
            }}>{activePayload.story.title}</span>
            <span className="reader-chapter-kicker">{pageTitle}</span>
            {readingFromOfflineCache ? (
              <span className="reader-offline-badge" title="Đang đọc bản đã tải offline">
                <WifiOff size={11} aria-hidden="true" />
                Offline
              </span>
            ) : null}
          </span>
        </Link>

        <div className="reader-controls reader-controls-desktop" aria-label="Reader controls">
          <div className="reader-control-group reader-session-group">
            <NotificationBell className="reader-notification" />
            <UserIdentity compact className="reader-identity" />
          </div>
          <div className="reader-control-group reader-action-group" ref={readerOverflowRef}>
            {!compactReader ? (
              <FloatingTooltip label="Tuỳ chọn đọc">
                <button
                  className={`icon-button reader-tools-trigger ${readerOverflowOpen || currentBookmark || focusModeEnabled || audioPanelOpen || offlineReady || commentsSplitOpen || notesSidebarOpen || chapterSearchOpen || mobileFormatOpen ? "icon-button-active" : ""}`}
                  type="button"
                  title="Tuỳ chọn đọc"
                  aria-expanded={readerOverflowOpen}
                  aria-controls="reader-overflow-panel"
                  ref={(node) => {
                    formatTriggerRef.current = node;
                    formatFloatingRefs.setReference(node);
                  }}
                  {...getFormatReferenceProps({
                    onClick: () => {
                      setReaderOverflowOpen((v) => !v);
                      if (mobileFormatOpen) setMobileFormatOpen(false);
                    }
                  })}
                >
                  <Settings2 size={16} />
                </button>
              </FloatingTooltip>
            ) : null}
            {!compactReader && readerOverflowOpen ? (
              <div className="reader-overflow-panel" id="reader-overflow-panel">
                <p className="reader-overflow-group-label">Tài khoản</p>
                <div className="reader-overflow-account">
                  <FollowButton story={activePayload.story} compact />
                  <CultivationPanel compact className="reader-cultivation" />
                  <ReaderStatsPill sessionMinutes={sessionMinutes} chapterProgress={mobileProgress} chapterMinutesLeft={minutesLeft} />
                </div>

                <p className="reader-overflow-group-label">Chữ & giao diện</p>
                <button
                  className={`reader-overflow-item ${mobileFormatOpen ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => {
                    setReaderOverflowOpen(false);
                    setMobileFormatOpen(true);
                  }}
                >
                  <Type size={15} />
                  Chữ, theme & bố cục
                </button>
                <button
                  className={`reader-overflow-item ${isPageLayout ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleLayoutMode(); setReaderOverflowOpen(false); }}
                >
                  <BookOpen size={15} />
                  {isPageLayout ? "Chế độ cuộn" : "Chế độ trang"}
                </button>
                {isPageLayout && !compactReader ? (
                  <button
                    className={`reader-overflow-item ${pageColumns === 2 ? "reader-overflow-item-active" : ""}`}
                    type="button"
                    onClick={() => { togglePageColumns(); setReaderOverflowOpen(false); }}
                  >
                    <BookOpen size={15} />
                    {pageColumns === 2 ? "Một cột trang" : "Hai cột trang"}
                  </button>
                ) : null}
                <button
                  className="reader-overflow-item"
                  type="button"
                  onClick={resetReaderSettings}
                >
                  <RotateCcw size={15} />
                  Về mặc định
                </button>

                <p className="reader-overflow-group-label">Đọc</p>
                <button
                  className={`reader-overflow-item ${currentBookmark ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleBookmark(); setReaderOverflowOpen(false); }}
                >
                  <Image src="/icons/bookmark-jade.svg" className="bookmark-jade-icon" alt="" aria-hidden="true" width={16} height={16} />
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
                <button
                  className={`reader-overflow-item ${chapterSearchOpen ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { setChapterSearchOpen(true); setReaderOverflowOpen(false); }}
                >
                  <Search size={15} />
                  Tìm trong chương
                </button>
                <button
                  className={`reader-overflow-item ${notesSidebarOpen ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { setNotesSidebarOpen((value) => !value); setReaderOverflowOpen(false); }}
                >
                  <StickyNote size={15} />
                  {notesSidebarOpen ? "Đóng ghi chú đoạn" : "Ghi chú đoạn"}
                </button>
                {glossaryCharacters.length > 0 ? (
                  <button
                    className={`reader-overflow-item ${glossaryDrawerOpen ? "reader-overflow-item-active" : ""}`}
                    type="button"
                    onClick={() => { setGlossaryDrawerOpen(true); setReaderOverflowOpen(false); }}
                  >
                    <BookOpen size={15} />
                    Nhân vật & thuật ngữ
                  </button>
                ) : null}
                {supportsBilingual ? (
                  <button
                    className={`reader-overflow-item ${bilingualPrefs.enabled ? "reader-overflow-item-active" : ""}`}
                    type="button"
                    onClick={() => {
                      openBilingualSettingsSheet();
                      setReaderOverflowOpen(false);
                    }}
                  >
                    <Languages size={15} />
                    {bilingualPrefs.enabled ? "Song ngữ (bật)" : "Song ngữ Anh – Việt"}
                  </button>
                ) : null}
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
                {!isPageLayout ? (
                  <button
                    className={`reader-overflow-item ${autoScrollEnabled ? "reader-overflow-item-active" : ""}`}
                    type="button"
                    onClick={() => { toggleAutoScroll(); setReaderOverflowOpen(false); }}
                  >
                    {autoScrollEnabled ? <Pause size={15} /> : <Play size={15} />}
                    {autoScrollEnabled ? "Dừng tự cuộn" : "Tự cuộn"}
                  </button>
                ) : null}

                <p className="reader-overflow-group-label">Xã hội</p>
                <button
                  className={`reader-overflow-item ${commentsSplitOpen ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleCommentsSplit(); setReaderOverflowOpen(false); }}
                >
                  <MessageCircle size={15} />
                  {commentsSplitOpen ? "Luận đạo dưới chương" : "Luận đạo cạnh nội dung"}
                </button>
                <button
                  className="reader-overflow-item"
                  type="button"
                  onClick={() => { scrollToComments(); setReaderOverflowOpen(false); }}
                >
                  <MessageCircle size={15} />
                  Tới luận đạo
                </button>

                <p className="reader-overflow-group-label">Nâng cao</p>
                <button
                  className={`reader-overflow-item ${skillEffectsEnabled ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleReaderSkillEffects(); setReaderOverflowOpen(false); }}
                >
                  <Highlighter size={15} />
                  {skillEffectsEnabled ? "Tắt hiệu ứng tu luyện" : "Bật hiệu ứng tu luyện"}
                </button>
                <button
                  className={`reader-overflow-item ${tapEdgeEnabled ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleTapEdgeNavigation(); setReaderOverflowOpen(false); }}
                >
                  <ChevronLeft size={15} />
                  {tapEdgeEnabled ? "Tắt chạm cạnh" : "Bật chạm cạnh đổi chương"}
                </button>
                <button
                  className={`reader-overflow-item ${continuousChapterEnabled ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { toggleContinuousChapter(); setReaderOverflowOpen(false); }}
                >
                  <ChevronRight size={15} />
                  {continuousChapterEnabled ? "Tắt cuộn liên tục" : "Cuộn liên tục nối chương"}
                </button>
                <button
                  className={`reader-overflow-item ${readerDimEnabled ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  onClick={() => { setReaderDimEnabled((value) => !value); setReaderOverflowOpen(false); }}
                >
                  {readerDimEnabled ? <Eye size={15} /> : <EyeOff size={15} />}
                  {readerDimEnabled ? "Tắt lọc sáng" : "Lọc sáng"}
                </button>
                <button
                  className={`reader-overflow-item ${wakeLockActive ? "reader-overflow-item-active" : ""}`}
                  type="button"
                  title={wakeLockSupported ? "Giữ màn hình sáng khi đọc" : "Trình duyệt có thể chưa hỗ trợ"}
                  onClick={() => {
                    toggleWakeLock();
                    setReaderOverflowOpen(false);
                  }}
                >
                  {wakeLockActive ? <Eye size={15} /> : <EyeOff size={15} />}
                  {wakeLockActive ? "Đang giữ sáng" : "Giữ màn hình sáng"}
                </button>

                <div className="reader-overflow-sep" />
                <div className="reader-overflow-shortcuts">
                  <p className="reader-overflow-shortcuts-title">Phím tắt</p>
                  <div className="reader-shortcut-row"><kbd>←</kbd><kbd>→</kbd><span>{isPageLayout ? "Trang / chương" : "Chương trước / sau"}</span></div>
                  <div className="reader-shortcut-row"><kbd>B</kbd><span>Đánh dấu chương</span></div>
                  <div className="reader-shortcut-row"><kbd>F</kbd><span>Focus mode</span></div>
                  <div className="reader-shortcut-row"><kbd>G</kbd><span>Nhân vật & thuật ngữ</span></div>
                  <div className="reader-shortcut-row"><kbd>Ctrl/⌘</kbd><kbd>F</kbd><span>Tìm trong chương</span></div>
                  <div className="reader-shortcut-row"><kbd>T</kbd><span>Mục lục</span></div>
                </div>
              </div>
            ) : null}
            {!compactReader ? (
              <FloatingTooltip label={desktopSidebarOpen ? "Đóng mục lục" : "Mở mục lục"}>
                <button
                  className="icon-button desktop-sidebar-trigger"
                  type="button"
                  ref={desktopSidebarButtonRef}
                  title={desktopSidebarOpen ? "Đóng mục lục" : "Mở mục lục"}
                  aria-expanded={desktopSidebarOpen}
                  aria-controls="chapter-sidebar"
                  onClick={() => {
                    setDesktopSidebarOpen((value) => {
                      const next = !value;
                      writeReaderDesktopSidebarOpen(next);
                      return next;
                    });
                  }}
                >
                  {desktopSidebarOpen ? <X size={17} /> : <Menu size={17} />}
                </button>
              </FloatingTooltip>
            ) : null}
          </div>
          {mobileFormatOpen && !compactReader ? (
            <FloatingPortal>
              <div
                className="format-controls format-controls-open format-controls-portal"
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
            <div className="segmented reader-layout-mode" aria-label="Chế độ đọc">
              <button type="button" aria-pressed={layoutMode === "scroll"} onClick={() => toggleLayoutMode("scroll")}>
                Cuộn
              </button>
              <button type="button" aria-pressed={layoutMode === "page"} onClick={() => toggleLayoutMode("page")}>
                Trang
              </button>
            </div>
            <ReaderThemeSegmented ariaLabel="Giao diện" />
              </div>
            </FloatingPortal>
          ) : null}
        </div>

        {compactReader ? (
          <div className="reader-controls reader-controls-mobile" aria-label="Mobile reader controls">
            <NotificationBell className="reader-notification" />
            {supportsBilingual ? (
              <button
                className={`icon-button ${bilingualPrefs.enabled ? "icon-button-active" : ""}`}
                type="button"
                title={bilingualPrefs.enabled ? "Song ngữ đang bật — mở cài đặt" : "Bật song ngữ Anh – Việt"}
                aria-label={bilingualPrefs.enabled ? "Cài đặt song ngữ" : "Bật song ngữ Anh – Việt"}
                aria-pressed={bilingualPrefs.enabled}
                onClick={() => {
                  if (!bilingualPrefs.enabled) toggleBilingualQuick();
                  openBilingualSettingsSheet();
                }}
              >
                <Languages size={17} />
              </button>
            ) : null}
            <button
              className="icon-button"
              type="button"
              title="Mục lục"
              aria-expanded={mobileMenuOpen}
              aria-controls="chapter-sidebar"
              onClick={openMobileChapterList}
            >
              <Menu size={17} />
            </button>
          </div>
        ) : null}
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
              <nav className="reader-sheet-tabs" role="tablist" aria-label="Mục công cụ đọc">
                <button
                  className={`reader-sheet-tab ${mobileSheetTab === "read" ? "reader-sheet-tab-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={mobileSheetTab === "read"}
                  onClick={() => setMobileSheetTab("read")}
                >
                  Đọc
                </button>
                <button
                  className={`reader-sheet-tab ${mobileSheetTab === "settings" ? "reader-sheet-tab-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={mobileSheetTab === "settings"}
                  onClick={() => setMobileSheetTab("settings")}
                >
                  Cài đặt
                  {supportsBilingual ? <Languages size={13} aria-hidden /> : null}
                </button>
                <button
                  className={`reader-sheet-tab ${mobileSheetTab === "offline" ? "reader-sheet-tab-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={mobileSheetTab === "offline"}
                  onClick={() => setMobileSheetTab("offline")}
                >
                  Offline
                </button>
              </nav>
            </div>

            <div className="reader-mobile-sheet-scroll" ref={mobileSheetScrollRef}>
            {mobileSheetTab === "read" ? (
              <>
            {compactReader ? (
              <div className="reader-sheet-section reader-sheet-account-row">
                <UserIdentity compact className="reader-identity-mobile" />
                <FollowButton story={activePayload.story} compact />
              </div>
            ) : null}
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
              {supportsBilingual ? (
                <button
                  className={`reader-sheet-action reader-sheet-action-bilingual ${bilingualPrefs.enabled ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  aria-pressed={bilingualPrefs.enabled}
                  onClick={() => {
                    if (!bilingualPrefs.enabled) toggleBilingualQuick();
                    openBilingualSettingsSheet();
                  }}
                >
                  <Languages size={16} />
                  {bilingualPrefs.enabled ? "Song ngữ · chỉnh" : "Song ngữ EN–VI"}
                </button>
              ) : null}
              <button className="reader-sheet-action" type="button" onClick={toggleBookmark}>
                <Image src="/icons/bookmark-jade.svg" className="bookmark-jade-icon" alt="" aria-hidden="true" width={18} height={18} />
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
              <button
                className="reader-sheet-action"
                type="button"
                disabled={!activePayload.chapter.audioUrl}
                onClick={() => {
                  setMobileSheetOpen(false);
                  scrollToAudioPanel();
                }}
              >
                <Headphones size={16} />
                {activePayload.chapter.audioUrl ? "Nghe audio" : "Chưa có audio"}
              </button>
              <button className="reader-sheet-action" type="button" onClick={scrollToComments}>
                <BookOpen size={16} />
                Luận đạo
              </button>
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

            {sessionParagraphBookmarks.length > 0 ? (
              <div className="reader-sheet-section reader-sheet-bookmarks">
                <span>Dấu đoạn phiên đọc</span>
                <div className="reader-sheet-paragraph-bookmarks">
                  {sessionParagraphBookmarks.slice(0, 8).map((bookmark) => (
                    <div className="reader-sheet-paragraph-bookmark-row" key={bookmark.id}>
                      <button
                        className="reader-sheet-paragraph-bookmark"
                        type="button"
                        onClick={() => {
                          setMobileSheetOpen(false);
                          window.requestAnimationFrame(() =>
                            scrollToParagraph(bookmark.paragraphIndex, "smooth", bookmark.chapterNumber)
                          );
                        }}
                      >
                        <BookMarked size={14} />
                        <span>
                          <small>Ch.{bookmark.chapterNumber}</small>
                          {bookmark.excerpt}
                          {bookmark.note ? <small>{bookmark.note}</small> : null}
                        </span>
                      </button>
                      <button
                        className="reader-sheet-paragraph-note"
                        type="button"
                        aria-label="Ghi chú đoạn"
                        onClick={() => {
                          setMobileSheetOpen(false);
                          openParagraphNoteEditor(bookmark.chapterNumber, bookmark.paragraphIndex);
                        }}
                      >
                        <StickyNote size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {supportsBilingual && storyPhraseNotes.length > 0 ? (
              <div className="reader-sheet-section reader-sheet-bookmarks">
                <span>Cụm từ đã lưu ({storyPhraseNotes.length})</span>
                <div className="reader-sheet-paragraph-bookmarks">
                  {storyPhraseNotes.slice(0, 8).map((note) => (
                    <div className="reader-sheet-paragraph-bookmark-row" key={note.id}>
                      <button
                        className="reader-sheet-paragraph-bookmark"
                        type="button"
                        onClick={() => {
                          setMobileSheetOpen(false);
                          window.requestAnimationFrame(() =>
                            scrollToParagraph(note.paragraphIndex, "smooth", note.chapterNumber)
                          );
                        }}
                      >
                        <Highlighter size={14} />
                        <span>
                          <small>Ch.{note.chapterNumber}</small>
                          {note.phrase}
                          {note.pairedText ? <small>{note.pairedText}</small> : null}
                          {note.note ? <small>{note.note}</small> : null}
                        </span>
                      </button>
                      <button
                        className="reader-sheet-paragraph-note"
                        type="button"
                        aria-label="Sửa ghi chú cụm từ"
                        onClick={() => {
                          setMobileSheetOpen(false);
                          setPhraseNoteEditor(note);
                        }}
                      >
                        <StickyNote size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {autoScrollEnabled ? (
              <div className="reader-sheet-section">
                <span>Tốc độ tự cuộn</span>
                <div className="reader-sheet-section-body">
                  <label className="reader-range-control reader-sheet-range">
                    <span>{autoScrollSpeed}px/nhịp</span>
                    <input
                      type="range"
                      min={80}
                      max={400}
                      step={20}
                      value={autoScrollSpeed}
                      onChange={(event) => setAutoScrollSpeed(Number(event.target.value))}
                    />
                  </label>
                </div>
              </div>
            ) : null}
              </>
            ) : null}

            {mobileSheetTab === "settings" ? (
              <>
            {supportsBilingual ? (
              <div className="reader-sheet-section">
                <ReaderBilingualSettings
                  story={activePayload.story}
                  availableLayers={activePayload.chapter.availableContentLayers ?? ["polished", "raw"]}
                  onChange={handleBilingualPrefsChange}
                />
              </div>
            ) : null}
            <div className="reader-sheet-section">
              <span>Cài đọc</span>
              <div className="reader-sheet-section-body">
                <ReaderThemeSegmented
                  className="reader-sheet-segmented reader-sheet-themes"
                  ariaLabel="Giao diện đọc"
                  variant="labels"
                />
                <div className="segmented reader-sheet-segmented reader-layout-mode" aria-label="Chế độ đọc">
                  <button type="button" aria-pressed={layoutMode === "scroll"} onClick={() => toggleLayoutMode("scroll")}>
                    Cuộn
                  </button>
                  <button type="button" aria-pressed={layoutMode === "page"} onClick={() => toggleLayoutMode("page")}>
                    Trang
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
                {!compactReader ? (
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
                ) : null}
                <label className="reader-range-control reader-sheet-range">
                  <span>Lọc sáng {Math.round(readerDimLevel * 100)}%</span>
                  <input
                    type="range"
                    min="0.06"
                    max="0.48"
                    step="0.02"
                    value={readerDimLevel}
                    onChange={(event) => {
                      setReaderDimLevel(event.target.value);
                      setReaderDimEnabled(true);
                    }}
                  />
                </label>
              </div>
            </div>

            <details className="reader-sheet-collapsible">
              <summary>
                <span>Preset & hiệu năng</span>
                <ChevronRight size={16} aria-hidden="true" />
              </summary>
              <div className="reader-sheet-section-body">
                <div className="reader-sheet-grid">
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
                <div className="segmented reader-sheet-segmented reader-performance-mode" aria-label="Hiệu năng reader">
                  {(["balanced", "battery_saver", "full_effects"] as ReaderPerformanceMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={performanceMode === mode}
                      onClick={() => setReaderPerformanceMode(mode)}
                    >
                      {readerPerformanceModeLabel(mode)}
                    </button>
                  ))}
                </div>
                <RealtimeFxPreference compact />
              </div>
            </details>

            <details className="reader-sheet-collapsible">
              <summary>
                <span>Tiện ích thêm</span>
                <ChevronRight size={16} aria-hidden="true" />
              </summary>
              <div className="reader-sheet-grid reader-sheet-section-body">
                <BackgroundAudioPlayer mode="inline" />
                <AmbientSoundPlayer />
                <button className="reader-sheet-action" type="button" onClick={() => setChapterSearchOpen(true)}>
                  <Search size={16} />
                  Tìm trong chương
                </button>
                {glossaryCharacters.length > 0 ? (
                  <button className="reader-sheet-action" type="button" onClick={() => setGlossaryDrawerOpen(true)}>
                    <BookOpen size={16} />
                    Nhân vật & thuật ngữ
                  </button>
                ) : null}
                <button
                  className={`reader-sheet-action ${wakeLockActive ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  title={wakeLockSupported ? "Giữ màn hình sáng khi đọc" : "Trình duyệt có thể chưa hỗ trợ"}
                  aria-pressed={wakeLockActive}
                  onClick={() => toggleWakeLock()}
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
                  className={`reader-sheet-action ${skillEffectsEnabled ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  aria-pressed={skillEffectsEnabled}
                  onClick={toggleReaderSkillEffects}
                >
                  <Highlighter size={16} />
                  {skillEffectsEnabled ? "Tắt hiệu ứng" : "Hiệu ứng tu luyện"}
                </button>
                <button
                  className={`reader-sheet-action ${tapEdgeEnabled ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  aria-pressed={tapEdgeEnabled}
                  onClick={toggleTapEdgeNavigation}
                >
                  <ChevronLeft size={16} />
                  {tapEdgeEnabled ? "Tắt chạm cạnh" : "Chạm cạnh đổi chương"}
                </button>
                <button
                  className={`reader-sheet-action ${continuousChapterEnabled ? "reader-sheet-action-active" : ""}`}
                  type="button"
                  aria-pressed={continuousChapterEnabled}
                  onClick={toggleContinuousChapter}
                >
                  <ChevronRight size={16} />
                  {continuousChapterEnabled ? "Đang cuộn liên tục" : "Cuộn liên tục nối chương"}
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
              </div>
            </details>

            <div className="reader-sheet-section">
              <span>Focus mặc định</span>
              <div className="reader-sheet-section-body">
                <label className="reader-sheet-toggle">
                  <input
                    type="checkbox"
                    checked={focusModeDefault}
                    onChange={(event) => setFocusModeDefaultPreference(event.target.checked)}
                  />
                  <span>Tự bật focus mode khi mở reader</span>
                </label>
              </div>
            </div>

            <div className="reader-sheet-section">
              <span>Đặt lại</span>
              <div className="reader-sheet-section-body">
                <button className="reader-sheet-action" type="button" onClick={resetReaderSettings}>
                  <RotateCcw size={16} />
                  Về cài đặt mặc định
                </button>
              </div>
            </div>

            {currentUser?.isAdmin ? (
              <div className="reader-sheet-section">
                <span>Quality tools</span>
                <div className="reader-quality-panel reader-sheet-section-body">
                  <dl>
                    <div>
                      <dt>Dòng raw</dt>
                      <dd>{qualityStats?.rawLines ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Đoạn đang đọc</dt>
                      <dd>{qualityStats?.paragraphs ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Preview format</dt>
                      <dd>{qualityStats?.formattedParagraphs ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Dòng ngắn</dt>
                      <dd>{qualityStats?.shortLineCount ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Quote rời</dt>
                      <dd>{qualityStats?.danglingQuoteCount ?? "-"}</dd>
                    </div>
                  </dl>
                  <div className="reader-quality-preview">
                    {formattedPreviewParagraphs?.slice(0, 3).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
              </>
            ) : null}

            {mobileSheetTab === "offline" ? (
              <>
            <div className="reader-sheet-section">
              <span>Tải chương offline</span>
              <div className="reader-sheet-section-body reader-offline-cache-panel">
                {offlineLoading && offlineDownloadProgress ? (
                  <div
                    className="reader-offline-queue-progress"
                    role="progressbar"
                    aria-valuenow={offlineDownloadProgress.done}
                    aria-valuemin={0}
                    aria-valuemax={offlineDownloadProgress.total}
                  >
                    <span
                      style={{
                        width: `${Math.round((offlineDownloadProgress.done / Math.max(1, offlineDownloadProgress.total)) * 100)}%`
                      }}
                    />
                  </div>
                ) : null}
                <button
                  className={`reader-sheet-action reader-sheet-status ${offlineReady ? "reader-sheet-status-ready" : ""}`}
                  type="button"
                  disabled={offlineLoading}
                  onClick={() => refreshOfflineCache(true)}
                >
                  {offlineLoading ? <LoaderCircle size={16} className="spin" /> : <WifiOff size={16} />}
                  {offlineLoading && offlineDownloadProgress
                    ? `Đang tải ${offlineDownloadProgress.done}/${offlineDownloadProgress.total}…`
                    : offlineReady
                      ? `Đã tải ${cachedChapters.length} chương`
                      : offlineLoading
                        ? "Đang tải…"
                        : "Tải 3 chương kế"}
                </button>
                <div className="reader-offline-preset-row" role="group" aria-label="Tải theo số chương">
                  {OFFLINE_DOWNLOAD_PRESETS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className="reader-offline-preset-chip"
                      disabled={offlineLoading}
                      onClick={() => void downloadOfflinePreset(count)}
                    >
                      {count} chương
                    </button>
                  ))}
                </div>
                <p>
                  Các chương đã tải mở được khi mất mạng.
                  {sortedCachedChapters.length > 0 ? ` Dung lượng ~${formatOfflineCacheSize(offlineCacheBytes)}.` : ""}
                </p>
                {sortedCachedChapters.length > 0 ? (
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
                ) : (
                  <small>Chưa có chương đã tải.</small>
                )}
                <button className="reader-sheet-action" type="button" onClick={() => void clearOfflineCacheForStory()}>
                  <RotateCcw size={16} />
                  Xóa cache offline truyện này
                </button>
              </div>
            </div>
              </>
            ) : null}

            {offlineError ? <p className="reader-sheet-error">{offlineError}</p> : null}
            {wakeLockError ? <p className="reader-sheet-error">{wakeLockError}</p> : null}
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
          <ChapterSidebarHeatmap
            totalChapters={activePayload.story.totalChapters}
            maxReadChapter={maxReadChapter}
            activeChapterNumber={activePayload.chapter.chapterNumber}
            onJump={(chapterNumber) => {
              const chapter = chapters.find((item) => item.chapterNumber === chapterNumber);
              if (!chapter) return;
              markChapterListNavigation(chapterNumber);
              setMobileMenuOpen(false);
              if (!navigator.onLine && cachedChapterNumbers.has(chapterNumber)) {
                void openCachedChapter(chapterNumber);
                return;
              }
              router.push(storyHref(activePayload.story, chapterNumber));
            }}
          />
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
          onClick={handleZenDoubleTap}
          onPointerDown={handleReaderPointerDown}
          onPointerCancel={() => {
            swipeStartRef.current = null;
          }}
          onPointerUp={handleReaderPointerUp}
        >
          <div className={`reader-main-columns ${commentsSplitOpen && !compactReader ? "reader-main-columns-split" : ""}`}>
          <div className="reader-article">
            {tapEdgeEnabled && !focusModeEnabled && !adminEdit ? (
              <>
                <button
                  className="reader-tap-edge reader-tap-edge-left"
                  type="button"
                  aria-label="Chương trước"
                  onClick={() => void handleTapEdgeNav("previous")}
                />
                <button
                  className="reader-tap-edge reader-tap-edge-right"
                  type="button"
                  aria-label="Chương sau"
                  onClick={() => void handleTapEdgeNav("next")}
                />
              </>
            ) : null}
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
                  {displayChapterTitle}
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
                {currentUser?.isAdmin && activePayload.chapter.textSource ? ` · ${activePayload.chapter.textSource}` : ""}
                {totalReadingMinutes > 0 ? ` · ~${totalReadingMinutes} phút đọc` : ""}
                {formatChapterTimestamp(activePayload.chapter) ? ` · ${formatChapterTimestamp(activePayload.chapter)}` : ""}
                {totalReadingMinutes > 0 ? (
                  <span className="reader-heading-eta" ref={headingEtaLabelRef} hidden />
                ) : null}
              </p>
            </header>

            {showResumeBanner && resumeHint ? (
              <ReaderResumeBanner
                paragraphIndex={resumeHint.paragraphIndex}
                progressPercent={resumeHint.progressPercent}
                onContinue={continueFromResume}
                onDismiss={dismissResumeBanner}
              />
            ) : null}

            {activePayload.previousChapterRecap ? (
              <ReaderChapterRecap recap={activePayload.previousChapterRecap} previousChapter={activePayload.previousChapter} />
            ) : null}

            {paragraphNoteEditor && floatingActionsMounted
              ? createPortal(
                  <ReaderParagraphNoteEditor
                    excerpt={
                      paragraphBookmarksForChapter(paragraphNoteEditor.chapterNumber).find(
                        (item) => item.paragraphIndex === paragraphNoteEditor.paragraphIndex
                      )?.excerpt ??
                      (paragraphNoteEditor.chapterNumber === primaryChapterNumber
                        ? paragraphs[paragraphNoteEditor.paragraphIndex]?.slice(0, 120)
                        : inlineChapters.find((block) => block.chapterNumber === paragraphNoteEditor.chapterNumber)?.paragraphs[
                            paragraphNoteEditor.paragraphIndex
                          ]?.slice(0, 120)) ??
                      ""
                    }
                    pairedExcerpt={
                      bilingualActive && paragraphNoteEditor.chapterNumber === primaryChapterNumber
                        ? bilingualPairs[paragraphNoteEditor.paragraphIndex]?.secondary?.text?.slice(0, 240) ?? null
                        : null
                    }
                    note={paragraphNoteEditor.note}
                    onChange={(value) => setParagraphNoteEditor((current) => (current ? { ...current, note: value } : current))}
                    onSave={saveParagraphNote}
                    onClose={() => setParagraphNoteEditor(null)}
                  />,
                  document.body
                )
              : null}

            {phraseNoteEditor && floatingActionsMounted
              ? createPortal(
                  <ReaderParagraphNoteEditor
                    title="Ghi chú cụm từ"
                    excerpt={phraseNoteEditor.phrase}
                    pairedExcerpt={phraseNoteEditor.pairedText}
                    note={phraseNoteEditor.note ?? ""}
                    placeholder="Nghĩa, ngữ cảnh, cách dùng…"
                    ariaLabel="Ghi chú cụm từ"
                    onChange={(value) => setPhraseNoteEditor((current) => (current ? { ...current, note: value } : current))}
                    onSave={savePhraseNoteEditor}
                    onClose={() => setPhraseNoteEditor(null)}
                  />,
                  document.body
                )
              : null}

            {lookupRequest && floatingActionsMounted ? (
              <ReaderLookupPanel
                request={lookupRequest}
                onClose={() => setLookupRequest(null)}
                onSavePhrase={savePhraseFromLookup}
              />
            ) : null}

            {audioPanelOpen ? (
              <section className="audio-panel" aria-label="Chapter audio" ref={audioPanelRef}>
                <ChapterAudioPlayer
                  chapterId={activePayload.chapter.id}
                  audioUrl={activePayload.chapter.audioUrl}
                  hlsUrl={activePayload.chapter.audioHlsUrl}
                  title={activePayload.chapter.title}
                  autoStartToken={audioAutoStartToken}
                  autoNextChapterUrl={
                    activePayload.nextChapter
                      ? storyHref(activePayload.story, activePayload.nextChapter.chapterNumber)
                      : null
                  }
                  onAutoNextChapter={() => void openNextChapterFast()}
                  onSleepTimerEnd={() => showSwipeNotice("Hẹn giờ nghe đã dừng audio")}
                  readAlongEnabled={readAlongEnabled}
                  onReadAlongEnabledChange={setReadAlongPreference}
                  onPlaybackProgress={handleAudioPlaybackProgress}
                />
              </section>
            ) : null}

            <section
              className={`reader-content ${isPageLayout ? "reader-content-paginated" : ""} ${bilingualActive ? "reader-content-bilingual" : ""} ${bilingualColumnsLayout ? "reader-content-bilingual-columns" : ""} ${currentUser?.isAdmin ? "admin-editable-content-hidden" : ""}`}
              aria-label="Chapter content"
              ref={paragraphContainerRef}
              onMouseUp={() => window.setTimeout(() => maybeShowContentSelectionActions(), 0)}
              onTouchEnd={() => window.setTimeout(() => maybeShowContentSelectionActions(), 0)}
            >
              {isPageLayout && paragraphs.length > 0 && adminEdit?.field !== "content" ? (
                <div ref={pageMeasureContainerRef} className="reader-page-measure-layer" aria-hidden="true">
                  {paragraphs.map((paragraph, index) => (
                    <p
                      className={`reader-paragraph${bilingualActive ? " reader-paragraph-bilingual" : ""}`}
                      data-measure-index={index}
                      key={`measure-${index}`}
                    >
                      <span className="reader-page-measure-gutter" />
                      {bilingualActive ? (
                        <span className="reader-paragraph-bilingual-pair">
                          <span
                            className="reader-paragraph-bilingual-primary"
                            lang={bilingualPairs[index]?.primary.lang ?? "en"}
                          >
                            <span className="reader-paragraph-text">{renderParagraphText(index, paragraph)}</span>
                          </span>
                          {bilingualSecondaryVisible ? renderBilingualSecondary(index, { measureHiddenSecondary: false }) : null}
                        </span>
                      ) : (
                        <span className="reader-paragraph-text">{renderParagraphText(index, paragraph)}</span>
                      )}
                    </p>
                  ))}
                </div>
              ) : null}
              {adminEdit?.field === "content" ? (
                <textarea ref={adminContentEditorRef} className="admin-content-editor" value={adminEdit.value} autoFocus onChange={(event) => setAdminEdit((current) => current?.field === "content" ? { ...current, value: event.target.value } : current)} />
              ) : paragraphs.length > 0 ? (
                isPageLayout ? (
                  <div className={`reader-page-shell${spreadPageMode ? " reader-page-shell-spread" : ""}`} style={{ minHeight: pageViewportHeight }}>
                    <div className="reader-page-indicator" aria-live="polite">
                      {spreadPageMode && visiblePageIndexes.length > 1
                        ? `Trang ${pageIndex + 1}–${visiblePageIndexes[visiblePageIndexes.length - 1]! + 1} / ${paragraphPages.length}`
                        : `Trang ${pageIndex + 1} / ${paragraphPages.length}`}
                    </div>
                    {spreadPageMode ? (
                      <div className="reader-page-spread-grid">
                        {visiblePageIndexes.map((spreadPageIndex) => (
                          <div className="reader-page-spread-column" key={`page-${spreadPageIndex}`}>
                            {renderPageParagraphBlock(paragraphPages[spreadPageIndex] ?? [])}
                          </div>
                        ))}
                      </div>
                    ) : (
                      renderPageParagraphBlock(currentPageParagraphIndexes)
                    )}
                    <div className="reader-page-nav" aria-label="Điều hướng trang">
                      <button className="reader-page-nav-button" type="button" disabled={pageIndex <= 0} onClick={() => goToPage(pageIndex - (spreadPageMode ? 2 : 1))}>
                        <ChevronLeft size={16} />
                        Trang trước
                      </button>
                      <button
                        className="reader-page-nav-button"
                        type="button"
                        disabled={pageIndex >= paragraphPages.length - (spreadPageMode && visiblePageIndexes.length > 1 ? 2 : 1)}
                        onClick={() => goToPage(pageIndex + (spreadPageMode ? 2 : 1))}
                      >
                        Trang sau
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : shouldVirtualizeParagraphs ? (
                  <div
                    className="reader-content-virtual"
                    style={{ height: paragraphVirtualizer.getTotalSize(), width: "100%", position: "relative" }}
                  >
                    {paragraphVirtualizer.getVirtualItems().map((virtualRow) => {
                      const index = virtualRow.index;
                      const paragraph = paragraphs[index] ?? "";
                      const bookmarked = bookmarkedParagraphIndexes.has(index);
                      const hasNote = currentChapterParagraphBookmarks.some((item) => item.paragraphIndex === index && item.note);
                      return (
                        <div
                          key={virtualRow.key}
                          data-index={index}
                          ref={paragraphVirtualizer.measureElement}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start - paragraphVirtualizer.options.scrollMargin}px)`
                          }}
                        >
                          <p
                            className={paragraphClassName(index, bookmarked, hasNote)}
                            data-paragraph-index={index}
                            {...primaryChapterParagraphAttrs}
                            onDoubleClick={(event) => {
                              const target = event.target instanceof Element ? event.target : null;
                              if (target?.closest("button")) return;
                              event.preventDefault();
                              suppressSelectionActionUntilRef.current = Date.now() + 450;
                              window.getSelection()?.removeAllRanges();
                              startContentAdminEdit({ paragraphIndex: index, caretOffset: contentCaretOffsetFromPoint(event, index) });
                            }}
                          >
                            {renderParagraphTools(index, paragraph, bookmarked)}
                            {renderParagraphBody(index, paragraph)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                paragraphs.map((paragraph, index) => {
                  const bookmarked = bookmarkedParagraphIndexes.has(index);
                  const hasNote = currentChapterParagraphBookmarks.some((item) => item.paragraphIndex === index && item.note);
                  return (
                    <p
                      className={paragraphClassName(index, bookmarked, hasNote)}
                      data-paragraph-index={index}
                      {...primaryChapterParagraphAttrs}
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
                      {renderParagraphTools(index, paragraph, bookmarked)}
                      {renderParagraphBody(index, paragraph)}
                    </p>
                  );
                })
                )
              ) : (
                <div className="reader-empty">
                  <p>
                    Chương này chưa đọc được nội dung từ đường dẫn text trong database.
                  </p>
                  <p>{activePayload.chapter.textPath ? `Path hiện tại: ${activePayload.chapter.textPath}` : "Chapter chưa có raw/polished/translated text path."}</p>
                </div>
              )}
            </section>

            {continuousChapterEnabled && !isPageLayout
              ? inlineChapters.map((block) => (
                  <ReaderInlineChapterBlock
                    key={block.chapterId}
                    chapterId={block.chapterId}
                    chapterNumber={block.chapterNumber}
                    title={block.title}
                    paragraphs={block.paragraphs}
                    glossaryIndex={glossaryIndex}
                    onTermClick={(character) => setGlossaryTapCharacter(character)}
                    bookmarkedParagraphIndexes={bookmarkedIndexesForChapter(block.chapterNumber)}
                    chapterBookmarks={paragraphBookmarksForChapter(block.chapterNumber)}
                    chapterSearchQuery={chapterSearchQuery}
                    activeChapterSearchMatch={activeChapterSearchMatch}
                    onToggleBookmark={(paragraphIndex, paragraph) =>
                      toggleParagraphBookmark({
                        chapterId: block.chapterId,
                        chapterNumber: block.chapterNumber,
                        chapterTitle: block.title,
                        paragraphIndex,
                        paragraph
                      })
                    }
                    onOpenNote={(paragraphIndex) => openParagraphNoteEditor(block.chapterNumber, paragraphIndex)}
                  />
                ))
              : null}

            {!commentsSplitOpen || compactReader ? <ChapterComments chapterId={activePayload.chapter.id} /> : null}

            <ReaderChapterFooter storyId={activePayload.story.id} excludeStoryId={activePayload.story.id} />

            <nav className="chapter-nav" aria-label="Previous and next chapter">
              <Link
                className="nav-card"
                aria-disabled={!activePayload.previousChapter}
                href={activePayload.previousChapter ? storyHref(activePayload.story, activePayload.previousChapter.chapterNumber) : "#"}
                onClick={(event) => maybeOpenCachedChapter(event, activePayload.previousChapter?.chapterNumber)}
              >
                <ChevronLeft size={18} />
                <span>
                  {activePayload.previousChapter
                    ? formatChapterLabel(activePayload.previousChapter.chapterNumber, activePayload.previousChapter.title)
                    : "Không có chương trước"}
                </span>
              </Link>
              <Link
                ref={navCardNextRef}
                className="nav-card"
                aria-disabled={!tailNextChapter}
                href={tailNextChapter ? storyHref(activePayload.story, tailNextChapter.chapterNumber) : "#"}
                onClick={(event) => maybeOpenCachedChapter(event, tailNextChapter?.chapterNumber)}
              >
                <span>
                  <small>{tailNextChapter ? "Đọc tiếp" : "Sau"}</small>
                  {tailNextChapter
                    ? formatChapterLabel(tailNextChapter.chapterNumber, tailNextChapter.title)
                    : "Không có chương sau"}
                </span>
                <ChevronRight size={18} />
              </Link>
            </nav>
          </div>
          <ReaderCommentsSidebar
            open={commentsSplitOpen && !compactReader}
            chapterId={commentsChapterId}
            onClose={() => {
              setCommentsSplitOpen(false);
              writeReaderCommentsSplit(false);
            }}
          />
          </div>
        </article>
      </div>
    </main>
  );
}
