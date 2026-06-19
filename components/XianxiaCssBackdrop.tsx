"use client";

import type { TimeOfDay } from "@/lib/xianxia-time-of-day";

type XianxiaCssBackdropProps = {
  timeOfDay: TimeOfDay;
};

/** CSS-only sky when decorative WebGL is off (mobile / low-end). */
export function XianxiaCssBackdrop({ timeOfDay }: XianxiaCssBackdropProps) {
  return (
    <div
      className="xianxia-world-fallback xianxia-css-backdrop"
      data-xi-time={timeOfDay}
      aria-hidden="true"
    >
      <div className="xi-css-sky" />
      <div className="xi-css-cloud xi-css-cloud-a" />
      <div className="xi-css-cloud xi-css-cloud-b" />
      <div className="xi-css-cloud xi-css-cloud-c" />
      {timeOfDay === "night" ? <div className="xi-css-stars" /> : null}
      {(timeOfDay === "dawn" || timeOfDay === "dusk") ? <div className="xi-css-sun-halo" /> : null}
    </div>
  );
}
