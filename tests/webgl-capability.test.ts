import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("webgl capability", () => {
  it("exports canUseWebGL helper", async () => {
    const mod = await import("../lib/webgl-capability.ts");
    assert.equal(typeof mod.canUseWebGL, "function");
  });
});
