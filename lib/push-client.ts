"use client";

export const PUSH_SUBSCRIBED_KEY = "pwa-push-subscribed";

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-key");
    const data = (await res.json()) as { key: string | null };
    return data.key;
  } catch {
    return null;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribePush(swReg: ServiceWorkerRegistration): Promise<boolean> {
  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return false;

  const existingEndpoint = (await swReg.pushManager.getSubscription())?.endpoint ?? null;

  const sub = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });

  const json = sub.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent
    })
  });

  if (!res.ok) {
    if (sub.endpoint !== existingEndpoint) {
      await sub.unsubscribe().catch(() => undefined);
    }
    return false;
  }

  return true;
}

export async function unsubscribePush(swReg: ServiceWorkerRegistration): Promise<void> {
  const sub = await swReg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint })
  }).catch(() => undefined);
}

export async function readPushSubscribed(swReg: ServiceWorkerRegistration): Promise<boolean> {
  const sub = await swReg.pushManager.getSubscription();
  const wasSubscribed = window.localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1";
  return !!sub && wasSubscribed;
}
