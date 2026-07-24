import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeProgressCursor,
  encodeProgressCursor,
  parseReadingProgressLimit
} from "../lib/reading-progress-cursor.ts";

describe("reading-progress cursor + limit", () => {
  it("defaults missing limit to 100 (Number(null) must not become 1)", () => {
    assert.equal(parseReadingProgressLimit(null), 100);
    assert.equal(parseReadingProgressLimit(""), 100);
    assert.equal(parseReadingProgressLimit("24"), 24);
    assert.equal(parseReadingProgressLimit("0"), 1);
    assert.equal(parseReadingProgressLimit("999"), 100);
  });

  it("round-trips a valid cursor", () => {
    const encoded = encodeProgressCursor({
      storyId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      lastReadAt: new Date("2026-07-24T03:00:00.000Z")
    });
    const decoded = decodeProgressCursor(encoded);
    assert.deepEqual(decoded, {
      t: "2026-07-24T03:00:00.000Z",
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    });
  });

  it("ignores base64-valid but invalid timestamp/uuid cursors", () => {
    const bad = Buffer.from(JSON.stringify({ t: "x", id: "y" }), "utf8").toString("base64url");
    assert.equal(decodeProgressCursor(bad), null);

    const badUuid = Buffer.from(
      JSON.stringify({ t: "2026-07-24T03:00:00.000Z", id: "not-a-uuid" }),
      "utf8"
    ).toString("base64url");
    assert.equal(decodeProgressCursor(badUuid), null);
  });
});
