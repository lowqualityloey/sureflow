import assert from "node:assert/strict";
import test from "node:test";
import { formatDisplayName } from "../src/displayName.ts";

test("normalizes a display name to a hyphenated identifier", () => {
  assert.equal(formatDisplayName("  Ada   Lovelace  "), "Ada-Lovelace");
});
