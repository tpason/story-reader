/**
 * One-shot: render + send all production mail templates for visual review.
 * Usage:
 *   RESEND_API_KEY=re_xxx MAIL_FROM='Linh Quyển Các <noreply@linhquyen.cc>' \
 *   PREVIEW_TO=you@example.com npx tsx scripts/send-mail-template-previews.ts
 */
import React from "react";
import {
  sendResetPasswordEmail,
  sendVerifyEmail,
  sendWeeklyDigestEmail,
  sendWelcomeEmail
} from "../lib/mail/send";

// react-email render path expects classic JSX runtime for these components.
(globalThis as unknown as { React: typeof React }).React = React;

async function main() {
  const to = (process.env.PREVIEW_TO ?? "").trim();
  if (!to) {
    console.error("Set PREVIEW_TO=email@example.com");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error("Set RESEND_API_KEY");
    process.exit(1);
  }
  process.env.MAIL_LOG_ONLY = "0";
  process.env.NEXT_PUBLIC_SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://linhquyen.cc";

  const username = "tpason529";
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const results: Array<[string, { ok: boolean; error?: string; mode?: string }]> = [];

  results.push([
    "verify-email",
    await sendVerifyEmail({
      to,
      username,
      token: "preview-verify-token-not-real"
    })
  ]);

  results.push([
    "reset-password",
    await sendResetPasswordEmail({
      to,
      username,
      token: "preview-reset-token-not-real"
    })
  ]);

  results.push(["welcome-email", await sendWelcomeEmail({ to, username })]);

  results.push([
    "weekly-digest",
    await sendWeeklyDigestEmail({
      to,
      username,
      unsubscribeToken: "preview-unsub-token-not-real",
      chapters: [
        {
          storyTitle: "Vĩnh Thoái Hiệp Sĩ (preview)",
          storyHref: `${site}/stories/demo-story`,
          unread: 3,
          nextChapter: 544
        },
        {
          storyTitle: "Truyện mẫu thứ hai",
          storyHref: `${site}/stories/demo-story-2`,
          unread: 1,
          nextChapter: 12
        }
      ],
      newStories: [
        {
          title: "Truyện mới lên kệ (preview)",
          href: `${site}/stories/new-1`,
          author: "Tác giả mẫu"
        }
      ]
    })
  ]);

  for (const [name, result] of results) {
    console.log(name, result);
  }

  if (results.some(([, r]) => !r.ok)) process.exit(2);
  console.log(`Sent 4 template previews → ${to}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
