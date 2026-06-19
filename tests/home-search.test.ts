import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHomeFilterLabels, isHomeSearchActive } from "../lib/home-search.ts";

describe("isHomeSearchActive", () => {
  it("is false for empty params", () => {
    assert.equal(isHomeSearchActive({}), false);
    assert.equal(isHomeSearchActive({ sort: "updated" }), false);
  });

  it("is true for query text", () => {
    assert.equal(isHomeSearchActive({ q: "  tu tiên  " }), true);
  });

  it("is true for filters", () => {
    assert.equal(isHomeSearchActive({ hot: "true" }), true);
    assert.equal(isHomeSearchActive({ sort: "chapters" }), true);
    assert.equal(isHomeSearchActive({ minChapters: "100" }), true);
  });
});

describe("buildHomeFilterLabels", () => {
  it("builds readable labels", () => {
    assert.deepEqual(
      buildHomeFilterLabels({ q: "linh", hot: "true", sort: "title" }),
      ['"linh"', "Hot", "Tên A-Z"],
    );
  });
});
