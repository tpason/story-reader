"use client";

import { classifyFrameSamples, type WebGLPerfTier } from "@/lib/webgl-performance-classify";
import { canUseWebGL, isWeakWebGLRenderer } from "@/lib/webgl-capability";

export type { WebGLPerfTier } from "@/lib/webgl-performance-classify";
export { classifyFrameSamples } from "@/lib/webgl-performance-classify";

export const WEBGL_PERF_SESSION_KEY = "reader:webgl-perf-tier";
/** Survives tab close so returning readers skip the first-load GPU probe spike. */
export const WEBGL_PERF_LOCAL_KEY = "reader:webgl-perf-tier-v1";
export const WEBGL_PERF_EVENT = "reader:webgl-perf-probed";

const PROBE_DURATION_MS = 720;

let probePromise: Promise<WebGLPerfTier> | null = null;

function parsePerfTier(raw: string | null): Exclude<WebGLPerfTier, "pending"> | null {
  if (raw === "strong" || raw === "weak") return raw;
  return null;
}

export function readCachedWebGLPerfTier(): WebGLPerfTier | null {
  if (typeof window === "undefined") return null;
  const session = parsePerfTier(window.sessionStorage.getItem(WEBGL_PERF_SESSION_KEY));
  if (session) return session;
  const local = parsePerfTier(window.localStorage.getItem(WEBGL_PERF_LOCAL_KEY));
  if (local) {
    window.sessionStorage.setItem(WEBGL_PERF_SESSION_KEY, local);
    return local;
  }
  return null;
}

export function writeCachedWebGLPerfTier(tier: Exclude<WebGLPerfTier, "pending">) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(WEBGL_PERF_SESSION_KEY, tier);
  try {
    window.localStorage.setItem(WEBGL_PERF_LOCAL_KEY, tier);
  } catch {
    // private mode / quota — session cache still works
  }
  window.dispatchEvent(new Event(WEBGL_PERF_EVENT));
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createMiniProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `attribute vec2 a_pos;
     void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`
  );
  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `precision mediump float;
     uniform float u_t;
     void main() {
       vec2 p = gl_FragCoord.xy * 0.01;
       float v = sin(p.x + u_t) * cos(p.y - u_t * 0.7);
       gl_FragColor = vec4(0.12 + v * 0.08, 0.22, 0.28, 1.0);
     }`
  );
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const posLoc = gl.getAttribLocation(program, "a_pos");
  const timeLoc = gl.getUniformLocation(program, "u_t");
  return { program, posLoc, timeLoc };
}

async function measureWebGLFrames(): Promise<number[]> {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;

  const gl = (canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" })
    ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return [];

  const ctx = gl;
  const mini = createMiniProgram(ctx);
  if (!mini) return [];

  const miniProgram = mini;
  const frameMs: number[] = [];
  const start = performance.now();
  let last = start;
  let tick = 0;

  return new Promise((resolve) => {
    function frame(now: number) {
      const delta = now - last;
      if (delta > 0 && tick > 0) frameMs.push(delta);
      last = now;
      tick += 1;

      ctx.useProgram(miniProgram.program);
      ctx.enableVertexAttribArray(miniProgram.posLoc);
      ctx.vertexAttribPointer(miniProgram.posLoc, 2, ctx.FLOAT, false, 0, 0);
      ctx.uniform1f(miniProgram.timeLoc, tick * 0.04);
      for (let i = 0; i < 6; i += 1) {
        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);
      }

      if (now - start < PROBE_DURATION_MS) {
        requestAnimationFrame(frame);
        return;
      }

      canvas.width = 0;
      canvas.height = 0;
      resolve(frameMs);
    }

    requestAnimationFrame(frame);
  });
}

export async function probeWebGLPerformance(options: { force?: boolean } = {}): Promise<WebGLPerfTier> {
  if (typeof window === "undefined") return "weak";

  if (!options.force) {
    const cached = readCachedWebGLPerfTier();
    if (cached) return cached;
  }

  if (!probePromise || options.force) {
    probePromise = (async () => {
      if (!canUseWebGL() || isWeakWebGLRenderer()) {
        writeCachedWebGLPerfTier("weak");
        return "weak";
      }

      const samples = await measureWebGLFrames();
      const tier = classifyFrameSamples(samples);
      writeCachedWebGLPerfTier(tier);
      return tier;
    })();
  }

  return probePromise;
}
