export function isTodayLocal(value: string | null) {
  if (!value) return false;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
