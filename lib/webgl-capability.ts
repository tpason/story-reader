let cached: boolean | null = null;

export function canUseWebGL() {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    cached = Boolean(context);
  } catch {
    cached = false;
  }

  return cached;
}
