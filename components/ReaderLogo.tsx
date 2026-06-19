type ReaderLogoProps = {
  className?: string;
};

export function ReaderLogo({ className }: ReaderLogoProps = {}) {
  return (
    <span className={className ? `brand-mark ${className}` : "brand-mark"} aria-hidden="true">
      <svg
        className="brand-mark-svg"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <defs>
          <linearGradient id="lq-mark-fill" x1="18%" y1="12%" x2="82%" y2="88%">
            <stop offset="0%" stopColor="#e8c860" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#c8962e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1a6b5a" stopOpacity="0.30" />
          </linearGradient>
        </defs>

        <g className="brand-vortex" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path strokeWidth="2.6" d="M50 11a39 39 0 0 1 39 39 31 31 0 0 1-31 31" />
          <path strokeWidth="2" opacity="0.72" d="M50 19a31 31 0 0 0-31 31 25 25 0 0 0 25 25" />
          <path strokeWidth="1.5" opacity="0.48" d="M50 27a23 23 0 0 1 23 23" />
          <path className="brand-crescent" strokeWidth="2" d="M31 25a19 19 0 0 1 38 0" />
        </g>

        <g
          className="brand-maiden"
          fill="url(#lq-mark-fill)"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        >
          <path d="M46 58c-2-5 1-11 7-14 4-2 8-1 10 2 2 3 2 8-2 12-2 2-3 6-6 9-3 3-8 4-11 1l-4-5c-2-3 1-8 6-5z" />
          <path d="M52 44c2-3 6-4 9-2 2 1 3 4 1 6-2 2-5 2-7 0-2-2-4-3-3-4z" />
          <path d="M34 70c-8-4-14-12-12-20 2-6 8-9 14-6 3 2 5 5 4 9-1 4-4 12-6 17z" opacity="0.85" />
          <path d="M56 52c6-2 12-6 16-12" strokeWidth="2" fill="none" />
        </g>

        <g className="brand-scrolls" stroke="currentColor" fill="currentColor" fillOpacity="0.14">
          <g className="brand-scroll-a">
            <g transform="rotate(22 64 36)">
              <rect x="58" y="28" width="12" height="16" rx="1.2" strokeWidth="1.4" fill="currentColor" />
              <path strokeWidth="1" fill="none" d="M60 32h8M60 36h6M60 40h7" />
            </g>
          </g>
          <g className="brand-scroll-b">
            <g transform="rotate(-14 36 42)">
              <rect x="30" y="34" width="11" height="15" rx="1.2" strokeWidth="1.4" fill="currentColor" />
              <path strokeWidth="1" fill="none" d="M32 38h7M32 42h5" />
            </g>
          </g>
          <g className="brand-scroll-c">
            <g transform="rotate(38 70 58)">
              <rect x="64" y="50" width="10" height="14" rx="1.2" strokeWidth="1.3" fill="currentColor" />
              <path strokeWidth="1" fill="none" d="M66 54h6M66 58h4" />
            </g>
          </g>
        </g>

        <circle className="brand-spark-dot" cx="74" cy="27" r="2.2" fill="currentColor" opacity="0.75" />
      </svg>
    </span>
  );
}
