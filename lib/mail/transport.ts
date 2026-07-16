import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { getMailFrom, hasResend, hasSmtp, isMailLogOnly } from "@/lib/mail/config";

export type SendMailInput = {
  to: string;
  subject: string;
  react: ReactElement;
};

export type SendMailResult = { ok: true; mode: "resend" | "smtp" | "log" } | { ok: false; error: string };

async function renderHtml(react: ReactElement) {
  return render(react);
}

async function sendViaResend(to: string, subject: string, html: string): Promise<SendMailResult> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: getMailFrom(),
    to,
    subject,
    html
  });
  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, mode: "resend" };
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<SendMailResult> {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "1";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
  });

  await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject,
    html
  });
  return { ok: true, mode: "smtp" };
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const html = await renderHtml(input.react);

  if (isMailLogOnly()) {
    console.info("[mail:log-only]", {
      to: input.to,
      subject: input.subject,
      htmlLength: html.length
    });
    return { ok: true, mode: "log" };
  }

  if (hasResend()) {
    const result = await sendViaResend(input.to, input.subject, html);
    if (result.ok) return result;
    console.warn("[mail] Resend failed, trying SMTP:", result.error);
  }

  if (hasSmtp()) {
    try {
      return await sendViaSmtp(input.to, input.subject, html);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMTP send failed";
      console.error("[mail] SMTP failed:", message);
      return { ok: false, error: message };
    }
  }

  console.warn("[mail] No transport configured; email not sent to", input.to);
  return { ok: false, error: "Mail transport not configured" };
}
