import test from "node:test";
import assert from "node:assert/strict";
import { secureTokenEqual } from "../lib/secure-compare.ts";

test("secureTokenEqual accepts matching tokens", () => {
  assert.equal(secureTokenEqual("abc123", "abc123"), true);
});

test("secureTokenEqual rejects mismatched tokens", () => {
  assert.equal(secureTokenEqual("abc123", "abc124"), false);
});

test("secureTokenEqual rejects empty or missing values", () => {
  assert.equal(secureTokenEqual("", "secret"), false);
  assert.equal(secureTokenEqual(null, "secret"), false);
  assert.equal(secureTokenEqual("secret", ""), false);
});

test("secureTokenEqual rejects different lengths", () => {
  assert.equal(secureTokenEqual("short", "much-longer-secret"), false);
});
