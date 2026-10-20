import assert from "node:assert/strict";
import test from "node:test";
import { getNewLevel } from "./levelProgress.js";

test("celebrates only a real upward level crossing", () => {
  assert.equal(getNewLevel(90, 100), 2);
  assert.equal(getNewLevel(90, 320), 4);
  assert.equal(getNewLevel(100, 150), null);
  assert.equal(getNewLevel(120, 120), null);
  assert.equal(getNewLevel(120, 90), null);
});

test("initial load does not celebrate historical XP", () => {
  assert.equal(getNewLevel(null, 700), null);
});
