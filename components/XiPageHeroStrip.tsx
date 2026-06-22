import type { ReactNode } from "react";

type XiPageHeroStripProps = {
  eyebrow: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function XiPageHeroStrip({ eyebrow, title, subtitle, children, className = "" }: XiPageHeroStripProps) {
  return (
    <section className={`library-header xi-page-hero-strip ${className}`.trim()}>
      <div className="xi-page-hero-strip-inner">
        <div className="xi-page-hero-strip-glow" aria-hidden="true" />
        <div className="xi-page-hero-strip-copy">
          <p className="eyebrow xi-page-hero-eyebrow">{eyebrow}</p>
          <h1 className="library-title">{title}</h1>
          {subtitle ? <p className="library-subtitle">{subtitle}</p> : null}
        </div>
        {children ? <div className="xi-page-hero-strip-actions">{children}</div> : null}
      </div>
    </section>
  );
}
