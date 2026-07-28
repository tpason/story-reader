export type ParsedImportChapter = {
  title: string;
  content: string;
  wordCount: number;
};

const MARKER_PATTERNS = [
  /^={3,}\s*Chapter\s+(\d+)\s*[:\-—–]?\s*(.*?)\s*={3,}\s*$/iu,
  /^={3,}\s*Chương\s+(\d+)\s*[:\-—–]?\s*(.*?)\s*={3,}\s*$/iu,
  /^#\s*Chapter\s+(\d+)\s*[:\-—–]?\s*(.*?)\s*$/iu,
  /^#\s*Chương\s+(\d+)\s*[:\-—–]?\s*(.*?)\s*$/iu,
  /^Chapter\s+(\d+)\s*[:\-—–.]\s*(.*?)\s*$/iu,
  /^Chương\s+(\d+)\s*[:\-—–.]\s*(.*?)\s*$/iu
];

function wordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function normalizeBody(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Collapse soft line-breaks (Royal Road clean-paste style) into paragraphs. */
export function cleanPaste(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean)
    .join("\n\n");
}

function chapterFromParts(title: string, body: string): ParsedImportChapter | null {
  const content = normalizeBody(body);
  if (content.length < 20) return null;
  return {
    title: title.trim() || "Chương",
    content,
    wordCount: wordCount(content)
  };
}

/** Split a single TXT/MD blob into chapters by common heading markers. */
export function parseImportText(raw: string, options: { cleanPaste?: boolean } = {}): ParsedImportChapter[] {
  const text = options.cleanPaste ? cleanPaste(raw) : raw.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const chapters: ParsedImportChapter[] = [];
  let currentTitle: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentTitle == null && buffer.length === 0) return;
    const title = currentTitle ?? `Chương ${chapters.length + 1}`;
    const parsed = chapterFromParts(title, buffer.join("\n"));
    if (parsed) chapters.push(parsed);
    buffer = [];
  };

  for (const line of lines) {
    let matched = false;
    for (const pattern of MARKER_PATTERNS) {
      const m = line.trim().match(pattern);
      if (!m) continue;
      flush();
      const num = m[1];
      const rest = (m[2] || "").trim();
      currentTitle = rest ? `Chương ${num}: ${rest}` : `Chương ${num}`;
      matched = true;
      break;
    }
    if (!matched) buffer.push(line);
  }
  flush();

  if (chapters.length === 0) {
    const single = chapterFromParts("Chương 1", text);
    return single ? [single] : [];
  }
  return chapters;
}

/** Multi-file import: one chapter per file, sorted by name. */
export function parseImportFiles(
  files: Array<{ name: string; text: string }>,
  options: { cleanPaste?: boolean } = {}
): ParsedImportChapter[] {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const chapters: ParsedImportChapter[] = [];
  for (const [index, file] of sorted.entries()) {
    const text = options.cleanPaste ? cleanPaste(file.text) : file.text;
    const base = file.name.replace(/\.(txt|md|markdown)$/i, "");
    const titleMatch = base.match(/(?:chapter|chương|chuong)?\s*0*(\d+)\s*[-_.]?\s*(.*)$/iu);
    const title = titleMatch
      ? `Chương ${titleMatch[1]}${titleMatch[2] ? `: ${titleMatch[2].trim()}` : ""}`
      : base || `Chương ${index + 1}`;
    const parsed = chapterFromParts(title, text);
    if (parsed) chapters.push({ ...parsed, title: parsed.title === "Chương" ? title : parsed.title });
  }
  return chapters;
}
