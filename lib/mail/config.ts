export function getMailFrom() {
  return process.env.MAIL_FROM?.trim() || "Linh Quyển Các <noreply@localhost>";
}

export function isMailLogOnly() {
  return process.env.MAIL_LOG_ONLY === "1";
}

export function hasResend() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function hasSmtp() {
  return Boolean(process.env.SMTP_HOST?.trim());
}

export function mailTransportAvailable() {
  return isMailLogOnly() || hasResend() || hasSmtp();
}
