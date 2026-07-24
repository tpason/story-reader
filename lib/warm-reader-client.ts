/** Fire-and-forget dynamic import so chapter routes do not wait on the ReaderClient chunk. */
let readerClientWarmStarted = false;

export function warmReaderClientChunk() {
  if (readerClientWarmStarted) return;
  readerClientWarmStarted = true;
  void import("@/components/ReaderClient");
}
