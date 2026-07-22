/** Shared copy + light server validation for luận đạo. */

export const COMMENT_RULES = [
  "Không dùng ngôn từ thô tục, xúc phạm đạo hữu.",
  "Không tuyên truyền phá hoại chính trị, kích động chia rẽ.",
  "Không spam, spoiler nặng, hay quấy rối."
] as const;

export const COMMENT_RULES_EYEBROW = "Quy tắc luận đạo";

export const COMMENT_RULES_SHORT =
  "Giữ khẩu khí thanh khiết — không văn tục, không phá chính trị.";

export const MAX_COMMENT_LENGTH = 1600;
export const MIN_COMMENT_LENGTH = 2;

/** Basic banned patterns — not a full filter; admin moderation remains the backstop. */
const BANNED_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\b(địt|đụ|cặc|lồn|đéo|đĩ|fuck|shit|bitch)\b/iu, reason: "Đạo luận chứa ngôn từ thô tục." },
  {
    re: /\b(lật đổ|phản động|kích động bạo loạn|phá hoại chính trị)\b/iu,
    reason: "Đạo luận không được phá chính trị hay kích động."
  }
];

export function validateCommentContent(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.replace(/\s+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();

  if (text.length < MIN_COMMENT_LENGTH) {
    return { ok: false, error: "Đạo luận cần ít nhất 2 ký tự." };
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Đạo luận tối đa ${MAX_COMMENT_LENGTH} ký tự.` };
  }

  for (const rule of BANNED_PATTERNS) {
    if (rule.re.test(text)) {
      return { ok: false, error: rule.reason };
    }
  }

  return { ok: true, text };
}
