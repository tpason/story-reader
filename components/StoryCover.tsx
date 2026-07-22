"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_COVER = "/default-story-cover.svg";

export function StoryCover({
  src,
  title,
  priority,
  className
}: {
  src: string | null;
  title: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = !src || failed ? FALLBACK_COVER : src;

  return (
    <div className={["cover cover-shimmer", className].filter(Boolean).join(" ")}>
      <Image
        src={resolvedSrc}
        alt={title ? `${title} cover` : "Story cover"}
        width={152}
        height={228}
        sizes="152px"
        priority={priority}
        onLoad={(e) => {
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
