"use client";

import { useLayoutEffect, useRef } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { fetchBookmarks, fetchCurrentUser, fetchFollowedStories, fetchRemoteReaderPreferences, saveReaderPreferencesOnServer, syncFollowedStoriesToServer } from "@/lib/api-client";
import { readLocalBookmarks } from "@/lib/bookmarks";
import { readLocalFollows } from "@/lib/follows";
import { readCurrentUser } from "@/lib/identity";
import { readReaderStyleConfig } from "@/lib/reader-preferences";
import { writeReaderPerformanceMode } from "@/lib/reader-performance-mode";
import { writeReaderFocusModeDefault } from "@/lib/reader-onboarding";
import { readLocalHistory } from "@/lib/reading-history";
import {
  markBookmarksHydrated,
  markFollowsHydrated,
  markHistoryHydrated,
  markIdentityHydrated,
  markReaderStyleHydrated,
  mergeBookmarkItems,
  mergeFollows,
  persistor,
  setBookmarks,
  setCurrentUser,
  setFollows,
  setHistory,
  setReaderStyle,
  store
} from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {/* Never block SSR/FCP with loading={null} — paint page HTML immediately;
          redux-persist + StoreHydrator patch client state after mount. */}
      <PersistGate loading={children} persistor={persistor}>
        <StoreHydrator>{children}</StoreHydrator>
      </PersistGate>
    </Provider>
  );
}

function StoreHydrator({ children }: { children: React.ReactNode }) {
  const hydratedRef = useRef(false);
  const remoteFollowsSyncedUserRef = useRef<string | null>(null);
  const remoteBookmarksSyncedUserRef = useRef<string | null>(null);
  const remotePreferencesSyncedUserRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const syncRemoteFollows = () => {
      const state = store.getState();
      const userId = state.identity.user?.id ?? null;
      if (!userId || remoteFollowsSyncedUserRef.current === userId) return;

      remoteFollowsSyncedUserRef.current = userId;
      const storyIds = state.follows.items.map((item) => item.storyId);
      const remoteRequest = storyIds.length > 0
        ? syncFollowedStoriesToServer(storyIds)
        : fetchFollowedStories();

      remoteRequest
        .then((remoteFollows) => {
          if (remoteFollows.length > 0) store.dispatch(mergeFollows(remoteFollows));
        })
        .catch(() => {
          remoteFollowsSyncedUserRef.current = null;
        });
    };

    const syncRemoteBookmarks = () => {
      const state = store.getState();
      const userId = state.identity.user?.id ?? null;
      if (!userId || remoteBookmarksSyncedUserRef.current === userId) return;

      remoteBookmarksSyncedUserRef.current = userId;
      fetchBookmarks()
        .then((remoteBookmarks) => {
          if (remoteBookmarks.length > 0) store.dispatch(mergeBookmarkItems(remoteBookmarks));
        })
        .catch(() => {
          remoteBookmarksSyncedUserRef.current = null;
        });
    };

    const syncRemotePreferences = () => {
      const state = store.getState();
      const userId = state.identity.user?.id ?? null;
      if (!userId || remotePreferencesSyncedUserRef.current === userId) return;

      remotePreferencesSyncedUserRef.current = userId;
      fetchRemoteReaderPreferences()
        .then((preferences) => {
          if (!preferences) return;
          const apply = () => {
            store.dispatch(setReaderStyle(preferences.readerStyle));
            writeReaderPerformanceMode(preferences.performanceMode);
            writeReaderFocusModeDefault(preferences.focusModeDefault);
            window.dispatchEvent(new Event("reader:performance-mode"));
          };
          // Chapter first paint: local persist already seeded style — defer remote
          // overwrite so font/theme don't snap mid-read.
          const onChapter = /^\/stories\/[^/]+\/chapters\/\d+/.test(window.location.pathname);
          if (onChapter && typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(apply, { timeout: 2200 });
          } else if (onChapter) {
            window.setTimeout(apply, 800);
          } else {
            apply();
          }
        })
        .catch(() => {
          remotePreferencesSyncedUserRef.current = null;
        });
    };

    const state = store.getState();
    const legacyUser = readCurrentUser();
    const legacyHistory = readLocalHistory();
    const legacyReaderStyle = readReaderStyleConfig();
    const legacyFollows = readLocalFollows();
    const legacyBookmarks = readLocalBookmarks();

    if (!state.identity.user && legacyUser) store.dispatch(setCurrentUser(legacyUser));
    else if (!state.identity.hydrated) store.dispatch(markIdentityHydrated());

    if (state.history.items.length === 0 && legacyHistory.length > 0) store.dispatch(setHistory(legacyHistory));
    else if (!state.history.hydrated) store.dispatch(markHistoryHydrated());

    if (!state.readerStyle.hydrated) store.dispatch(setReaderStyle(legacyReaderStyle));
    else store.dispatch(markReaderStyleHydrated());

    if (state.follows.items.length === 0 && legacyFollows.length > 0) store.dispatch(setFollows(legacyFollows));
    else if (!state.follows.hydrated) store.dispatch(markFollowsHydrated());

    if (state.bookmarks.items.length === 0 && legacyBookmarks.length > 0) store.dispatch(setBookmarks(legacyBookmarks));
    else if (!state.bookmarks.hydrated) store.dispatch(markBookmarksHydrated());

    fetchCurrentUser()
      .then((remoteUser) => {
        const currentUser = store.getState().identity.user;
        if (JSON.stringify(remoteUser) !== JSON.stringify(currentUser)) {
          store.dispatch(setCurrentUser(remoteUser));
        }
      })
      .catch(() => undefined);
    syncRemoteFollows();
    syncRemoteBookmarks();
    syncRemotePreferences();

    let savePreferencesTimer: number | null = null;
    let previousReaderStyle = JSON.stringify(store.getState().readerStyle.config);

    const unsubscribe = store.subscribe(() => {
      syncRemoteFollows();
      syncRemoteBookmarks();
      syncRemotePreferences();

      if (savePreferencesTimer) window.clearTimeout(savePreferencesTimer);
      savePreferencesTimer = window.setTimeout(() => {
        const nextState = store.getState();
        const nextReaderStyle = JSON.stringify(nextState.readerStyle.config);

        if (nextState.identity.user) {
          const payload: {
            readerStyle?: typeof nextState.readerStyle.config;
            performanceMode?: import("@/lib/reader-performance-mode").ReaderPerformanceMode;
            focusModeDefault?: boolean;
          } = {};

          if (nextReaderStyle !== previousReaderStyle) {
            payload.readerStyle = nextState.readerStyle.config;
            previousReaderStyle = nextReaderStyle;
          }

          if (Object.keys(payload).length > 0) {
            saveReaderPreferencesOnServer(payload);
          }
        }
      }, 220);
    });

    return () => {
      if (savePreferencesTimer) window.clearTimeout(savePreferencesTimer);
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
