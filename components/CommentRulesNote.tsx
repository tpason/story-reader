import { ShieldAlert } from "lucide-react";
import {
  COMMENT_RULES,
  COMMENT_RULES_EYEBROW,
  COMMENT_RULES_SHORT
} from "@/lib/comment-rules";

type CommentRulesNoteProps = {
  /** `compact` = one-line tip (composer / homepage). `list` = full rules. */
  variant?: "compact" | "list";
  className?: string;
};

export function CommentRulesNote({ variant = "compact", className }: CommentRulesNoteProps) {
  if (variant === "list") {
    return (
      <aside className={["comment-rules", "comment-rules-list", className].filter(Boolean).join(" ")}>
        <p className="eyebrow">{COMMENT_RULES_EYEBROW}</p>
        <ul>
          {COMMENT_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </aside>
    );
  }

  return (
    <p className={["comment-rules", "comment-rules-compact", className].filter(Boolean).join(" ")}>
      <ShieldAlert size={14} aria-hidden />
      <span>{COMMENT_RULES_SHORT}</span>
    </p>
  );
}
