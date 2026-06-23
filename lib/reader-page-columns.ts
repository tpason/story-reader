export const READER_PAGE_COLUMNS_KEY = "reader:page-columns";

export type ReaderPageColumns = 1 | 2;

export function readReaderPageColumns(): ReaderPageColumns {
  if (typeof window === "undefined") return 1;
  return window.localStorage.getItem(READER_PAGE_COLUMNS_KEY) === "2" ? 2 : 1;
}

export function writeReaderPageColumns(columns: ReaderPageColumns) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_PAGE_COLUMNS_KEY, String(columns));
}
