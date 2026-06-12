"use client";

import { useCallback, useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { StorySummary } from "@/lib/types";

export type AdminStoryEditField = "storyTitle" | "author" | "description";
export type AdminStoryEditState = { field: AdminStoryEditField; value: string } | null;

type UseStoryDetailAdminEditOptions = {
  story: StorySummary;
  isAdmin: boolean;
  queryClient: QueryClient;
};

export function useStoryDetailAdminEdit({ story, isAdmin, queryClient }: UseStoryDetailAdminEditOptions) {
  const [currentStory, setCurrentStory] = useState(story);
  const [adminEdit, setAdminEdit] = useState<AdminStoryEditState>(null);
  const [adminEditSaving, setAdminEditSaving] = useState(false);
  const [adminEditError, setAdminEditError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStory(story);
  }, [story]);

  const startAdminEdit = useCallback((field: AdminStoryEditField, value: string | null | undefined) => {
    if (!isAdmin || adminEditSaving) return;
    setAdminEdit({ field, value: value ?? "" });
    setAdminEditError(null);
  }, [adminEditSaving, isAdmin]);

  const saveAdminEdit = useCallback(async () => {
    if (!adminEdit || !isAdmin) return;
    setAdminEditSaving(true);
    setAdminEditError(null);
    const previousStory = currentStory;
    const editing = adminEdit;
    const optimistic = {
      ...currentStory,
      title: editing.field === "storyTitle" ? editing.value : currentStory.title,
      author: editing.field === "author" ? editing.value : currentStory.author,
      description: editing.field === "description" ? editing.value : currentStory.description
    };
    setCurrentStory(optimistic);
    setAdminEdit(null);

    try {
      const response = await fetch("/api/admin/reader-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: currentStory.id,
          ...(editing.field === "storyTitle" ? { storyTitle: editing.value } : {}),
          ...(editing.field === "author" ? { author: editing.value } : {}),
          ...(editing.field === "description" ? { description: editing.value } : {})
        })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Không lưu được chỉnh sửa.");
      }
      const refreshedResponse = await fetch(`/api/stories/${currentStory.id}`, { cache: "no-store" });
      if (refreshedResponse.ok) {
        const refreshed = (await refreshedResponse.json()) as StorySummary;
        setCurrentStory(refreshed);
        queryClient.setQueryData(["story", currentStory.id], refreshed);
      }
    } catch (error) {
      setCurrentStory(previousStory);
      setAdminEditError(error instanceof Error ? error.message : "Không lưu được chỉnh sửa.");
    } finally {
      setAdminEditSaving(false);
    }
  }, [adminEdit, currentStory, isAdmin, queryClient]);

  return {
    currentStory,
    adminEdit,
    adminEditSaving,
    adminEditError,
    setAdminEdit,
    startAdminEdit,
    saveAdminEdit
  };
}
