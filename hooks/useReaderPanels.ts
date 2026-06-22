import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { readReaderSheetTab, writeReaderSheetTab, type ReaderSheetTab } from "@/lib/reader-onboarding";

export type UseReaderPanelsResult = {
  // Mobile chrome panels
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  mobileFormatOpen: boolean;
  setMobileFormatOpen: Dispatch<SetStateAction<boolean>>;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: Dispatch<SetStateAction<boolean>>;
  mobileSheetTab: ReaderSheetTab;
  setMobileSheetTab: Dispatch<SetStateAction<ReaderSheetTab>>;
  // Floating overlays / drawers
  audioPanelOpen: boolean;
  setAudioPanelOpen: Dispatch<SetStateAction<boolean>>;
  readerOverflowOpen: boolean;
  setReaderOverflowOpen: Dispatch<SetStateAction<boolean>>;
  qualityPanelOpen: boolean;
  setQualityPanelOpen: Dispatch<SetStateAction<boolean>>;
  glossaryDrawerOpen: boolean;
  setGlossaryDrawerOpen: Dispatch<SetStateAction<boolean>>;
  // Live refs mirroring the mobile overlay state, for read-during-scroll
  // chrome-hide logic that must not re-subscribe on every toggle.
  mobileMenuOpenRef: MutableRefObject<boolean>;
  mobileSheetOpenRef: MutableRefObject<boolean>;
};

/**
 * Open/close state for the reader's overlay panels (mobile menu, format sheet,
 * bottom sheet + active tab, audio panel, overflow menu, quality panel, glossary
 * drawer). Pure UI state with two derived concerns kept in-hook:
 *  - mirror refs so the scroll-driven chrome-hide logic can read current state
 *    without re-binding listeners on every toggle, and
 *  - persistence of the last-used bottom-sheet tab.
 *
 * The resizable desktop sidebar is intentionally NOT owned here — it carries its
 * own animation/drag/persistence concerns.
 */
export function useReaderPanels(): UseReaderPanelsResult {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFormatOpen, setMobileFormatOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [readerOverflowOpen, setReaderOverflowOpen] = useState(false);
  const [qualityPanelOpen, setQualityPanelOpen] = useState(false);
  const [glossaryDrawerOpen, setGlossaryDrawerOpen] = useState(false);
  const [mobileSheetTab, setMobileSheetTab] = useState<ReaderSheetTab>(() => readReaderSheetTab());

  const mobileMenuOpenRef = useRef(false);
  const mobileSheetOpenRef = useRef(false);

  useEffect(() => {
    mobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  useEffect(() => {
    mobileSheetOpenRef.current = mobileSheetOpen;
  }, [mobileSheetOpen]);

  useEffect(() => {
    writeReaderSheetTab(mobileSheetTab);
  }, [mobileSheetTab]);

  return {
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
  };
}
