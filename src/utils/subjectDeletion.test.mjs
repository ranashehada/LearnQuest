import test from "node:test";
import assert from "node:assert/strict";
import { commitSubjectDeletion, prepareSubjectDeletion } from "./subjectDeletion.js";

function memoryStorage(seed) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    snapshot: () => Object.fromEntries(data),
  };
}

function fixture() {
  return memoryStorage({
    "learnquest-user-u1-subjects": JSON.stringify([
      { id: "s1", name: "HCI" },
      { id: "s2", name: "Math" },
    ]),
    "learnquest-user-u1-lessons": JSON.stringify([
      { id: "l1", subjectId: "s1" },
      { id: "l2", subjectId: "s2" },
    ]),
    "learnquest-quiz-results": JSON.stringify([
      { id: "q1", subjectId: "s1", lessonId: "l1", score: 4, xpEarned: 40, questions: ["Q"], answers: ["A"] },
      { id: "q2", subjectId: "s2", lessonId: "l2", score: 5, xpEarned: 50, questions: ["Other"] },
    ]),
    "learnquest-ai-results": JSON.stringify({ l1: { summary: "HCI" }, l2: { summary: "Math" } }),
    "learnquest-user-u1-planner-v1": JSON.stringify({
      version: 1,
      sessions: [
        { id: "p1", title: "Review", date: "2026-10-21", time: "14:00", duration: 30, activity: "quiz", subjectId: "s1", lessonId: "l1", completed: false },
      ],
      exams: { s1: "2026-10-25", s2: "2026-10-28" },
      dailyMinutes: [30, 30, 30, 30, 30, 30, 30],
    }),
    "learnquest-user-u1-last-opened-lesson": JSON.stringify({ subjectId: "s1", lessonId: "l1" }),
    "learnquest-quiz-draft-l1": "saved draft",
  });
}

test("deletes only the selected subject's uploads and details, retaining XP and study time", async () => {
  const storage = fixture();
  const prepared = prepareSubjectDeletion(storage, "u1", "s1");
  assert.deepEqual(prepared.lessonIds, ["l1"]);
  assert.equal(prepared.reviewCount, 1);
  let deletedIds;
  await commitSubjectDeletion(storage, prepared, async (ids) => { deletedIds = ids; });
  assert.deepEqual(deletedIds, ["l1"]);
  assert.deepEqual(JSON.parse(storage.getItem("learnquest-user-u1-subjects")).map((s) => s.id), ["s2"]);
  assert.deepEqual(JSON.parse(storage.getItem("learnquest-user-u1-lessons")).map((l) => l.id), ["l2"]);
  const results = JSON.parse(storage.getItem("learnquest-quiz-results"));
  assert.equal(results[0].xpEarned, 40);
  assert.equal(results[0].score, 4);
  assert.equal(results[0].questions, undefined);
  assert.deepEqual(results[1].questions, ["Other"]);
  assert.deepEqual(JSON.parse(storage.getItem("learnquest-ai-results")), { l2: { summary: "Math" } });
  const plan = JSON.parse(storage.getItem("learnquest-user-u1-planner-v1"));
  assert.equal(plan.sessions[0].title, "Review");
  assert.equal(plan.sessions[0].subjectId, "");
  assert.equal(plan.sessions[0].activity, "study");
  assert.deepEqual(plan.exams, { s2: "2026-10-28" });
  assert.equal(storage.getItem("learnquest-quiz-draft-l1"), null);
  assert.equal(storage.getItem("learnquest-user-u1-last-opened-lesson"), null);
});

test("failed file deletion restores every browser record", async () => {
  const storage = fixture();
  const before = storage.snapshot();
  const prepared = prepareSubjectDeletion(storage, "u1", "s1");
  await assert.rejects(
    commitSubjectDeletion(storage, prepared, async () => { throw new Error("disk error"); }),
    /Nothing was deleted/,
  );
  assert.deepEqual(storage.snapshot(), before);
});

test("stale or damaged data stops deletion before files are touched", async () => {
  const storage = fixture();
  const prepared = prepareSubjectDeletion(storage, "u1", "s1");
  storage.setItem("learnquest-user-u1-lessons", "changed in another tab");
  let fileDeleteCalled = false;
  await assert.rejects(
    commitSubjectDeletion(storage, prepared, async () => { fileDeleteCalled = true; }),
    /Study data changed/,
  );
  assert.equal(fileDeleteCalled, false);
  assert.throws(() => prepareSubjectDeletion(storage, "u1", "s1"), /Lessons could not be read/);
});
