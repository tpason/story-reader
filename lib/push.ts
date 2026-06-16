import * as webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export { VAPID_PUBLIC };

export type PushKeys = { p256dh: string; auth: string };

export async function sendPush(endpoint: string, keys: PushKeys, payload: object) {
  return webpush.sendNotification({ endpoint, keys }, JSON.stringify(payload));
}
