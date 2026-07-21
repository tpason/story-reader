type ReaderLogoProps = {
  className?: string;
};

/** Brand mark — circular scholar/scroll logo (static PNG). */
export function ReaderLogo({ className }: ReaderLogoProps = {}) {
  return (
    <span className={className ? `brand-mark ${className}` : "brand-mark"} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static brand asset */}
      <img
        className="brand-mark-img"
        src="/brand/linh-quyen-mark-256.png"
        alt=""
        width={64}
        height={64}
        decoding="async"
      />
    </span>
  );
}
