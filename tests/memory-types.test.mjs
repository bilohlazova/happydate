import assert from "node:assert/strict";
import test from "node:test";

import {
  getMemoryKind,
  normalizeStoredMemoryType,
} from "../src/lib/repositories/memory.types.ts";

test("null maps to stored type note", () => {
  assert.equal(normalizeStoredMemoryType(null), "note");
});

test("blank maps to stored type note", () => {
  assert.equal(normalizeStoredMemoryType(""), "note");
});

test("whitespace and casing are normalized", () => {
  assert.equal(normalizeStoredMemoryType("  Coffee "), "coffee");
  assert.equal(normalizeStoredMemoryType("   "), "note");
});

test("memory maps to MemoryKind memory", () => {
  assert.equal(getMemoryKind("memory"), "memory");
});

test("story maps to MemoryKind memory", () => {
  assert.equal(getMemoryKind("story"), "memory");
});

test("coffee maps to MemoryKind person_info", () => {
  assert.equal(getMemoryKind("coffee"), "person_info");
});

test("gift maps to MemoryKind person_info", () => {
  assert.equal(getMemoryKind("gift"), "person_info");
});

test("journal maps to MemoryKind journal", () => {
  assert.equal(getMemoryKind("journal"), "journal");
});

test("unknown non-empty type is preserved and safely classified as note", () => {
  assert.equal(normalizeStoredMemoryType("  Custom_Legacy "), "custom_legacy");
  assert.equal(getMemoryKind("  Custom_Legacy "), "note");
});

test("helpers do not mutate their input", () => {
  const input = {
    marker: "unchanged",
    toString: () => " Coffee ",
  };
  const before = input.marker;

  assert.equal(normalizeStoredMemoryType(input), "coffee");
  assert.equal(getMemoryKind(input), "person_info");
  assert.equal(input.marker, before);
});

test("normalization never throws for an uncoercible input", () => {
  const input = {
    toString: () => {
      throw new Error("cannot stringify");
    },
  };

  assert.doesNotThrow(() => normalizeStoredMemoryType(input));
  assert.equal(normalizeStoredMemoryType(input), "note");
});
