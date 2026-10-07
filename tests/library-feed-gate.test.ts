import assert from "node:assert/strict";
import test from "node:test";
import {
  LIBRARY_AUTO_FILL_CAP,
  nextLibraryFeedGate,
  rearmLibraryFeedFill,
  type LibraryFeedGate,
} from "../lib/library-feed-gate.ts";

const idle: LibraryFeedGate = { awaitingLeave: false, autoFillCount: 0 };

test("overflowing shelf fetches once per visit, not on every intersecting tick", () => {
  const first = nextLibraryFeedGate(idle, { isIntersecting: true, hostOverflows: true });
  assert.equal(first.fetch, true);

  const stuck = nextLibraryFeedGate(first.gate, { isIntersecting: true, hostOverflows: true });
  assert.equal(stuck.fetch, false);
  assert.equal(stuck.gate.awaitingLeave, true);

  const left = nextLibraryFeedGate(stuck.gate, { isIntersecting: false, hostOverflows: true });
  assert.equal(left.fetch, false);
  assert.equal(left.gate.awaitingLeave, false);

  const again = nextLibraryFeedGate(left.gate, { isIntersecting: true, hostOverflows: true });
  assert.equal(again.fetch, true);
});

test("short shelf auto-fills up to the cap, then waits for a real scroll", () => {
  let gate = idle;
  for (let i = 0; i < LIBRARY_AUTO_FILL_CAP; i += 1) {
    gate = rearmLibraryFeedFill(gate, false);
    const step = nextLibraryFeedGate(gate, { isIntersecting: true, hostOverflows: false });
    assert.equal(step.fetch, true);
    gate = step.gate;
  }

  gate = rearmLibraryFeedFill(gate, false);
  const blocked = nextLibraryFeedGate(gate, { isIntersecting: true, hostOverflows: false });
  assert.equal(blocked.fetch, false);

  const left = nextLibraryFeedGate(blocked.gate, { isIntersecting: false, hostOverflows: true });
  const scrolled = nextLibraryFeedGate(left.gate, { isIntersecting: true, hostOverflows: true });
  assert.equal(scrolled.fetch, true);
});

test("rearm does not chain another page once the shelf scrolls", () => {
  const fetched = nextLibraryFeedGate(idle, { isIntersecting: true, hostOverflows: true });
  const rearmed = rearmLibraryFeedFill(fetched.gate, true);
  assert.equal(rearmed.awaitingLeave, true);
  const repeat = nextLibraryFeedGate(rearmed, { isIntersecting: true, hostOverflows: true });
  assert.equal(repeat.fetch, false);
});
