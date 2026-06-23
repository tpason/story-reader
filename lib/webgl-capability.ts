let cachedWebglSupported: boolean | null = null;
let cachedWeakRenderer: boolean | null = null;

const WEAK_RENDERER_PATTERN =
  /(swiftshader|llvmpipe|lavapipe|software renderer|microsoft basic render|mesa offscreen|virgl)/i;

function probeWebGLContext() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
}

export function canUseWebGL() {
  if (cachedWebglSupported !== null) return cachedWebglSupported;
  try {
    cachedWebglSupported = Boolean(probeWebGLContext());
  } catch {
    cachedWebglSupported = false;
  }
  return cachedWebglSupported;
}

export function isWeakWebGLRenderer() {
  if (cachedWeakRenderer !== null) return cachedWeakRenderer;
  if (!canUseWebGL()) {
    cachedWeakRenderer = true;
    return cachedWeakRenderer;
  }

  try {
    const gl = probeWebGLContext();
    if (!gl) {
      cachedWeakRenderer = true;
      return cachedWeakRenderer;
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) {
      cachedWeakRenderer = false;
      return cachedWeakRenderer;
    }

    const vendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "");
    const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "");
    cachedWeakRenderer = WEAK_RENDERER_PATTERN.test(vendor) || WEAK_RENDERER_PATTERN.test(renderer);
  } catch {
    cachedWeakRenderer = false;
  }

  return cachedWeakRenderer;
}
