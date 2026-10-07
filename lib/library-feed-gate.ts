/**
 * Decides when the homepage catalog may request the next page.
 *
 * A sticky sentinel stays intersecting, so "fetch whenever intersecting"
 * drains the whole catalog. Fetch only on the rising edge (sentinel enters
 * the scrollport). While the list is still shorter than the frame, allow a
 * few automatic pages so the shelf is not left empty — then stop until the
 * sentinel actually leaves and the reader scrolls back to it.
 */
export const LIBRARY_AUTO_FILL_CAP = 2;

export type LibraryFeedGate = {
  awaitingLeave: boolean;
  autoFillCount: number;
};

export function nextLibraryFeedGate(
  gate: LibraryFeedGate,
  input: { isIntersecting: boolean; hostOverflows: boolean },
): { gate: LibraryFeedGate; fetch: boolean } {
  if (!input.isIntersecting) {
    return { fetch: false, gate: { ...gate, awaitingLeave: false } };
  }

  if (gate.awaitingLeave) {
    return { fetch: false, gate };
  }

  return {
    fetch: true,
    gate: {
      awaitingLeave: true,
      autoFillCount: input.hostOverflows ? gate.autoFillCount : gate.autoFillCount + 1,
    },
  };
}

/** Re-arm auto-fill after a page lands, only while the frame is still short. */
export function rearmLibraryFeedFill(gate: LibraryFeedGate, hostOverflows: boolean): LibraryFeedGate {
  if (hostOverflows || gate.autoFillCount >= LIBRARY_AUTO_FILL_CAP) return gate;
  return { ...gate, awaitingLeave: false };
}
