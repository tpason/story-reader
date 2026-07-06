"use client";

/** Pure CSS reader ambience — zero GPU, for mobile / battery saver. */
export function ReaderAmbienceCss() {
  return (
    <div className="reader-ambience-css" aria-hidden="true">
      <div className="reader-xi-light" />
      <div className="reader-xi-rays" />
      <div className="reader-xi-mist reader-xi-mist-a" />
      <div className="reader-xi-mist reader-xi-mist-b" />
      <div className="reader-xi-qi" />
      <div className="reader-xi-wind reader-xi-wind-a" />
      <div className="reader-xi-wind reader-xi-wind-b" />
      <div className="reader-xi-sway reader-xi-sway-left" />
      <div className="reader-xi-sway reader-xi-sway-right" />
      <div className="reader-xi-dust">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="reader-xi-mote" style={{ "--mote-i": i } as React.CSSProperties} />
        ))}
      </div>
      <div className="reader-xi-petals">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="reader-xi-petal" style={{ "--petal-i": i } as React.CSSProperties} />
        ))}
      </div>
      <div className="reader-xi-vignette" />
    </div>
  );
}
