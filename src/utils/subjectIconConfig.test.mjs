import assert from "node:assert/strict";
import test from "node:test";
import { getSubjectIconKey } from "./subjectIconConfig.js";

test("existing subjects get a relevant icon without changing stored data", () => {
  assert.equal(getSubjectIconKey({ name: "Human Computer Interaction" }), "design");
  assert.equal(getSubjectIconKey({ name: "Calculus II" }), "math");
  assert.equal(getSubjectIconKey({ name: "Biology" }), "science");
  assert.equal(getSubjectIconKey({ name: "Uncategorized" }), "book");
});

test("user-selected icon takes priority and invalid values fall back", () => {
  assert.equal(getSubjectIconKey({ name: "Calculus", icon: "design" }), "design");
  assert.equal(getSubjectIconKey({ name: "Calculus", icon: "invalid" }), "math");
});
