import { createElement } from "react";
import { ResetPasswordEmail } from "@/emails/reset-password";
import { VerifyEmail } from "@/emails/verify-email";
import { WelcomeEmail } from "@/emails/welcome-email";
import { WeeklyDigestEmail, type DigestChapterItem, type DigestStoryItem } from "@/emails/weekly-digest";
import { getSiteUrl } from "@/lib/mail/site-url";
import { sendMail } from "@/lib/mail/transport";

export async function sendVerifyEmail(input: { to: string; username: string; token: string }) {
  const verifyUrl = `${getSiteUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  return sendMail({
    to: input.to,
    subject: "Xác thực email — Linh Quyển Các",
    react: createElement(VerifyEmail, { username: input.username, verifyUrl })
  });
}

export async function sendResetPasswordEmail(input: { to: string; username: string; token: string }) {
  const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
  return sendMail({
    to: input.to,
    subject: "Đặt lại mật khẩu — Linh Quyển Các",
    react: createElement(ResetPasswordEmail, { username: input.username, resetUrl })
  });
}

export async function sendWelcomeEmail(input: { to: string; username: string }) {
  return sendMail({
    to: input.to,
    subject: "Email đã xác thực — Linh Quyển Các",
    react: createElement(WelcomeEmail, { username: input.username })
  });
}

export async function sendWeeklyDigestEmail(input: {
  to: string;
  username: string;
  chapters: DigestChapterItem[];
  newStories: DigestStoryItem[];
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${getSiteUrl()}/api/email/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
  return sendMail({
    to: input.to,
    subject: "Bản tin chương mới — Linh Quyển Các",
    react: createElement(WeeklyDigestEmail, {
      username: input.username,
      chapters: input.chapters,
      newStories: input.newStories,
      unsubscribeUrl
    })
  });
}
