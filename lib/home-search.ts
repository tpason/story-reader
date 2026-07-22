import { DISCOVERY_POLISHED_FILTER } from "@/lib/discovery-labels";

export type HomeSearchParams = {
  q?: string;
  author?: string;
  hot?: string;
  completed?: string;
  category?: string;
  minChapters?: string;
  maxChapters?: string;
  hasPolished?: string;
  hasAudio?: string;
  sort?: string;
};

export function isHomeSearchActive(params: HomeSearchParams): boolean {
  const queryText = params.q?.trim();
  const authorText = params.author?.trim();

  return !!(
    queryText ||
    authorText ||
    params.hot === "true" ||
    params.completed === "true" ||
    params.category ||
    Number(params.minChapters) > 0 ||
    Number(params.maxChapters) > 0 ||
    params.hasPolished === "true" ||
    params.hasAudio === "true" ||
    (params.sort && params.sort !== "updated")
  );
}

const SORT_LABELS: Record<string, string> = {
  chapters: "Nhiều chương",
  hot: "Đang hot",
  title: "Tên A-Z",
};

export function buildHomeFilterLabels(params: HomeSearchParams): string[] {
  const labels: string[] = [];
  const queryText = params.q?.trim();
  const authorText = params.author?.trim();

  if (queryText) labels.push(`"${queryText}"`);
  if (authorText) labels.push(`Tác giả: ${authorText}`);
  if (params.hot === "true") labels.push("Hot");
  if (params.completed === "true") labels.push("Hoàn thành");
  if (params.category) labels.push(params.category);
  if (Number(params.minChapters) > 0) labels.push(`Từ ${params.minChapters} chương`);
  if (Number(params.maxChapters) > 0) labels.push(`Đến ${params.maxChapters} chương`);
  if (params.hasPolished === "true") labels.push(DISCOVERY_POLISHED_FILTER);
  if (params.hasAudio === "true") labels.push("Có audio");
  if (params.sort && params.sort !== "updated") {
    labels.push(SORT_LABELS[params.sort] ?? params.sort);
  }

  return labels;
}
