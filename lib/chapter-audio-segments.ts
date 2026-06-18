import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import { extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { query } from "@/lib/db";

const PROJECT_ROOT = resolve(process.cwd(), "..");
const DEFAULT_VOICE_KEY = "xianxia_story_male";
const execFileAsync = promisify(execFile);
const FIRST_SEGMENT_MAX_CHARS = 180;
const FIRST_SEGMENT_MIN_CHARS = 40;
const MAX_SEGMENT_CHARS = 360;
const MIN_SEGMENT_CHARS = 80;
const DEFAULT_BLOCKING_JOB_TYPES = ["audio_chapter_segments", "audio_chapter", "polish_chapter"];
const AUDIO_TYPES: Record<string, string> = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg"
};

type ChapterAudioSourceRow = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  audio_path: string | null;
  is_audio_generated: boolean;
  raw_text_path: string | null;
  translated_text_path: string | null;
  polished_text_path: string | null;
  raw_text_content: string | null;
  translated_text_content: string | null;
  polished_text_content: string | null;
};

type SegmentRow = {
  segment_index: number;
  status: "pending" | "running" | "ready" | "failed";
  audio_path: string | null;
  duration_seconds: string | null;
};

type AudioJobPressureRow = {
  running_count: string;
  queued_count: string;
};

type SameChapterJobRow = {
  status: string;
};

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function listEnv(name: string, fallback: string[]) {
  return (process.env[name] ?? fallback.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readGpuFreeGb() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi", ["--query-gpu=memory.free", "--format=csv,noheader,nounits"], { timeout: 2500 });
    const first = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (!first) return null;
    const mib = Number(first);
    return Number.isFinite(mib) ? mib / 1024 : null;
  } catch {
    return null;
  }
}

export async function checkAudioSegmentStartGate(chapterId: string) {
  const blockingJobTypes = listEnv("AUDIO_API_BLOCKING_JOB_TYPES", DEFAULT_BLOCKING_JOB_TYPES);
  const maxRunning = numberEnv("AUDIO_API_MAX_RUNNING_JOBS", 1);
  const maxQueued = numberEnv("AUDIO_API_MAX_QUEUED_JOBS", 1);
  const minFreeRamGb = numberEnv("AUDIO_API_MIN_FREE_RAM_GB", 1.5);
  const maxLoadPerCpu = numberEnv("AUDIO_API_MAX_LOAD_PER_CPU", 0.9);
  const minFreeVramGb = numberEnv("AUDIO_API_MIN_FREE_VRAM_GB", numberEnv("AUDIO_SEGMENT_VIENEU_MIN_FREE_VRAM_GB", 0));

  const sameChapterJobs = await query<SameChapterJobRow>(
    `
      SELECT status
      FROM story_jobs
      WHERE chapter_id = $1
        AND job_type = 'audio_chapter_segments'
        AND status IN ('pending', 'running')
      LIMIT 1
    `,
    [chapterId]
  );
  if (sameChapterJobs[0]) {
    return {
      canStart: true,
      existing: true,
      reason: "already_queued",
      message: "Audio của chương này đang được tạo. Vui lòng đợi đoạn đầu sẵn sàng.",
      retryAfterSeconds: 5,
      metrics: null
    };
  }

  const pressureRows = await query<AudioJobPressureRow>(
    `
      SELECT
        COUNT(*) FILTER (WHERE status = 'running')::text AS running_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND run_after <= now())::text AS queued_count
      FROM story_jobs
      WHERE job_type = ANY($1::text[])
        AND status IN ('pending', 'running')
        AND (chapter_id IS NULL OR chapter_id <> $2)
    `,
    [blockingJobTypes, chapterId]
  );
  const runningCount = Number(pressureRows[0]?.running_count ?? 0);
  const queuedCount = Number(pressureRows[0]?.queued_count ?? 0);

  const cpuCount = Math.max(1, os.cpus().length);
  const loadPerCpu = os.loadavg()[0] / cpuCount;
  const freeRamGb = os.freemem() / 1024**3;
  const gpuFreeGb = minFreeVramGb > 0 ? await readGpuFreeGb() : null;
  const metrics = {
    runningCount,
    queuedCount,
    freeRamGb: Number(freeRamGb.toFixed(2)),
    loadPerCpu: Number(loadPerCpu.toFixed(2)),
    gpuFreeGb: gpuFreeGb === null ? null : Number(gpuFreeGb.toFixed(2)),
    blockingJobTypes
  };

  if (runningCount >= maxRunning) {
    return {
      canStart: false,
      existing: false,
      reason: "audio_worker_busy",
      message: "Máy đang tạo audio cho chương khác. Vui lòng đợi một chút để tránh quá tải GPU.",
      retryAfterSeconds: 10,
      metrics
    };
  }
  if (queuedCount >= maxQueued) {
    return {
      canStart: false,
      existing: false,
      reason: "audio_queue_full",
      message: "Hàng đợi audio đang đầy. Vui lòng thử lại sau vài giây.",
      retryAfterSeconds: 10,
      metrics
    };
  }
  if (freeRamGb < minFreeRamGb) {
    return {
      canStart: false,
      existing: false,
      reason: "low_ram",
      message: "Máy đang thiếu RAM trống để tạo audio. Vui lòng đợi tác vụ hiện tại hoàn tất.",
      retryAfterSeconds: 15,
      metrics
    };
  }
  if (loadPerCpu > maxLoadPerCpu) {
    return {
      canStart: false,
      existing: false,
      reason: "high_cpu",
      message: "CPU đang bận, tạm hoãn tạo audio để tránh giật lag.",
      retryAfterSeconds: 15,
      metrics
    };
  }
  if (gpuFreeGb !== null && gpuFreeGb < minFreeVramGb) {
    return {
      canStart: false,
      existing: false,
      reason: "low_vram",
      message: "GPU không đủ VRAM trống để tạo audio. Vui lòng đợi tác vụ hiện tại hoàn tất.",
      retryAfterSeconds: 15,
      metrics
    };
  }

  return {
    canStart: true,
    existing: false,
    reason: "ready",
    message: null,
    retryAfterSeconds: 0,
    metrics
  };
}

function resolveProjectPath(path: string) {
  const absolutePath = resolve(PROJECT_ROOT, path);
  if (!absolutePath.startsWith(PROJECT_ROOT)) {
    throw new Error("Invalid project path");
  }
  return absolutePath;
}

function readProjectText(path: string | null) {
  if (!path) return null;
  const absolutePath = resolveProjectPath(path);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf-8");
}

function contentFromChapter(row: ChapterAudioSourceRow) {
  return (
    row.polished_text_content ??
    row.translated_text_content ??
    row.raw_text_content ??
    readProjectText(row.polished_text_path) ??
    readProjectText(row.translated_text_path) ??
    readProjectText(row.raw_text_path)
  );
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function splitSentences(text: string) {
  const normalized = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const parts = Array.from(normalized.matchAll(/[\s\S]+?(?:[.!?。！？…]+["'”’)]*|$)(?=\s+|$)/gu))
    .map((match) => match[0].trim())
    .filter(Boolean);
  return parts.length ? parts : normalized.split(/\n+/).map((part) => part.trim()).filter(Boolean);
}

function splitAtWordBoundary(text: string, maxChars: number) {
  if (text.length <= maxChars) return [text];
  const segments: string[] = [];
  let rest = text.trim();

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1);
    const boundary = Math.max(window.lastIndexOf(" "), window.lastIndexOf(","), window.lastIndexOf(";"), window.lastIndexOf("，"), window.lastIndexOf("；"));
    const cut = boundary >= Math.floor(maxChars * 0.55) ? boundary + 1 : maxChars;
    segments.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) segments.push(rest);
  return segments;
}

export function splitAudioSegments(text: string) {
  const sentences = splitSentences(text);
  const segments: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const maxChars = segments.length === 0 ? FIRST_SEGMENT_MAX_CHARS : MAX_SEGMENT_CHARS;
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) segments.push(current);
    if (segments.length === 0 && sentence.length > FIRST_SEGMENT_MAX_CHARS) {
      const [firstPart, ...restParts] = splitAtWordBoundary(sentence, FIRST_SEGMENT_MAX_CHARS);
      segments.push(firstPart);
      const rest = restParts.join(" ").trim();
      if (!rest) {
        current = "";
        continue;
      }
      if (rest.length <= MAX_SEGMENT_CHARS) {
        current = rest;
        continue;
      }
      splitAtWordBoundary(rest, MAX_SEGMENT_CHARS).forEach((part) => segments.push(part));
      current = "";
      continue;
    }
    if (sentence.length <= MAX_SEGMENT_CHARS) {
      current = sentence;
      continue;
    }
    splitAtWordBoundary(sentence, MAX_SEGMENT_CHARS).forEach((part) => segments.push(part));
    current = "";
  }

  if (current) segments.push(current);
  const packed: string[] = [];
  for (const segment of segments) {
    const previous = packed.at(-1);
    const minChars = packed.length === 1 ? FIRST_SEGMENT_MIN_CHARS : MIN_SEGMENT_CHARS;
    if (previous && previous.length < minChars && previous.length + segment.length + 1 <= MAX_SEGMENT_CHARS) {
      packed[packed.length - 1] = `${previous} ${segment}`;
    } else {
      packed.push(segment);
    }
  }
  return packed;
}

export async function prepareChapterAudioSegments(chapterId: string, voiceKey = DEFAULT_VOICE_KEY) {
  const rows = await query<ChapterAudioSourceRow>(
    `
      SELECT id, story_id, chapter_number, title, audio_path, is_audio_generated,
             raw_text_path, translated_text_path, polished_text_path,
             raw_text_content, translated_text_content, polished_text_content
      FROM chapters
      WHERE id = $1
      LIMIT 1
    `,
    [chapterId]
  );
  const chapter = rows[0];
  if (!chapter) throw new Error("Chapter not found");

  const content = contentFromChapter(chapter);
  if (!content?.trim()) throw new Error("Chapter has no text content");

  const segments = splitAudioSegments(content);
  if (!segments.length) throw new Error("Chapter has no segmentable text");

  await query(
    `
      DELETE FROM chapter_audio_segments
      WHERE chapter_id = $1
        AND voice_key = $2
        AND segment_index >= $3
    `,
    [chapterId, voiceKey, segments.length]
  );

  for (const [index, segmentText] of segments.entries()) {
    await query(
      `
        INSERT INTO chapter_audio_segments (
          chapter_id, story_id, segment_index, text_hash, text_content, voice_key, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        ON CONFLICT (chapter_id, voice_key, segment_index)
        DO UPDATE SET
          text_content = EXCLUDED.text_content,
          text_hash = EXCLUDED.text_hash,
          status = CASE
            WHEN chapter_audio_segments.text_hash = EXCLUDED.text_hash
             AND chapter_audio_segments.status = 'ready'
             AND chapter_audio_segments.audio_path IS NOT NULL THEN 'ready'
            WHEN chapter_audio_segments.text_hash = EXCLUDED.text_hash
             AND chapter_audio_segments.status = 'running' THEN 'running'
            ELSE 'pending'
          END,
          error = NULL,
          updated_at = now()
      `,
      [chapterId, chapter.story_id, index, sha256(segmentText), segmentText, voiceKey]
    );
  }

  await query(
    `
      INSERT INTO story_jobs (job_type, chapter_id, story_id, model, payload, priority, max_attempts)
      VALUES ('audio_chapter_segments', $1, $2, 'vieneu', $3::jsonb, 40, 2)
      ON CONFLICT (job_type, chapter_id)
      DO UPDATE SET
        model = EXCLUDED.model,
        payload = story_jobs.payload || EXCLUDED.payload,
        priority = LEAST(story_jobs.priority, EXCLUDED.priority),
        status = CASE WHEN story_jobs.status = 'running' THEN 'running' ELSE 'pending' END,
        attempts = CASE WHEN story_jobs.status = 'running' THEN story_jobs.attempts ELSE 0 END,
        run_after = CASE WHEN story_jobs.status = 'running' THEN story_jobs.run_after ELSE now() END,
        locked_by = CASE WHEN story_jobs.status = 'running' THEN story_jobs.locked_by ELSE NULL END,
        locked_at = CASE WHEN story_jobs.status = 'running' THEN story_jobs.locked_at ELSE NULL END,
        updated_at = now()
    `,
    [chapterId, chapter.story_id, JSON.stringify({ voice_key: voiceKey, segment_count: segments.length })]
  );

  return getChapterAudioSegmentStatus(chapterId, voiceKey);
}

export async function getChapterAudioSegmentStatus(chapterId: string, voiceKey = DEFAULT_VOICE_KEY) {
  const rows = await query<SegmentRow>(
    `
      SELECT segment_index, status, audio_path, duration_seconds
      FROM chapter_audio_segments
      WHERE chapter_id = $1
        AND voice_key = $2
      ORDER BY segment_index ASC
    `,
    [chapterId, voiceKey]
  );
  const ready = rows.filter((row) => row.status === "ready" && row.audio_path);
  const failed = rows.filter((row) => row.status === "failed").length;
  const running = rows.some((row) => row.status === "running");
  const pending = rows.some((row) => row.status === "pending");
  return {
    segmentCount: rows.length,
    readyCount: ready.length,
    failedCount: failed,
    processing: running || pending,
    complete: rows.length > 0 && ready.length === rows.length,
    firstReadySegmentUrl: ready[0] ? `/api/chapters/${chapterId}/audio/segments/${ready[0].segment_index}` : null,
    segments: rows.map((row) => ({
      index: row.segment_index,
      status: row.status,
      durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
      url: row.status === "ready" && row.audio_path ? `/api/chapters/${chapterId}/audio/segments/${row.segment_index}` : null
    }))
  };
}

export async function getChapterAudioSegmentPath(chapterId: string, segmentIndex: number, voiceKey = DEFAULT_VOICE_KEY) {
  const rows = await query<{ audio_path: string | null }>(
    `
      SELECT audio_path
      FROM chapter_audio_segments
      WHERE chapter_id = $1
        AND voice_key = $2
        AND segment_index = $3
        AND status = 'ready'
      LIMIT 1
    `,
    [chapterId, voiceKey, segmentIndex]
  );
  return rows[0]?.audio_path ?? null;
}

export function streamAudioSegment(path: string) {
  return streamAudioSegmentWithRange(path);
}

export function streamAudioSegmentWithRange(path: string, request?: Request) {
  const absolutePath = resolveProjectPath(path);
  const stats = statSync(absolutePath);
  const contentType = AUDIO_TYPES[extname(absolutePath).toLowerCase()] ?? "application/octet-stream";
  const range = request?.headers.get("range");
  const commonHeaders = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400"
  };

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : stats.size - 1;
    if (!match || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= stats.size) {
      return new Response(null, {
        status: 416,
        headers: {
          ...commonHeaders,
          "Content-Range": `bytes */${stats.size}`
        }
      });
    }
    const boundedEnd = Math.min(end, stats.size - 1);
    const stream = Readable.toWeb(createReadStream(absolutePath, { start, end: boundedEnd })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(boundedEnd - start + 1),
        "Content-Range": `bytes ${start}-${boundedEnd}/${stats.size}`
      }
    });
  }

  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      ...commonHeaders,
      "Content-Length": String(stats.size)
    }
  });
}
