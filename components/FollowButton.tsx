"use client";

import { BellPlus, BellRing } from "lucide-react";
import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { followStoryOnServer, unfollowStoryOnServer } from "@/lib/api-client";
import { storyToFollowItem } from "@/lib/follows";
import type { StorySummary } from "@/lib/types";
import { followStory, mergeFollows, toggleFollowStory } from "@/lib/store";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { prefersReducedMotion } from "@/lib/browser";

type FollowButtonProps = {
  story: StorySummary;
  compact?: boolean;
  className?: string;
};

export function FollowButton({ story, compact = false, className = "" }: FollowButtonProps) {
  const dispatch = useAppDispatch();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const user = useAppSelector((state) => state.identity.user);
  const followed = useAppSelector((state) => state.follows.items.some((item) => item.storyId === story.id));

  useEffect(() => {
    if (followed) dispatch(followStory(storyToFollowItem(story)));
  }, [dispatch, followed, story]);

  return (
    <button
      className={`${compact ? "icon-button follow-icon-button" : "chip follow-button"} ${followed ? "follow-button-active" : ""} ${className}`}
      ref={buttonRef}
      type="button"
      title={followed ? "Bỏ theo dõi" : "Theo dõi truyện"}
      aria-pressed={followed}
      onClick={() => {
        const shouldFollow = !followed;
        dispatch(toggleFollowStory(storyToFollowItem(story)));
        if (user) {
          const request = shouldFollow ? followStoryOnServer(story.id) : unfollowStoryOnServer(story.id).then(() => []);
          request
            .then((remoteFollows) => {
              if (remoteFollows.length > 0) dispatch(mergeFollows(remoteFollows));
            })
            .catch(() => undefined);
        }
        if (buttonRef.current && !prefersReducedMotion()) {
          animate(buttonRef.current, {
            scale: [1, 1.08, 1],
            rotate: followed ? [0, -4, 0] : [0, 5, 0],
            duration: 360,
            ease: "outBack"
          });
        }
      }}
    >
      {followed ? <BellRing size={compact ? 17 : 16} /> : <BellPlus size={compact ? 17 : 16} />}
      {compact ? null : <span>{followed ? "Đang theo dõi" : "Theo dõi"}</span>}
    </button>
  );
}
