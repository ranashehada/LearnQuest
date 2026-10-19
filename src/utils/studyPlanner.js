export const ACTIVITIES = {
  explanation: "Study explanation",
  summary: "Review summary",
  quiz: "Practice quiz",
  study: "Study",
};
export const MAX_PENDING_SESSIONS = 100;
export const MAX_COMPLETED_SESSIONS = 30;

export function plannerKey(userId) {
  return `learnquest-user-${userId}-planner-v1`;
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value;
}

export function addDays(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

export function weekStart(value) {
  const day = new Date(`${value}T12:00:00`).getDay();
  return addDays(value, -((day + 6) % 7));
}

export function timeMinutes(time) {
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function clockTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function emptyPlan() {
  return {
    version: 1,
    sessions: [],
    exams: {},
    dailyMinutes: [30, 30, 30, 30, 30, 30, 30],
  };
}

// Fail visibly on malformed storage instead of replacing a saved plan with an empty one.
export function parsePlan(raw) {
  if (raw == null) return emptyPlan();
  let plan;
  try {
    plan = JSON.parse(raw);
  } catch {
    throw new Error(
      "Your saved plan could not be read. It has been left untouched.",
    );
  }
  if (
    !plan ||
    plan.version !== 1 ||
    !Array.isArray(plan.sessions) ||
    !plan.exams ||
    typeof plan.exams !== "object" ||
    Array.isArray(plan.exams) ||
    !Object.values(plan.exams).every(validDate) ||
    !Array.isArray(plan.dailyMinutes) ||
    plan.dailyMinutes.length !== 7 ||
    !plan.dailyMinutes.every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 480,
    ) ||
    !plan.sessions.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        s.title.length <= 150 &&
        validDate(s.date) &&
        timeMinutes(s.time) !== null &&
        Number.isInteger(s.duration) &&
        s.duration >= 5 &&
        s.duration <= 240 &&
        timeMinutes(s.time) + s.duration <= 1440 &&
        Object.hasOwn(ACTIVITIES, s.activity) &&
        typeof s.completed === "boolean",
    ) ||
    new Set(plan.sessions.map((s) => s.id)).size !== plan.sessions.length
  ) {
    throw new Error(
      "Your saved plan could not be read. It has been left untouched.",
    );
  }
  return plan;
}

export function compactPlan(plan) {
  const pending = plan.sessions.filter((s) => !s.completed);
  if (pending.length > MAX_PENDING_SESSIONS) {
    throw new Error(
      `You have ${MAX_PENDING_SESSIONS} pending sessions. Complete or remove one before adding another.`,
    );
  }
  const completed = plan.sessions
    .filter((s) => s.completed)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, MAX_COMPLETED_SESSIONS);
  return { ...plan, sessions: [...pending, ...completed] };
}

export function plannedMinutes(sessions, date, excludeId) {
  return sessions
    .filter((s) => s.date === date && s.id !== excludeId)
    .reduce((sum, s) => sum + s.duration, 0);
}

export function dayBudget(plan, date) {
  return plan.dailyMinutes[new Date(`${date}T12:00:00`).getDay()];
}

export function validateSession(
  session,
  sessions,
  subjects,
  lessons,
  today = localDate(),
) {
  if (!session.title.trim() || session.title.length > 150)
    return "Enter a session title (up to 150 characters).";
  if (!validDate(session.date) || session.date < today)
    return "Choose today or a future date.";
  const start = timeMinutes(session.time);
  if (start === null) return "Choose a start time.";
  if (
    !Number.isInteger(session.duration) ||
    session.duration < 5 ||
    session.duration > 240
  )
    return "Choose a duration between 5 and 240 minutes.";
  if (start + session.duration > 1440)
    return "This session would end after midnight. Shorten it or choose an earlier time.";
  if (!Object.hasOwn(ACTIVITIES, session.activity))
    return "Choose a study activity.";
  if (
    session.subjectId &&
    !subjects.some((s) => String(s.id) === String(session.subjectId))
  )
    return "That subject is no longer available. Choose another subject.";
  if (
    session.lessonId &&
    !lessons.some(
      (l) =>
        String(l.id) === String(session.lessonId) &&
        String(l.subjectId ?? l.subject_id) === String(session.subjectId),
    )
  )
    return "That lesson is no longer available. Choose another lesson.";
  if (session.activity !== "study" && !session.lessonId)
    return "Choose a lesson for this activity, or use General study.";
  if (
    sessions.some(
      (s) =>
        s.id !== session.id &&
        s.date === session.date &&
        start < timeMinutes(s.time) + s.duration &&
        start + session.duration > timeMinutes(s.time),
    )
  ) {
    return "This time overlaps another session. Choose a different start time.";
  }
  return "";
}

export function lessonLink(session, subjects, lessons) {
  const subject = subjects.find(
    (s) => String(s.id) === String(session.subjectId),
  );
  if (!subject) return null;
  if (!session.lessonId) return `/subjects/${encodeURIComponent(subject.id)}`;
  const lesson = lessons.find(
    (l) =>
      String(l.id) === String(session.lessonId) &&
      String(l.subjectId ?? l.subject_id) === String(subject.id),
  );
  if (!lesson) return null;
  const tab = session.activity === "study" ? "explanation" : session.activity;
  return `/subjects/${encodeURIComponent(subject.id)}/lessons/${encodeURIComponent(lesson.id)}?tab=${tab}`;
}

function availableSlot(plan, today, deadline, duration, now) {
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset);
    if (deadline && date > deadline) break;
    if (plannedMinutes(plan.sessions, date) + duration > dayBudget(plan, date))
      continue;
    const earliest =
      date === localDate(now)
        ? Math.max(
            8 * 60,
            Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 15) * 15,
          )
        : 8 * 60;
    for (let start = earliest; start + duration <= 22 * 60; start += 15) {
      if (
        !plan.sessions.some(
          (s) =>
            s.date === date &&
            start < timeMinutes(s.time) + s.duration &&
            start + duration > timeMinutes(s.time),
        )
      )
        return { date, time: clockTime(start) };
    }
  }
  return null;
}

// Suggestions are derived from existing results, never stored as duplicate lesson/quiz data.
// Score thresholds are a planning heuristic, not a claim of measured mastery.
export function suggestSessions({
  plan,
  subjects,
  lessons,
  results,
  today = localDate(),
  now = new Date(),
  dismissed = [],
}) {
  const candidates = lessons
    .flatMap((lesson) => {
      if (dismissed.includes(`suggest-${lesson.id}`)) return [];
      const subjectId = String(lesson.subjectId ?? lesson.subject_id);
      if (!subjects.some((s) => String(s.id) === subjectId)) return [];
      if (
        plan.sessions.some(
          (s) => !s.completed && String(s.lessonId) === String(lesson.id),
        )
      )
        return [];
      const latest = results
        .filter(
          (r) =>
            String(r.lessonId) === String(lesson.id) &&
            String(r.subjectId) === subjectId,
        )
        .sort((a, b) =>
          (b.completedAt || "").localeCompare(a.completedAt || ""),
        )[0];
      const score =
        latest && Number.isFinite(Number(latest.percentage))
          ? Number(latest.percentage)
          : null;
      const exam =
        plan.exams[subjectId] >= today ? plan.exams[subjectId] : null;
      const recentCompletion = plan.sessions.some(
        (s) =>
          s.completed &&
          String(s.lessonId) === String(lesson.id) &&
          s.completedAt &&
          localDate(new Date(s.completedAt)) >= addDays(today, -1),
      );
      if (recentCompletion || (score !== null && score >= 80 && !exam))
        return [];
      const activity =
        score === null ? "explanation" : score < 60 ? "summary" : "quiz";
      const reason =
        score === null
          ? "No quiz result for this lesson yet. Start with the explanation."
          : score < 80
            ? `Your latest quiz score was ${score}%. Plan another review.`
            : "Plan a refresher before your upcoming exam.";
      return [{ lesson, subjectId, activity, reason, exam, score }];
    })
    .sort(
      (a, b) =>
        (a.exam || "9999").localeCompare(b.exam || "9999") ||
        (a.score ?? 101) - (b.score ?? 101),
    );

  const workingPlan = { ...plan, sessions: [...plan.sessions] };
  const suggestions = [];
  for (const item of candidates) {
    const duration = 20;
    const slot = availableSlot(workingPlan, today, item.exam, duration, now);
    if (!slot) continue;
    const suggestion = {
      id: `suggest-${item.lesson.id}`,
      lessonId: String(item.lesson.id),
      subjectId: item.subjectId,
      title:
        `${ACTIVITIES[item.activity]}: ${item.lesson.title || item.lesson.name || item.lesson.fileName || "Lesson"}`.slice(
          0,
          150,
        ),
      activity: item.activity,
      duration,
      ...slot,
      completed: false,
      reason: item.reason,
      exam: item.exam,
    };
    suggestions.push(suggestion);
    workingPlan.sessions.push(suggestion);
    if (suggestions.length === 3) break;
  }
  return suggestions;
}
