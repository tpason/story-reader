const SOURCE_LABELS: Record<string, string> = {
  truyenfull_today: "TruyenFull",
  truyenyy: "TruyenYY",
  docln: "DocLN",
  sttruyen: "STTruyen",
  truyenchuhay: "TruyenChuHay",
  truyenhoangdung: "TruyenHoangDung",
  wattpad_vn: "Wattpad VN",
  royalroad: "Royal Road",
  lightnovelpub: "Light Novel Pub",
  novelbin: "NovelBin",
  freewebnovel: "FreeWebNovel",
  novelhub: "NovelHub",
  hako: "Hako",
  qidian: "Qidian",
  naver_series: "Naver Series",
  skydemonorder: "Sky Demon Order",
};

/** Human-readable crawl source name for rankings UI. */
export function formatSourceLabel(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "Nguồn";
  return SOURCE_LABELS[trimmed] ?? trimmed.replace(/_/g, " ");
}

/** Board chip label: source + rank board name. */
export function formatRankBoardLabel(sourceCode: string, rankName: string, storyCount?: number): string {
  const source = formatSourceLabel(sourceCode);
  const board = rankName.trim().replace(/_/g, " ");
  const base = board ? `${source} · ${board}` : source;
  return typeof storyCount === "number" ? `${base} (${storyCount})` : base;
}
