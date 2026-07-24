"use client";

import { combineReducers, configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore
} from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import { mergeBookmarks, removeBookmark, upsertBookmark, type ReaderBookmarkItem } from "@/lib/bookmarks";
import { mergeFollowedStories, storyToFollowItem, type FollowedStoryItem } from "@/lib/follows";
import { mergeHistory, type ReadingHistoryItem } from "@/lib/reading-history";
import type { StoredReaderUser } from "@/lib/identity";
import {
  sanitizeReaderStyleConfig,
  type ReaderFontFamily,
  type ReaderLayoutMode,
  type ReaderStyleConfig,
  type ReaderTheme
} from "@/lib/reader-preferences";

type IdentityState = {
  user: StoredReaderUser | null;
  hydrated: boolean;
};

type HistoryState = {
  items: ReadingHistoryItem[];
  hydrated: boolean;
};

type ReaderStyleState = {
  config: ReaderStyleConfig;
  hydrated: boolean;
};

type FollowsState = {
  items: FollowedStoryItem[];
  hydrated: boolean;
};

type BookmarksState = {
  items: ReaderBookmarkItem[];
  hydrated: boolean;
};

const initialIdentityState: IdentityState = {
  user: null,
  hydrated: false
};

const initialHistoryState: HistoryState = {
  items: [],
  hydrated: false
};

const initialReaderStyleState: ReaderStyleState = {
  config: sanitizeReaderStyleConfig(null),
  hydrated: false
};

const initialFollowsState: FollowsState = {
  items: [],
  hydrated: false
};

const initialBookmarksState: BookmarksState = {
  items: [],
  hydrated: false
};

const identitySlice = createSlice({
  name: "identity",
  initialState: initialIdentityState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<StoredReaderUser | null>) {
      const next = action.payload;
      const prev = state.user;
      // Skip identical payloads so fetch→dispatch loops do not thrash subscribers.
      if (
        prev === next ||
        (prev &&
          next &&
          prev.id === next.id &&
          prev.username === next.username &&
          (prev.email ?? null) === (next.email ?? null) &&
          Boolean(prev.emailVerified) === Boolean(next.emailVerified) &&
          Boolean(prev.isAdmin) === Boolean(next.isAdmin))
      ) {
        state.hydrated = true;
        return;
      }
      if (!prev && !next) {
        state.hydrated = true;
        return;
      }
      state.user = next;
      state.hydrated = true;
    },
    markIdentityHydrated(state) {
      state.hydrated = true;
    }
  }
});

const historySlice = createSlice({
  name: "history",
  initialState: initialHistoryState,
  reducers: {
    setHistory(state, action: PayloadAction<ReadingHistoryItem[]>) {
      state.items = action.payload;
      state.hydrated = true;
    },
    mergeHistoryItems(state, action: PayloadAction<ReadingHistoryItem[]>) {
      state.items = mergeHistory(state.items, action.payload);
      state.hydrated = true;
    },
    upsertHistoryItem(state, action: PayloadAction<ReadingHistoryItem>) {
      const item = action.payload;
      const existing = state.items.find((entry) => entry.storyId === item.storyId);
      const nextItem = {
        ...item,
        maxReadChapterNumber: Math.max(item.maxReadChapterNumber, existing?.maxReadChapterNumber ?? 0)
      };
      state.items = [nextItem, ...state.items.filter((entry) => entry.storyId !== item.storyId)].slice(0, 80);
      state.hydrated = true;
    },
    markHistoryHydrated(state) {
      state.hydrated = true;
    }
  }
});

const readerStyleSlice = createSlice({
  name: "readerStyle",
  initialState: initialReaderStyleState,
  reducers: {
    setReaderStyle(state, action: PayloadAction<ReaderStyleConfig>) {
      state.config = sanitizeReaderStyleConfig(action.payload);
      state.hydrated = true;
    },
    setReaderTheme(state, action: PayloadAction<ReaderTheme>) {
      state.config.theme = sanitizeReaderStyleConfig({ ...state.config, theme: action.payload }).theme;
      state.hydrated = true;
    },
    setReaderFontSize(state, action: PayloadAction<number>) {
      state.config.fontSize = sanitizeReaderStyleConfig({
        ...state.config,
        fontSize: action.payload
      }).fontSize;
      state.hydrated = true;
    },
    setReaderFontFamily(state, action: PayloadAction<ReaderFontFamily>) {
      state.config.fontFamily = action.payload;
      state.hydrated = true;
    },
    setReaderLineHeight(state, action: PayloadAction<number>) {
      state.config.lineHeight = sanitizeReaderStyleConfig({
        ...state.config,
        lineHeight: action.payload
      }).lineHeight;
      state.hydrated = true;
    },
    setReaderParagraphSpacing(state, action: PayloadAction<number>) {
      state.config.paragraphSpacing = sanitizeReaderStyleConfig({
        ...state.config,
        paragraphSpacing: action.payload
      }).paragraphSpacing;
      state.hydrated = true;
    },
    setReaderContentWidth(state, action: PayloadAction<number>) {
      state.config.contentWidth = sanitizeReaderStyleConfig({
        ...state.config,
        contentWidth: action.payload
      }).contentWidth;
      state.hydrated = true;
    },
    setReaderLayoutMode(state, action: PayloadAction<ReaderLayoutMode>) {
      state.config.layoutMode = action.payload;
      state.hydrated = true;
    },
    setReaderTapEdgeEnabled(state, action: PayloadAction<boolean>) {
      state.config.tapEdgeEnabled = action.payload;
      state.hydrated = true;
    },
    setReaderSkillEffectsEnabled(state, action: PayloadAction<boolean>) {
      state.config.skillEffectsEnabled = action.payload;
      state.hydrated = true;
    },
    markReaderStyleHydrated(state) {
      state.hydrated = true;
    }
  }
});

const followsSlice = createSlice({
  name: "follows",
  initialState: initialFollowsState,
  reducers: {
    setFollows(state, action: PayloadAction<FollowedStoryItem[]>) {
      state.items = action.payload;
      state.hydrated = true;
    },
    mergeFollows(state, action: PayloadAction<FollowedStoryItem[]>) {
      state.items = mergeFollowedStories(state.items, action.payload);
      state.hydrated = true;
    },
    followStory(state, action: PayloadAction<FollowedStoryItem>) {
      state.items = mergeFollowedStories(state.items, [action.payload]);
      state.hydrated = true;
    },
    unfollowStory(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.storyId !== action.payload);
      state.hydrated = true;
    },
    toggleFollowStory(state, action: PayloadAction<FollowedStoryItem>) {
      const exists = state.items.some((item) => item.storyId === action.payload.storyId);
      state.items = exists
        ? state.items.filter((item) => item.storyId !== action.payload.storyId)
        : mergeFollowedStories(state.items, [action.payload]);
      state.hydrated = true;
    },
    syncFollowedStories(state, action: PayloadAction<Parameters<typeof storyToFollowItem>[0][]>) {
      const followedIds = new Set(state.items.map((item) => item.storyId));
      const incoming = action.payload.filter((story) => followedIds.has(story.id)).map((story) => storyToFollowItem(story));
      if (incoming.length > 0) state.items = mergeFollowedStories(state.items, incoming);
      state.hydrated = true;
    },
    markFollowsHydrated(state) {
      state.hydrated = true;
    }
  }
});

type ReadingStreakState = {
  currentStreak: number;
  bestStreak: number;
  lastReadDate: string | null; // "YYYY-MM-DD" local time
  totalDaysRead: number;
};

const initialReadingStreakState: ReadingStreakState = {
  currentStreak: 0,
  bestStreak: 0,
  lastReadDate: null,
  totalDaysRead: 0
};

const readingStreakSlice = createSlice({
  name: "readingStreak",
  initialState: initialReadingStreakState,
  reducers: {
    recordDailyRead(state, action: PayloadAction<string>) {
      const today = action.payload; // "YYYY-MM-DD"
      if (state.lastReadDate === today) return;

      // Check if yesterday
      const prev = new Date(Date.UTC(
        Number(today.slice(0, 4)),
        Number(today.slice(5, 7)) - 1,
        Number(today.slice(8, 10)) - 1
      ));
      const yesterdayStr = prev.toISOString().slice(0, 10);

      state.currentStreak = state.lastReadDate === yesterdayStr ? state.currentStreak + 1 : 1;
      state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
      state.lastReadDate = today;
      state.totalDaysRead = state.totalDaysRead + 1;
    }
  }
});

const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState: initialBookmarksState,
  reducers: {
    setBookmarks(state, action: PayloadAction<ReaderBookmarkItem[]>) {
      state.items = action.payload;
      state.hydrated = true;
    },
    mergeBookmarkItems(state, action: PayloadAction<ReaderBookmarkItem[]>) {
      state.items = mergeBookmarks(state.items, action.payload);
      state.hydrated = true;
    },
    upsertBookmarkItem(state, action: PayloadAction<ReaderBookmarkItem>) {
      state.items = upsertBookmark(state.items, action.payload);
      state.hydrated = true;
    },
    removeBookmarkItem(state, action: PayloadAction<{ storyId: string; chapterNumber: number }>) {
      state.items = removeBookmark(state.items, action.payload.storyId, action.payload.chapterNumber);
      state.hydrated = true;
    },
    markBookmarksHydrated(state) {
      state.hydrated = true;
    }
  }
});

export const { setCurrentUser, markIdentityHydrated } = identitySlice.actions;
export const { setHistory, mergeHistoryItems, upsertHistoryItem, markHistoryHydrated } = historySlice.actions;
export const {
  setReaderStyle,
  setReaderTheme,
  setReaderFontSize,
  setReaderFontFamily,
  setReaderLineHeight,
  setReaderParagraphSpacing,
  setReaderContentWidth,
  setReaderLayoutMode,
  setReaderTapEdgeEnabled,
  setReaderSkillEffectsEnabled,
  markReaderStyleHydrated
} = readerStyleSlice.actions;
export const {
  setFollows,
  mergeFollows,
  followStory,
  unfollowStory,
  toggleFollowStory,
  syncFollowedStories,
  markFollowsHydrated
} = followsSlice.actions;
export const {
  setBookmarks,
  mergeBookmarkItems,
  upsertBookmarkItem,
  removeBookmarkItem,
  markBookmarksHydrated
} = bookmarksSlice.actions;
export const { recordDailyRead } = readingStreakSlice.actions;

export type GlobalTheme = "light" | "dark";

/** Coerce persisted/legacy values (e.g. old `auto`) to a concrete theme. */
export function normalizeGlobalTheme(value: unknown): GlobalTheme {
  if (value === "dark" || value === "light") return value;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

const globalThemeSlice = createSlice({
  name: "globalTheme",
  initialState: "light" as GlobalTheme,
  reducers: {
    setGlobalTheme(_, action: PayloadAction<GlobalTheme>) {
      return action.payload;
    }
  }
});

export const { setGlobalTheme } = globalThemeSlice.actions;

const rootReducer = combineReducers({
  identity: identitySlice.reducer,
  history: historySlice.reducer,
  readerStyle: readerStyleSlice.reducer,
  follows: followsSlice.reducer,
  bookmarks: bookmarksSlice.reducer,
  readingStreak: readingStreakSlice.reducer,
  globalTheme: globalThemeSlice.reducer
});

/** SSR-safe storage: real localStorage on client; silent noop on server (no console warn). */
function createNoopStorage() {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: string) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    }
  };
}

const persistStorage =
  typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

const persistedReducer = persistReducer(
  {
    key: "story-reader",
    version: 1,
    storage: persistStorage,
    whitelist: ["identity", "history", "readerStyle", "follows", "bookmarks", "readingStreak", "globalTheme"]
  },
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
