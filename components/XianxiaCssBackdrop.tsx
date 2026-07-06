"use client";

import type { TimeOfDay } from "@/lib/xianxia-time-of-day";

type XianxiaCssBackdropProps = {
  timeOfDay: TimeOfDay;
  /** When WebGL layer is active above, soften CSS so layers do not clash. */
  underWebgl?: boolean;
};

/** Rich CSS xianxia sky — used alone or under optional WebGL overlay. */
export function XianxiaCssBackdrop({ timeOfDay, underWebgl = false }: XianxiaCssBackdropProps) {
  return (
    <div
      className={`xianxia-world-fallback xianxia-css-backdrop${underWebgl ? " xianxia-css-backdrop-under-webgl" : ""}`.trim()}
      data-xi-time={timeOfDay}
      aria-hidden="true"
    >
      <div className="xi-css-sky" />
      <div className="xi-css-ink-wash" />
      <div className="xi-css-mountains" />
      <div className="xi-css-cranes" />
      <div className="xi-css-mist xi-css-mist-a" />
      <div className="xi-css-mist xi-css-mist-b" />
      <div className="xi-css-cloud xi-css-cloud-a" />
      <div className="xi-css-cloud xi-css-cloud-b" />
      <div className="xi-css-cloud xi-css-cloud-c" />
      <div className="xi-css-spirit-dust" />
      {timeOfDay === "night" ? <div className="xi-css-stars" /> : null}
      {(timeOfDay === "dawn" || timeOfDay === "dusk") ? <div className="xi-css-sun-halo" /> : null}
      {timeOfDay === "day" ? <div className="xi-css-jade-glow" /> : null}
    </div>
  );
}
