import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("npm-test runs in the bounded T0 worker root", () => {
  const fixtureRoot = fileURLToPath(new URL(".", import.meta.url));
  assert.equal(realpathSync(process.cwd()), realpathSync(fixtureRoot));
});
