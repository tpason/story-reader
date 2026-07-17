"use client";

/**
 * CSS tiểu hồ linh — no window pointer/scroll listeners (reading stays cool).
 * Pose via data-pose; motion is CSS-only and paused while scrolling.
 */

import { memo } from "react";
import type { SpiritPose } from "@/lib/spirit-companion";

type Props = {
  pose?: SpiritPose;
};

function ReaderSpiritCompanionLiteImpl({ pose = "stand" }: Props) {
  return (
    <div className="reader-spirit-companion-lite spirit-xian" data-pose={pose} aria-hidden="true">
      <div className="spirit-xian-stage">
        <div className="spirit-xian-mist" />
        <div className="spirit-xian-tail" />
        <div className="spirit-xian-body">
          <span className="spirit-xian-jade" />
        </div>
        <div className="spirit-xian-head">
          <span className="spirit-xian-ear spirit-xian-ear--l">
            <span className="spirit-xian-ear-in" />
          </span>
          <span className="spirit-xian-ear spirit-xian-ear--r">
            <span className="spirit-xian-ear-in" />
          </span>
          <span className="spirit-xian-eye spirit-xian-eye--l">
            <span className="spirit-xian-pupil" />
          </span>
          <span className="spirit-xian-eye spirit-xian-eye--r">
            <span className="spirit-xian-pupil" />
          </span>
          <span className="spirit-xian-mark" />
          <span className="spirit-xian-snout" />
          <span className="spirit-xian-nose" />
        </div>
      </div>
    </div>
  );
}

export const ReaderSpiritCompanionLite = memo(ReaderSpiritCompanionLiteImpl);
