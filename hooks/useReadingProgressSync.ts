"use client";

import { useEffect } from "react";
import { fetchReadingProgress } from "@/lib/api-client";
import { mergeHistoryItems } from "@/lib/store";
import { useAppDispatch } from "@/lib/store-hooks";

export function useReadingProgressSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const controller = new AbortController();
    fetchReadingProgress(controller.signal)
      .then((progressItems) => dispatch(mergeHistoryItems(progressItems)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [dispatch]);
}
