"use client";

export type StoredReaderUser = {
  id: string;
  username: string;
  email: string | null;
  isAdmin?: boolean;
};

const USER_KEY = "reader:current-user";

export function storeCurrentUser(user: StoredReaderUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("reader-auth-updated", { detail: user }));
}

export function clearCurrentUser() {
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("reader-auth-updated", { detail: null }));
}

export function readCurrentUser() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USER_KEY) ?? "null") as StoredReaderUser | null;
    if (!parsed?.id || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function avatarGradient(username: string) {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = (hash * 31 + username.charCodeAt(index)) % 360;
  }

  return {
    from: `hsl(${hash} 72% 44%)`,
    to: `hsl(${(hash + 42) % 360} 70% 58%)`
  };
}

export function avatarInitial(username: string) {
  return username.trim().slice(0, 1).toUpperCase() || "Đ";
}
