import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  compactPlan,
  emptyPlan,
  lessonLink,
  parsePlan,
  plannerKey,
  suggestSessions,
  validDate,
  validateSession,
  weekStart,
} from "./studyPlanner.js";

const today = "2026-10-19";
const subjects = [
  { id: "hci", name: "HCI" },
  { id: "math", name: "Math" },
];
const lessons = [
  { id: "lecture", subjectId: "hci", title: "Interaction design" },
  { id: "algebra", subjectId: "math", title: "Algebra" },
];
const session = {
  id: "one",
  title: "Review HCI",
  subjectId: "hci",
  lessonId: "lecture",
  activity: "summary",
  date: today,
  time: "09:00",
  duration: 30,
  completed: false,
};
const now = new Date(today + "T07:00:00");

test("calendar arithmetic crosses years and rejects impossible dates", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekStart("2026-10-25"), today);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
});

test("invalid storage fails without silently resetting a plan", () => {
  assert.deepEqual(parsePlan(null), emptyPlan());
  assert.throws(() => parsePlan("broken"));
  assert.throws(() =>
    parsePlan(
      JSON.stringify({
        ...emptyPlan(),
        sessions: [{ ...session, time: "99:00" }],
      }),
    ),
  );
  assert.throws(() =>
    parsePlan(JSON.stringify({ ...emptyPlan(), sessions: [session, session] })),
  );
  assert.deepEqual(
    parsePlan(JSON.stringify({ ...emptyPlan(), sessions: [session] })).sessions,
    [session],
  );
  assert.notEqual(plannerKey("alice"), plannerKey("bob"));
});

test("sessions reject overlapping times, deleted lessons, past dates, and overnight spans", () => {
  const validate = (changes, existing = [session]) =>
    validateSession(
      { ...session, id: "two", ...changes },
      existing,
      subjects,
      lessons,
      today,
    );
  assert.match(validate({ time: "09:15" }), /overlaps/);
  assert.equal(validate({ time: "09:30" }), "");
  assert.equal(validate({ id: "one" }), "");
  assert.match(validate({ lessonId: "deleted" }), /lesson is no longer/);
  assert.match(validate({ subjectId: "someone-else" }), /subject is no longer/);
  assert.match(validate({ date: "2026-10-18" }), /future date/);
  assert.match(validate({ time: "23:50" }), /midnight/);
  assert.match(validate({ duration: 0 }), /duration/);
});

test("completion retention preserves every pending session and never mutates source data", () => {
  const completed = Array.from({ length: 45 }, (_, i) => ({
    ...session,
    id: "done-" + i,
    completed: true,
    completedAt: new Date(2026, 8, i + 1).toISOString(),
  }));
  const plan = { ...emptyPlan(), sessions: [session, ...completed] };
  const compacted = compactPlan(plan);
  assert.equal(compacted.sessions.length, 31);
  assert.equal(compacted.sessions[0].id, "one");
  assert.equal(compacted.sessions[1].id, "done-44");
  assert.equal(plan.sessions.length, 46);
  assert.throws(
    () =>
      compactPlan({
        ...emptyPlan(),
        sessions: Array.from({ length: 101 }, (_, i) => ({
          ...session,
          id: String(i),
        })),
      }),
    /100 pending/,
  );
});

test("suggestions prioritize exams and explain the latest quiz result", () => {
  const plan = { ...emptyPlan(), exams: { hci: today } };
  const results = [
    {
      subjectId: "hci",
      lessonId: "lecture",
      percentage: 100,
      completedAt: "2026-10-17",
    },
    {
      subjectId: "hci",
      lessonId: "lecture",
      percentage: 40,
      completedAt: "2026-10-18",
    },
  ];
  const suggestions = suggestSessions({
    plan,
    subjects,
    lessons,
    results,
    today,
    now,
  });
  assert.equal(suggestions[0].lessonId, "lecture");
  assert.equal(suggestions[0].activity, "summary");
  assert.match(suggestions[0].reason, /40%/);
  assert.equal(suggestions[0].date, today);
  assert.equal(plan.sessions.length, 0);
});

test("suggestions respect budgets, existing bookings, days off, deadlines, and existing plans", () => {
  const plan = { ...emptyPlan(), sessions: [session], exams: { math: today } };
  assert.equal(
    suggestSessions({ plan, subjects, lessons, results: [], today, now })
      .length,
    0,
  );
  assert.equal(
    suggestSessions({
      plan: { ...emptyPlan(), dailyMinutes: Array(7).fill(0) },
      subjects,
      lessons,
      results: [],
      today,
      now,
    }).length,
    0,
  );
  const extra = {
    ...session,
    id: "general",
    subjectId: "",
    lessonId: "",
    time: "08:00",
    duration: 20,
  };
  const suggestions = suggestSessions({
    plan: {
      ...emptyPlan(),
      sessions: [extra],
      dailyMinutes: Array(7).fill(40),
    },
    subjects,
    lessons,
    results: [],
    today,
    now,
  });
  assert.equal(suggestions[0].time, "08:30");
  assert.equal(suggestions[1].date, "2026-10-20");
  const late = suggestSessions({
    plan: { ...emptyPlan(), exams: { hci: today, math: today } },
    subjects,
    lessons,
    results: [],
    today,
    now: new Date(today + "T23:00:00"),
  });
  assert.equal(late.length, 0);
});

test("recently completed lessons are not immediately suggested again", () => {
  const plan = {
    ...emptyPlan(),
    sessions: [
      { ...session, completed: true, completedAt: today + "T08:00:00" },
    ],
  };
  assert.equal(
    suggestSessions({ plan, subjects, lessons, results: [], today, now }).some(
      (s) => s.lessonId === "lecture",
    ),
    false,
  );
});

test("hidden suggestions are excluded before limiting or reserving time", () => {
  const manyLessons = Array.from({ length: 5 }, (_, i) => ({
    id: `extra-${i}`,
    subjectId: "hci",
    title: `Lesson ${i}`,
  }));
  const suggestions = suggestSessions({
    plan: emptyPlan(),
    subjects,
    lessons: manyLessons,
    results: [],
    today,
    now,
    dismissed: ["suggest-extra-0", "suggest-extra-1", "suggest-extra-2"],
  });
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].lessonId, "extra-3");
  assert.equal(suggestions[0].date, today);
  assert.equal(suggestions[0].time, "08:00");
});

test("lesson links target the selected tool and never open another subject's lesson", () => {
  assert.equal(
    lessonLink(session, subjects, lessons),
    "/subjects/hci/lessons/lecture?tab=summary",
  );
  assert.equal(
    lessonLink({ ...session, activity: "quiz" }, subjects, lessons),
    "/subjects/hci/lessons/lecture?tab=quiz",
  );
  assert.equal(
    lessonLink({ ...session, subjectId: "math" }, subjects, lessons),
    null,
  );
  assert.equal(lessonLink(session, subjects, []), null);
});
