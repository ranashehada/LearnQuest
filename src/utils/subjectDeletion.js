import { parsePlan, plannerKey } from "./studyPlanner.js";

function readArray(raw, label) {
  if (raw == null) return [];
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) return value;
  } catch {
    // A damaged value must never be replaced with an empty collection.
  }
  throw new Error(`${label} could not be read. Nothing was deleted.`);
}

function readObject(raw, label) {
  if (raw == null) return {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // A damaged value must never be overwritten during deletion.
  }
  throw new Error(`${label} could not be read. Nothing was deleted.`);
}

// Prepare every related change before asking for confirmation or deleting files.
export function prepareSubjectDeletion(storage, userId, subjectId) {
  const id = String(subjectId);
  const prefix = `learnquest-user-${userId}-`;
  const keys = {
    subjects: `${prefix}subjects`,
    lessons: `${prefix}lessons`,
    results: "learnquest-quiz-results",
    ai: "learnquest-ai-results",
    plan: plannerKey(userId),
    lastOpened: `${prefix}last-opened-lesson`,
  };
  const original = new Map();
  const read = (key) => {
    const raw = storage.getItem(key);
    original.set(key, raw);
    return raw;
  };

  const subjects = readArray(read(keys.subjects), "Subjects");
  const subject = subjects.find((item) => String(item.id) === id);
  if (!subject) throw new Error("Subject not found. Refresh and try again.");

  const lessons = readArray(read(keys.lessons), "Lessons");
  const removedLessons = lessons.filter(
    (lesson) => String(lesson.subjectId ?? lesson.subject_id) === id,
  );
  const lessonIds = removedLessons.map((lesson) => String(lesson.id));
  const lessonIdSet = new Set(lessonIds);
  const results = readArray(read(keys.results), "Quiz history");
  const aiResults = readObject(read(keys.ai), "Saved AI explanations");
  const planRaw = read(keys.plan);
  const plan = parsePlan(planRaw);
  const lastOpenedRaw = read(keys.lastOpened);
  const lastOpened = lastOpenedRaw == null
    ? null
    : readObject(lastOpenedRaw, "Recent lesson");

  const changes = new Map();
  changes.set(keys.subjects, JSON.stringify(subjects.filter((item) => String(item.id) !== id)));
  changes.set(keys.lessons, JSON.stringify(lessons.filter((lesson) => !lessonIdSet.has(String(lesson.id)))));

  let reviewCount = 0;
  const keptResults = results.map((result) => {
    if (String(result.subjectId) !== id && !lessonIdSet.has(String(result.lessonId))) {
      return result;
    }
    if (Array.isArray(result.questions) || Array.isArray(result.answers)) reviewCount += 1;
    const summary = { ...result };
    delete summary.questions;
    delete summary.answers;
    delete summary.subjectId;
    delete summary.lessonId;
    return summary;
  });
  if (reviewCount || keptResults.some((result, index) => result !== results[index])) {
    changes.set(keys.results, JSON.stringify(keptResults));
  }

  const keptAI = { ...aiResults };
  for (const lessonId of lessonIds) delete keptAI[lessonId];
  if (lessonIds.some((lessonId) => Object.hasOwn(aiResults, lessonId))) {
    changes.set(keys.ai, JSON.stringify(keptAI));
  }

  if (planRaw != null) {
    const sessions = plan.sessions.map((session) =>
      String(session.subjectId) === id || lessonIdSet.has(String(session.lessonId))
        ? { ...session, subjectId: "", lessonId: "", activity: "study" }
        : session,
    );
    const exams = { ...plan.exams };
    delete exams[id];
    if (sessions.some((session, index) => session !== plan.sessions[index]) || Object.hasOwn(plan.exams, id)) {
      changes.set(keys.plan, JSON.stringify({ ...plan, sessions, exams }));
    }
  }

  if (lastOpened && (
    String(lastOpened.subjectId) === id || lessonIdSet.has(String(lastOpened.lessonId))
  )) {
    changes.set(keys.lastOpened, null);
  }

  for (const lessonId of lessonIds) {
    const key = `learnquest-quiz-draft-${lessonId}`;
    if (read(key) != null) changes.set(key, null);
  }

  return { subject, lessonIds, reviewCount, original, changes };
}

export async function commitSubjectDeletion(storage, prepared, deleteFiles) {
  const { original, changes, lessonIds } = prepared;
  for (const [key, raw] of original) {
    if (storage.getItem(key) !== raw) {
      throw new Error("Study data changed. Refresh and try deleting again.");
    }
  }

  const touched = [];
  try {
    for (const [key, value] of changes) {
      if (value == null) storage.removeItem(key);
      else storage.setItem(key, value);
      touched.push(key);
    }
    await deleteFiles(lessonIds);
  } catch (error) {
    let restored = true;
    for (const key of touched.reverse()) {
      try {
        const raw = original.get(key);
        if (raw == null) storage.removeItem(key);
        else storage.setItem(key, raw);
      } catch {
        restored = false;
      }
    }
    if (!restored) {
      throw new Error("Deletion failed and some study data could not be restored. Do not reload; contact your team.", { cause: error });
    }
    throw new Error(`Nothing was deleted: ${error.message || "storage error"}`, { cause: error });
  }
}
