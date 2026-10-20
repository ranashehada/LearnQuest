import test from "node:test";
import assert from "node:assert/strict";
import { readSubjectList, saveSubjectList } from "./subjectStorage.js";

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
  };
}

test("missing subjects start empty, but damaged subjects are never silently replaced", () => {
  const storage = memoryStorage();
  assert.deepEqual(readSubjectList(storage, "subjects"), { subjects: [], raw: null });
  storage.setItem("subjects", "broken JSON");
  assert.throws(() => readSubjectList(storage, "subjects"), /could not be read/);
  assert.equal(storage.getItem("subjects"), "broken JSON");
});

test("successful save returns the new snapshot", () => {
  const storage = memoryStorage();
  const raw = saveSubjectList(storage, "subjects", null, [{ id: "s1", name: "HCI" }]);
  assert.equal(storage.getItem("subjects"), raw);
  assert.deepEqual(readSubjectList(storage, "subjects").subjects, [{ id: "s1", name: "HCI" }]);
});

test("another tab's changes are preserved instead of overwritten", () => {
  const storage = memoryStorage("[]");
  const original = storage.getItem("subjects");
  storage.setItem("subjects", '[{"id":"other"}]');
  assert.throws(
    () => saveSubjectList(storage, "subjects", original, [{ id: "mine" }]),
    /changed in another tab/,
  );
  assert.equal(storage.getItem("subjects"), '[{"id":"other"}]');
});

test("failed browser write leaves the original subjects untouched", () => {
  const storage = memoryStorage("[]");
  storage.setItem = () => { throw new Error("quota exceeded"); };
  assert.throws(() => saveSubjectList(storage, "subjects", "[]", [{ id: "s1" }]), /draft is still here/);
  assert.equal(storage.getItem("subjects"), "[]");
});
