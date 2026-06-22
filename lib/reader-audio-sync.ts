import { countReadableWords } from "./reading-estimate.ts";

export function buildParagraphProgressWeights(paragraphs: string[]) {
  const weights = paragraphs.map((paragraph) => Math.max(1, countReadableWords(paragraph)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return paragraphs.map((_, index) => (index + 1) / Math.max(1, paragraphs.length));
  }

  let cumulative = 0;
  return weights.map((weight) => {
    cumulative += weight / total;
    return cumulative;
  });
}

export function paragraphIndexForAudioProgress(weights: number[], progressRatio: number) {
  if (weights.length === 0) return 0;
  const clamped = Math.min(0.9999, Math.max(0, progressRatio));
  const index = weights.findIndex((end) => clamped <= end);
  return index >= 0 ? index : weights.length - 1;
}

export function computeSegmentModeProgress(
  segments: Array<{ durationSeconds: number | null }>,
  currentSegmentIndex: number | null,
  currentTime: number
) {
  if (segments.length === 0 || currentSegmentIndex === null) return 0;

  const durations = segments.map((segment) => Math.max(0, segment.durationSeconds ?? 0));
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);

  if (totalDuration <= 0) {
    const segmentDuration = Math.max(1, durations[currentSegmentIndex] ?? 1);
    return Math.min(0.999, (currentSegmentIndex + currentTime / segmentDuration) / segments.length);
  }

  let elapsed = 0;
  for (let index = 0; index < currentSegmentIndex; index += 1) {
    elapsed += durations[index] ?? 0;
  }
  elapsed += Math.max(0, currentTime);
  return Math.min(0.999, elapsed / totalDuration);
}

export function computeFileModeProgress(currentTime: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(0.999, Math.max(0, currentTime / duration));
}
