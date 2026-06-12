"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { StorySummary } from "@/lib/types";

export type AdminStoryListEditField = "storyTitle" | "author" | "description";
export type AdminStoryListEditState = {
  storyId: string;
  field: AdminStoryListEditField;
  value: string;
} | null;

type UseStoryLibraryAdminEditOptions = {
  isAdmin: boolean;
  items: StorySummary[];
  setItems: Dispatch<SetStateAction<StorySummary[]>>;
  queryClient: QueryClient;
};

export function useStoryLibraryAdminEdit({ isAdmin, items, setItems, queryClient }: UseStoryLibraryAdminEditOptions) {
  const [adminEdit, setAdminEdit] = useState<AdminStoryListEditState>(null);
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);
  const adminEditSavingRef = useRef(false);
  adminEditSavingRef.current = adminEditSaving;

  const startAdminEdit = useCallback((story: StorySummary, field: AdminStoryListEditField, value: string | null | undefined) => {
    if (!isAdmin || adminEditSavingRef.current) return;
    setAdminEdit({ storyId: story.id, field, value: value ?? "" });
    setAdminEditError(null);
  }, [isAdmin]);

  const saveAdminEdit = useCallback(async () => {
    if (!adminEdit || !isAdmin) return;
    setAdminEditSaving(true);
    setAdminEditError(null);
    const previousItems = items;
    const editing = adminEdit;

    setItems((current) =>
      current.map((story) =>
        story.id === editing.storyId
          ? {
              ...story,
              title: editing.field === "storyTitle" ? editing.value : story.title,
              author: editing.field === "author" ? editing.value : story.author,
              description: editing.field === "description" ? editing.value : story.description
            }
          : story
      )
    );
    setAdminEdit(null);

    try {
      const response = await fetch("/api/admin/reader-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: editing.storyId,
          ...(editing.field === "storyTitle" ? { storyTitle: editing.value } : {}),
          ...(editing.field === "author" ? { author: editing.value } : {}),
          ...(editing.field === "description" ? { description: editing.value } : {})
        })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Không lưu được chỉnh sửa.");
      }
      const refreshedResponse = await fetch(`/api/stories/${editing.storyId}`, { cache: "no-store" });
      if (refreshedResponse.ok) {
        const refreshed = (await refreshedResponse.json()) as StorySummary;
        setItems((current) => current.map((story) => (story.id === refreshed.id ? refreshed : story)));
        queryClient.setQueryData(["story", refreshed.id], refreshed);
      }
    } catch (saveError) {
      setItems(previousItems);
      setAdminEditError(saveError instanceof Error ? saveError.message : "Không lưu được chỉnh sửa.");
    } finally {
      setAdminEditSaving(false);
    }
  }, [adminEdit, isAdmin, items, queryClient, setItems]);

  return {
    adminEdit,
    adminEditSaving,
    adminEditError,
    setAdminEdit,
    startAdminEdit,
    saveAdminEdit
  };
}
