import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";

const PROJECT_ROOT = resolve(process.cwd(), "..");
const HLS_CACHE_ROOT = resolve(process.cwd(), ".cache", "chapter-hls");
const packagingJobs = new Map<string, Promise<void>>();
let packagingQueue: Promise<void> = Promise.resolve();

type HlsMetadata = {
  sourcePath: string;
  sourceSize: number;
  sourceMtimeMs: number;
};

function safeChapterId(chapterId: string) {
  return chapterId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function resolveProjectAudioPath(audioPath: string) {
  const absolutePath = resolve(PROJECT_ROOT, audioPath);
  if (!absolutePath.startsWith(PROJECT_ROOT)) {
    throw new Error("Invalid audio path");
  }
  return absolutePath;
}

export function chapterHlsDirectory(chapterId: string) {
  return resolve(HLS_CACHE_ROOT, safeChapterId(chapterId));
}

export function chapterHlsAssetPath(chapterId: string, assetPath: string[]) {
  const asset = assetPath.join("/");
  const baseDir = chapterHlsDirectory(chapterId);
  const absolutePath = resolve(baseDir, asset);
  if (!absolutePath.startsWith(baseDir)) {
    throw new Error("Invalid HLS asset path");
  }
  return absolutePath;
}

function readMetadata(path: string): HlsMetadata | null {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as HlsMetadata;
  } catch {
    return null;
  }
}

function writeMetadata(path: string, metadata: HlsMetadata) {
  writeFileSync(path, JSON.stringify(metadata, null, 2), "utf-8");
}

function isFreshHls(cacheDir: string, sourcePath: string, metadata: HlsMetadata) {
  const playlistPath = resolve(cacheDir, "master.m3u8");
  const metadataPath = resolve(cacheDir, "metadata.json");
  if (!existsSync(playlistPath) || !existsSync(metadataPath)) return false;
  const sourceStat = statSync(sourcePath);
  return (
    metadata.sourcePath === sourcePath &&
    metadata.sourceSize === sourceStat.size &&
    metadata.sourceMtimeMs === sourceStat.mtimeMs
  );
}

export function getChapterHlsStatus(chapterId: string, audioPath: string) {
  try {
    const sourcePath = resolveProjectAudioPath(audioPath);
    const cacheDir = chapterHlsDirectory(chapterId);
    const metadata = readMetadata(resolve(cacheDir, "metadata.json"));
    const ready = Boolean(metadata && isFreshHls(cacheDir, sourcePath, metadata));
    return {
      ready,
      processing: packagingJobs.has(chapterId),
      playlistUrl: ready ? `/api/chapters/${chapterId}/audio/hls/master.m3u8` : null
    };
  } catch {
    return {
      ready: false,
      processing: false,
      playlistUrl: null
    };
  }
}

function runFfmpeg(sourcePath: string, cacheDir: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const segmentPattern = resolve(cacheDir, "segment_%05d.ts");
    const playlistPath = resolve(cacheDir, "master.m3u8");
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      sourcePath,
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-f",
      "hls",
      "-hls_time",
      "4",
      "-hls_list_size",
      "0",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      segmentPattern,
      playlistPath
    ]);

    let errorOutput = "";
    ffmpeg.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(errorOutput.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function enqueueFfmpeg(sourcePath: string, cacheDir: string) {
  const run = packagingQueue.catch(() => undefined).then(() => runFfmpeg(sourcePath, cacheDir));
  packagingQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function ensureChapterHls(chapterId: string, audioPath: string) {
  const sourcePath = resolveProjectAudioPath(audioPath);
  const sourceStat = statSync(sourcePath);
  const cacheDir = chapterHlsDirectory(chapterId);
  mkdirSync(cacheDir, { recursive: true });

  const metadataPath = resolve(cacheDir, "metadata.json");
  const metadata = readMetadata(metadataPath);
  if (metadata && isFreshHls(cacheDir, sourcePath, metadata)) {
    return resolve(cacheDir, "master.m3u8");
  }

  const existingJob = packagingJobs.get(chapterId);
  if (existingJob) {
    await existingJob;
    return resolve(cacheDir, "master.m3u8");
  }

  const nextMetadata: HlsMetadata = {
    sourcePath,
    sourceSize: sourceStat.size,
    sourceMtimeMs: sourceStat.mtimeMs
  };
  const job = enqueueFfmpeg(sourcePath, cacheDir).then(() => {
    writeMetadata(metadataPath, nextMetadata);
  });
  packagingJobs.set(chapterId, job);
  try {
    await job;
    return resolve(cacheDir, "master.m3u8");
  } finally {
    packagingJobs.delete(chapterId);
  }
}

export function warmChapterHls(chapterId: string, audioPath: string) {
  const status = getChapterHlsStatus(chapterId, audioPath);
  if (status.ready || status.processing) return status;

  const job = ensureChapterHls(chapterId, audioPath).then(
    () => undefined,
    () => undefined
  );
  packagingJobs.set(chapterId, job);
  return {
    ready: false,
    processing: true,
    playlistUrl: null
  };
}

export function streamFileResponse(path: string, contentType: string, cacheControl = "private, max-age=3600") {
  const stats = statSync(path);
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stats.size),
      "Cache-Control": cacheControl
    }
  });
}
