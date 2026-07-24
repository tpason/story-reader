"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_COVER = "/default-story-cover.svg";

/** Tiny neutral placeholder — avoids empty cover flash without per-image blur hashes. */
const COVER_BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="152" height="228"><rect width="100%" height="100%" fill="#d4c4a8"/></svg>`
  );

export function StoryCover({
  src,
  title,
  priority,
  className,
  /** Destination hero on story detail — CSS assigns view-transition-name when VT allowed. */
  viewTransitionHero
}: {
  src: string | null;
  title: string;
  priority?: boolean;
  className?: string;
  viewTransitionHero?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const resolvedSrc = !src || failed ? FALLBACK_COVER : src;
  const showShimmer = !loaded && !priority;

  return (
    <div
      className={[
        "cover",
        showShimmer ? "cover-shimmer" : "",
        viewTransitionHero ? "story-cover-vt-hero" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      data-story-cover=""
    >
      <Image
        src={resolvedSrc}
        alt={title ? `${title} cover` : "Story cover"}
        width={152}
        height={228}
        sizes="152px"
        priority={priority}
        placeholder={resolvedSrc === FALLBACK_COVER ? "empty" : "blur"}
        blurDataURL={COVER_BLUR_DATA_URL}
        onLoad={(e) => {
          setLoaded(true);
          const img = e.currentTarget as HTMLImageElement;
          img.closest(".cover-shimmer")?.classList.remove("cover-shimmer");
        }}
        onError={() => {
          if (!failed) setFailed(true);
        }}
      />
    </div>
  );
}
