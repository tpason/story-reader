import { Feather } from "lucide-react";
import type { ReactNode } from "react";

type XianxiaEmptyStateProps = {
  title: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
};

export function XianxiaEmptyState({ title, hint, children, className = "" }: XianxiaEmptyStateProps) {
  return (
    <div className={`empty-state xianxia-empty-state ${className}`.trim()}>
      <div className="xianxia-empty-state-inner">
        <div className="xianxia-empty-state-art" aria-hidden="true">
          <span className="xianxia-empty-cloud xi-empty-cloud-a" />
          <span className="xianxia-empty-cloud xi-empty-cloud-b" />
          <Feather className="xianxia-empty-quill" size={24} strokeWidth={1.6} />
        </div>
        <p>{title}</p>
        {hint ? <span className="xianxia-empty-hint">{hint}</span> : null}
        {children}
      </div>
    </div>
  );
}
