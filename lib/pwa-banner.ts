const INSTALL_DISMISS_KEY = "pwa-install-dismissed-until";
const PUSH_BANNER_DISMISS_KEY = "pwa-push-banner-dismissed-until";

export function isDismissedUntil(key: string, now = Date.now()) {
  const until = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  return Boolean(until && now < Number(until));
}

export function isInstallBannerDismissed(now = Date.now()) {
  return isDismissedUntil(INSTALL_DISMISS_KEY, now);
}

export function isPushBannerDismissed(now = Date.now()) {
  return isDismissedUntil(PUSH_BANNER_DISMISS_KEY, now);
}

export { INSTALL_DISMISS_KEY, PUSH_BANNER_DISMISS_KEY };
