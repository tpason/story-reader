"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { StoryCover } from "@/components/StoryCover";
import { useCardTiltHandlers } from "@/hooks/useCardTiltHandlers";
import { storyDisplayDescription, storyCategoryLabel } from "@/lib/story-description";
import { formatStoryUpdatedLabel } from "@/lib/content-timestamps";
import type { StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";

export type AdminStoryListEditField = "storyTitle" | "author" | "description";
export type AdminStoryListEditState = {
  storyId: string;
  field: AdminStoryListEditField;
  value: string;
} | null;

export type StoryHistoryItem = {
  storyId: string;
  chapterNumber: number;
  maxReadChapterNumber: number;
};

export type StoryCardProps = {
  story: StorySummary;
  storyHistory: StoryHistoryItem | undefined;
  isAdmin: boolean;
  adminEditForCard: AdminStoryListEditState;
  onStartEdit: (story: StorySummary, field: AdminStoryListEditField, value: string | null | undefined) => void;
  onSetAdminEdit: (edit: AdminStoryListEditState) => void;
};

export const StoryCard = memo(function StoryCard({
  story,
  storyHistory,
  isAdmin,
  adminEditForCard,
  onStartEdit,
  onSetAdminEdit,
}: StoryCardProps) {
  const tiltHandlers = useCardTiltHandlers();
  const newChapterCount = storyHistory
    ? Math.max(0, story.totalChapters - storyHistory.maxReadChapterNumber)
    : 0;
  const statusLabel = storyHistory
    ? newChapterCount > 0
      ? `Mới +${newChapterCount}`
      : "Đã đọc"
    : "Chưa đọc";
  const progressPercent =
    storyHistory && story.totalChapters > 0
      ? Math.min(100, Math.round((storyHistory.maxReadChapterNumber / story.totalChapters) * 100))
      : 0;

  return (
    <Link
      className="story-card"
      href={storyHistory ? storyHref(story, storyHistory.chapterNumber) : storyHref(story)}
      {...tiltHandlers}
    >
      <StoryCover src={story.coverImageUrl} title={story.title} />
      <div className="story-card-body">
        <div className="story-card-heading">
          <div>
            <p className="story-card-kicker">
              <Sparkles size={12} />
              {storyCategoryLabel(story)}
            </p>
            {adminEditForCard?.field === "storyTitle" ? (
              <input
                className="admin-inline-input story-card-admin-input"
                value={adminEditForCard.value}
                autoFocus
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onChange={(event) =>
                  onSetAdminEdit({ storyId: story.id, field: "storyTitle", value: event.target.value })
                }
              />
            ) : (
              <h2
                className={isAdmin ? "story-card-title admin-editable-hidden" : "story-card-title"}
                onClick={(event) => {
                  if (!isAdmin) return;
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onStartEdit(story, "storyTitle", story.title);
                }}
              >
                {story.title}
              </h2>
            )}
          </div>
          <span className={`read-badge ${storyHistory ? "read-badge-active" : ""}`}>{statusLabel}</span>
        </div>
        <div className="story-meta">
          {adminEditForCard?.field === "author" ? (
            <input
              className="admin-inline-input story-card-admin-input"
              value={adminEditForCard.value}
              autoFocus
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onChange={(event) =>
                onSetAdminEdit({ storyId: story.id, field: "author", value: event.target.value })
              }
            />
          ) : (
            <span
              className={isAdmin ? "admin-editable-hidden" : undefined}
              onClick={(event) => {
                if (!isAdmin) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onStartEdit(story, "author", story.author);
              }}
            >
              {story.author || "Unknown author"}
            </span>
          )}
          <span>{story.totalChapters} chương</span>
          {formatStoryUpdatedLabel(story.updatedAt) ? (
            <span className="story-meta-time">{formatStoryUpdatedLabel(story.updatedAt)}</span>
          ) : null}
          {storyHistory ? <span>Tu luyện tiếp {storyHistory.chapterNumber}</span> : null}
          {story.isCompleted ? <span>Hoàn thành</span> : null}
          {story.rankPosition ? <span>#{story.rankPosition}</span> : null}
        </div>
        {adminEditForCard?.field === "description" ? (
          <textarea
            className="admin-content-editor story-card-admin-description"
            value={adminEditForCard.value}
            autoFocus
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onChange={(event) =>
              onSetAdminEdit({ storyId: story.id, field: "description", value: event.target.value })
            }
          />
        ) : (
          <p
            className={isAdmin ? "story-description admin-editable-hidden" : "story-description"}
            onClick={(event) => {
              if (!isAdmin) return;
              event.preventDefault();
              event.stopPropagation();
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartEdit(story, "description", story.description ?? storyDisplayDescription(story));
            }}
          >
            {storyDisplayDescription(story)}
          </p>
        )}
        <div className="story-card-footer">
          <div className="story-progress-mini" aria-label={`Tiến độ ${progressPercent}%`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="story-card-cta">
            {storyHistory ? "Đọc tiếp" : "Chi tiết"}
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
});
