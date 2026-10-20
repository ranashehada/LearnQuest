import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  ACTIVITIES,
  addDays,
  clockTime,
  compactPlan,
  dayBudget,
  emptyPlan,
  lessonLink,
  localDate,
  parsePlan,
  plannedMinutes,
  plannerKey,
  suggestSessions,
  timeMinutes,
  validDate,
  validateSession,
  weekStart,
} from "../utils/studyPlanner";
import { API_URL } from "../utils/api";
import "./StudyPlanner.css";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(value)) return value;
  } catch {
    /* Report a readable error without overwriting stored data. */
  }
  throw new Error(
    "Saved study data could not be read. Your data has been left untouched.",
  );
}

function dateLabel(date, options = { month: "short", day: "numeric" }) {
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, options);
}

function lessonName(lesson) {
  return lesson.title || lesson.name || lesson.fileName || "Untitled lesson";
}

function PlannerDialog({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="planner-dialog"
      aria-labelledby="planner-dialog-title"
      onCancel={onClose}
    >
      <div className="planner-section-heading">
        <h2 id="planner-dialog-title">{title}</h2>
        <button
          type="button"
          className="planner-icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function SessionEditor({
  initial,
  plan,
  subjects,
  lessons,
  onSave,
  onClose,
  saving,
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const availableLessons = lessons.filter(
    (l) => String(l.subjectId ?? l.subject_id) === String(draft.subjectId),
  );
  const set = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const budget = validDate(draft.date) ? dayBudget(plan, draft.date) : 0;
  const workload =
    plannedMinutes(plan.sessions, draft.date, draft.id) +
    Number(draft.duration || 0);
  const examDate = plan.exams[draft.subjectId];

  async function submit(event) {
    event.preventDefault();
    const session = {
      ...draft,
      title: draft.title.trim(),
      duration: Number(draft.duration),
    };
    const validation = validateSession(
      session,
      plan.sessions,
      subjects,
      lessons,
    );
    if (validation) {
      setError(validation);
      return;
    }
    const saveError = await onSave(session);
    if (saveError) setError(saveError);
  }

  return (
    <PlannerDialog
      title={initial.id ? "Edit study session" : "Plan a study session"}
      onClose={onClose}
    >
      <form className="planner-form" onSubmit={submit}>
        <label htmlFor="session-title">Session title</label>
        <input
          id="session-title"
          required
          maxLength={150}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Review interaction design"
        />
        <div className="planner-form-grid">
          <div>
            <label htmlFor="session-subject">Subject</label>
            <select
              id="session-subject"
              value={draft.subjectId}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  subjectId: e.target.value,
                  lessonId: "",
                  activity: "study",
                })
              }
            >
              <option value="">General study</option>
              {draft.subjectId &&
                !subjects.some(
                  (s) => String(s.id) === String(draft.subjectId),
                ) && (
                  <option value={draft.subjectId}>
                    Subject unavailable — choose another
                  </option>
                )}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="session-lesson">Lesson (optional)</label>
            <select
              id="session-lesson"
              value={draft.lessonId}
              disabled={!draft.subjectId}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  lessonId: e.target.value,
                  activity: e.target.value ? "explanation" : "study",
                })
              }
            >
              <option value="">No specific lesson</option>
              {draft.lessonId &&
                !availableLessons.some(
                  (l) => String(l.id) === String(draft.lessonId),
                ) && (
                  <option value={draft.lessonId}>
                    Lesson unavailable — choose another
                  </option>
                )}
              {availableLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {lessonName(l)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="session-activity">What will you do?</label>
        <select
          id="session-activity"
          value={draft.activity}
          onChange={(e) => set("activity", e.target.value)}
        >
          <option value="study">General study</option>
          {Object.entries(ACTIVITIES)
            .filter(([key]) => key !== "study")
            .map(([key, label]) => (
              <option key={key} value={key} disabled={!draft.lessonId}>
                {label}
              </option>
            ))}
        </select>
        <div className="planner-form-grid planner-time-fields">
          <div>
            <label htmlFor="session-date">Date</label>
            <input
              id="session-date"
              type="date"
              required
              min={localDate()}
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="session-time">Start time</label>
            <input
              id="session-time"
              type="time"
              required
              value={draft.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="session-duration">Minutes</label>
            <input
              id="session-duration"
              type="number"
              required
              min="5"
              max="240"
              step="1"
              value={draft.duration}
              onChange={(e) => set("duration", e.target.value)}
            />
          </div>
        </div>
        {workload > budget && (
          <p className="planner-warning">
            This brings the day to {workload} minutes. Your preferred limit is{" "}
            {budget} minutes. You can still save it or choose another day.
          </p>
        )}
        {examDate && draft.date > examDate && (
          <p className="planner-warning">
            This is after your {dateLabel(examDate)} exam. Choose an earlier day
            if this is exam preparation.
          </p>
        )}
        {error && (
          <p className="planner-error" role="alert">
            {error}
          </p>
        )}
        <div className="planner-actions">
          <button type="button" className="planner-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="planner-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save session"}
          </button>
        </div>
      </form>
    </PlannerDialog>
  );
}

function PlanSettings({ plan, subjects, onSave, onClose, saving }) {
  const [minutes, setMinutes] = useState([...plan.dailyMinutes]);
  const [exams, setExams] = useState({ ...plan.exams });
  const [originalPreferences] = useState(() =>
    JSON.stringify({ dailyMinutes: plan.dailyMinutes, exams: plan.exams }),
  );
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (
      JSON.stringify({ dailyMinutes: plan.dailyMinutes, exams: plan.exams }) !==
      originalPreferences
    ) {
      setError(
        "Study time or exam dates changed in another tab. Close this form and reopen it to edit the latest preferences.",
      );
      return;
    }
    const dailyMinutes = minutes.map(Number);
    if (!dailyMinutes.every((n) => Number.isInteger(n) && n >= 0 && n <= 480)) {
      setError("Enter 0–480 minutes for each day. Use 0 for a day off.");
      return;
    }
    const nextExams = Object.fromEntries(
      Object.entries(exams).filter(
        ([id, date]) => date && subjects.some((s) => String(s.id) === id),
      ),
    );
    if (!Object.values(nextExams).every(validDate)) {
      setError("Enter a valid exam date.");
      return;
    }
    const saveError = await onSave({ dailyMinutes, exams: nextExams });
    if (saveError) setError(saveError);
  }
  return (
    <PlannerDialog title="Study time & exams" onClose={onClose}>
      <form className="planner-form" onSubmit={submit}>
        <fieldset>
          <legend>How much time can you study each day?</legend>
          <p className="planner-muted">
            Minutes per day. Set 0 for days off. Suggestions use these limits.
          </p>
          <div className="planner-budget-inputs">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <div key={day}>
                <label htmlFor={"budget-" + day}>{DAYS[day].slice(0, 3)}</label>
                <input
                  id={"budget-" + day}
                  aria-label={DAYS[day] + " study minutes"}
                  type="number"
                  min="0"
                  max="480"
                  required
                  value={minutes[day]}
                  onChange={(e) =>
                    setMinutes(
                      minutes.map((n, i) => (i === day ? e.target.value : n)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Exam dates (optional)</legend>
          <p className="planner-muted">
            One upcoming exam per subject. Earlier exams get priority in
            suggestions.
          </p>
          {subjects.length ? (
            subjects.map((s) => (
              <div className="planner-exam-field" key={s.id}>
                <label htmlFor={"exam-" + s.id}>{s.name}</label>
                <input
                  id={"exam-" + s.id}
                  type="date"
                  value={exams[s.id] || ""}
                  onChange={(e) =>
                    setExams({ ...exams, [s.id]: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="planner-text-button"
                  disabled={!exams[s.id]}
                  onClick={() => setExams({ ...exams, [s.id]: "" })}
                  aria-label={"Clear exam date for " + s.name}
                >
                  Clear
                </button>
              </div>
            ))
          ) : (
            <p className="planner-muted">
              Create a subject to set an exam date.
            </p>
          )}
        </fieldset>
        {error && (
          <p className="planner-error" role="alert">
            {error}
          </p>
        )}
        <div className="planner-actions">
          <button type="button" className="planner-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="planner-primary" disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </PlannerDialog>
  );
}

export default function StudyPlanner() {
  const [accountId, setAccountId] = useState(null);
  const [data, setData] = useState({
    subjects: [],
    lessons: [],
    results: [],
    legacyTasks: [],
    plan: emptyPlan(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [today, setToday] = useState(localDate);
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [week, setWeek] = useState(() => weekStart(localDate()));
  const [editor, setEditor] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  const [undo, setUndo] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const storedRaw = useRef(null);

  useEffect(() => {
    let active = true;
    let userId = null;
    const controller = new AbortController();
    function refresh() {
      if (!active || !userId) return;
      try {
        const subjects = readArray("learnquest-user-" + userId + "-subjects");
        const lessons = readArray(
          "learnquest-user-" + userId + "-lessons",
        ).filter((l) =>
          subjects.some(
            (s) => String(s.id) === String(l.subjectId ?? l.subject_id),
          ),
        );
        const raw = localStorage.getItem(plannerKey(userId));
        const plan = parsePlan(raw);
        const results = readArray("learnquest-quiz-results");
        // Earlier tasks were browser-wide, without reliable account ownership.
        // Keep them recoverable without silently assigning them to this account.
        const legacyTasks = readArray("learnquest-study-tasks");
        storedRaw.current = raw;
        setData({ subjects, lessons, results, legacyTasks, plan });
        setAccountId(userId);
        setToday(localDate());
        setError("");
      } catch (err) {
        setAccountId(null);
        setError(
          err.message ||
            "Unable to load your plan. Your saved data has been left untouched.",
        );
      }
    }
    async function load() {
      try {
        const response = await fetch(API_URL + "/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Please log in again to open your study plan.");
        const result = await response.json();
        if (!result.user?.id)
          throw new Error("Unable to identify your account.");
        userId = String(result.user.id);
        refresh();
      } catch (err) {
        if (active && err.name !== "AbortError")
          setError(
            err.message ||
              "Unable to connect. Check the backend and try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("learnquest:stats-updated", refresh);
    const timer = window.setInterval(() => setToday(localDate()), 60000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("learnquest:stats-updated", refresh);
    };
  }, [loadAttempt]);

  const { subjects, lessons, results, legacyTasks, plan } = data;

  async function savePlan(next) {
    if (!accountId)
      return "Your account is not ready. Please reload the planner.";
    if (saveInFlight.current)
      return "A save is already in progress. Please wait.";
    const expectedRaw = storedRaw.current;
    saveInFlight.current = true;
    setSaving(true);
    try {
      const key = plannerKey(accountId);
      if (!navigator.locks)
        return "This browser cannot safely save study plans. Please use a current browser on localhost or HTTPS.";
      return await navigator.locks.request(key, () => {
        if (localStorage.getItem(key) !== expectedRaw)
          return "Your plan changed in another tab. Reload this page before saving.";
        const compacted = compactPlan(next);
        const raw = JSON.stringify(compacted);
        parsePlan(raw);
        localStorage.setItem(key, raw);
        storedRaw.current = raw;
        setData((current) => ({ ...current, plan: compacted }));
        setError("");
        return "";
      });
    } catch (err) {
      return err.name === "QuotaExceededError"
        ? "This browser is out of storage. The session was not saved; your existing plan is unchanged."
        : err.message || "Unable to save your plan. Please try again.";
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  function openNew(preset = {}) {
    setEditor({
      title: "",
      subjectId: "",
      lessonId: "",
      activity: "study",
      date: selectedDate < today ? today : selectedDate,
      time: "18:00",
      duration: 20,
      completed: false,
      ...preset,
      id: null,
    });
  }

  async function saveSession(draft) {
    // Keep scheduling details and references, never copied lesson or quiz content.
    const session = {
      id: draft.id || crypto.randomUUID(),
      title: draft.title,
      subjectId: draft.subjectId || "",
      lessonId: draft.lessonId || "",
      activity: draft.activity,
      date: draft.date,
      time: draft.time,
      duration: draft.duration,
      completed: draft.completed,
      completedAt: draft.completedAt || null,
    };
    const exists = plan.sessions.some((s) => s.id === session.id);
    if (draft.id && !exists)
      return "This session was removed in another tab. Close this form and create a new session.";
    if (
      draft.id &&
      JSON.stringify(plan.sessions.find((s) => s.id === draft.id)) !==
        JSON.stringify(editor)
    ) {
      return "This session changed in another tab. Close this form and open it again to edit the latest version.";
    }
    const saveError = await savePlan({
      ...plan,
      sessions: exists
        ? plan.sessions.map((s) => (s.id === session.id ? session : s))
        : [...plan.sessions, session],
    });
    if (!saveError) {
      setEditor(null);
      setSelectedDate(session.date);
      setWeek(weekStart(session.date));
      setNotice("Session saved.");
    }
    return saveError;
  }

  async function updateSession(session, remove = false) {
    const next = remove
      ? plan.sessions.filter((s) => s.id !== session.id)
      : plan.sessions.map((s) =>
          s.id === session.id
            ? {
                ...s,
                completed: !s.completed,
                completedAt: s.completed ? null : new Date().toISOString(),
              }
            : s,
        );
    const saveError = await savePlan({ ...plan, sessions: next });
    if (saveError) {
      setError(saveError);
      return;
    }
    setUndo(remove ? session : null);
    setNotice(
      remove
        ? "Session removed."
        : session.completed
          ? "Session marked as planned."
          : "Session completed.",
    );
  }

  async function restoreSession() {
    const validation = validateSession(
      // A deleted lesson must not prevent restoring the original session.
      { ...undo, subjectId: "", lessonId: "", activity: "study" },
      plan.sessions,
      subjects,
      lessons,
      undo.date,
    );
    if (validation) {
      setError("Could not undo: " + validation);
      return;
    }
    const saveError = await savePlan({
      ...plan,
      sessions: [...plan.sessions.filter((s) => s.id !== undo.id), undo],
    });
    if (saveError) setError(saveError);
    else {
      setUndo(null);
      setNotice("Session restored.");
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const sessions = plan.sessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const overdue = plan.sessions
    .filter((s) => !s.completed && s.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const suggestions = suggestSessions({
    plan,
    subjects,
    lessons,
    results,
    today,
    dismissed,
  });
  const exams = subjects
    .filter((s) => plan.exams[s.id] >= today)
    .sort((a, b) => plan.exams[a.id].localeCompare(plan.exams[b.id]));

  function sessionCard(session) {
    const subject = subjects.find(
      (s) => String(s.id) === String(session.subjectId),
    );
    const link = lessonLink(session, subjects, lessons);
    return (
      <article
        key={session.id}
        className={
          "planner-session" + (session.completed ? " is-complete" : "")
        }
      >
        <div className="planner-session-time">
          <Clock3 size={17} />
          <strong>
            {session.time}–
            {clockTime(timeMinutes(session.time) + session.duration)}
          </strong>
          <span>{session.duration} min</span>
        </div>
        <div className="planner-session-body">
          <h3>{session.title}</h3>
          <p>
            {subject?.name ||
              (session.subjectId
                ? "Subject unavailable"
                : "General study")}{" "}
            · {ACTIVITIES[session.activity]}
          </p>
          <span className="planner-status">
            {session.completed
              ? "Completed"
              : session.date < today
                ? "Needs rescheduling · " + dateLabel(session.date)
                : "Planned"}
          </span>
          {session.lessonId && !link && (
            <p className="planner-warning">
              The linked lesson is unavailable. Edit this session to choose
              another.
            </p>
          )}
        </div>
        <div className="planner-session-actions">
          {!session.completed && link && (
            <Link className="planner-primary" to={link}>
              Open {session.lessonId ? "lesson" : "subject"}
              <ArrowRight size={15} />
            </Link>
          )}
          <button
            type="button"
            className="planner-secondary"
            onClick={() => updateSession(session)}
            disabled={saving}
            aria-label={
              (session.completed ? "Reopen " : "Complete ") + session.title
            }
          >
            {session.completed ? (
              "Reopen"
            ) : (
              <>
                <Check size={15} />
                Complete
              </>
            )}
          </button>
          {!session.completed && (
            <button
              type="button"
              className="planner-icon-button"
              aria-label={"Edit " + session.title}
              onClick={() => setEditor(session)}
            >
              <Pencil size={17} />
            </button>
          )}
          <button
            type="button"
            className="planner-icon-button"
            aria-label={"Remove " + session.title}
            onClick={() => updateSession(session, true)}
            disabled={saving}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </article>
    );
  }

  if (loading)
    return (
      <div className="planner-page" role="status">
        Loading your study plan…
      </div>
    );
  if (!accountId)
    return (
      <div className="planner-page">
        <h1>Study Planner</h1>
        <p className="planner-error" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="planner-primary"
          onClick={() => {
            setLoading(true);
            setLoadAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="planner-page">
      <header className="planner-header">
        <div>
          <span className="planner-eyebrow">MAKE TIME TO LEARN</span>
          <h1>Study Planner</h1>
          <p>
            Choose what to study and when. Open your lesson when you’re ready.
          </p>
        </div>
        <button
          type="button"
          className="planner-primary"
          onClick={() => openNew()}
        >
          <Plus size={18} />
          Plan session
        </button>
      </header>
      {notice && (
        <div className="planner-notice" role="status">
          {notice}
          {undo && (
            <button
              type="button"
              className="planner-text-button"
              onClick={restoreSession}
            >
              Undo removal
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="planner-error" role="alert">
          {error}
        </p>
      )}

      <section className="planner-panel" aria-labelledby="week-heading">
        <div className="planner-section-heading">
          <div>
            <h2 id="week-heading">Your week</h2>
            <p>
              {dateLabel(week)} –{" "}
              {dateLabel(addDays(week, 6), {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="planner-week-controls">
            <button
              type="button"
              className="planner-icon-button"
              aria-label="Previous week"
              onClick={() => {
                setWeek(addDays(week, -7));
                setSelectedDate(addDays(week, -7));
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className="planner-secondary"
              onClick={() => {
                setWeek(weekStart(today));
                setSelectedDate(today);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="planner-icon-button"
              aria-label="Next week"
              onClick={() => {
                setWeek(addDays(week, 7));
                setSelectedDate(addDays(week, 7));
              }}
            >
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="planner-secondary"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 size={16} />
              Study time & exams
            </button>
          </div>
        </div>
        <div className="planner-week" aria-label="Choose a study day">
          {days.map((date) => {
            const used = plannedMinutes(plan.sessions, date);
            const budget = dayBudget(plan, date);
            const count = plan.sessions.filter((s) => s.date === date).length;
            return (
              <button
                type="button"
                key={date}
                className={
                  "planner-day" + (selectedDate === date ? " selected" : "")
                }
                aria-pressed={selectedDate === date}
                aria-current={date === today ? "date" : undefined}
                aria-label={
                  dateLabel(date, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }) +
                  ", " +
                  count +
                  " sessions, " +
                  used +
                  " of " +
                  budget +
                  " minutes planned"
                }
                onClick={() => setSelectedDate(date)}
              >
                <span>
                  {dateLabel(date, { weekday: "short" })}
                  {date === today && " · Today"}
                </span>
                <strong>{Number(date.slice(-2))}</strong>
                <small>
                  {count} {count === 1 ? "session" : "sessions"}
                </small>
                <small className={used > budget ? "planner-over-budget" : ""}>
                  {used}/{budget} min
                </small>
              </button>
            );
          })}
        </div>
        <div className="planner-agenda-heading">
          <h3>
            {dateLabel(selectedDate, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          <button
            type="button"
            className="planner-text-button"
            onClick={() => openNew()}
          >
            + Add session
          </button>
        </div>
        {sessions.length ? (
          <div className="planner-session-list">
            {sessions.map(sessionCard)}
          </div>
        ) : (
          <div className="planner-empty">
            <CalendarDays size={28} />
            <h3>No sessions planned</h3>
            <p>
              {selectedDate < today
                ? "Choose today or a future date to plan your next session."
                : "Add a session or choose a suggestion below."}
            </p>
          </div>
        )}
        <p className="planner-footnote">
          Times use your local time zone. The most recent 30 completed sessions
          are kept.
        </p>
      </section>

      {overdue.length > 0 && (
        <details className="planner-panel planner-overdue">
          <summary>
            {overdue.length}{" "}
            {overdue.length === 1 ? "session needs" : "sessions need"}{" "}
            rescheduling
          </summary>
          <p className="planner-muted">
            Edit the date, mark it done, or remove it if your plans changed.
          </p>
          <div className="planner-session-list">{overdue.map(sessionCard)}</div>
        </details>
      )}

      <section className="planner-panel" aria-labelledby="suggestions-heading">
        <div className="planner-section-heading">
          <div>
            <h2 id="suggestions-heading">What could I study next?</h2>
            <p>
              Suggestions use your latest quiz scores, exam dates, and free
              study time. Choose one to review its schedule.
            </p>
          </div>
        </div>
        {exams.length > 0 && (
          <div className="planner-exams" aria-label="Upcoming exams">
            {exams.map((s) => (
              <span key={s.id}>
                <CalendarDays size={15} />
                {s.name}: {dateLabel(plan.exams[s.id])}
              </span>
            ))}
          </div>
        )}
        {suggestions.length > 0 ? (
          <div className="planner-suggestions">
            {suggestions.map((s) => (
              <article key={s.id} className="planner-suggestion">
                <h3>{s.title}</h3>
                <p>{s.reason}</p>
                {s.exam && <p>Exam on {dateLabel(s.exam)}.</p>}
                <span className="planner-muted">
                  {dateLabel(s.date)} · {s.time} · {s.duration} min
                </span>
                <div className="planner-actions">
                  <button
                    type="button"
                    className="planner-text-button"
                    onClick={() => setDismissed([...dismissed, s.id])}
                    aria-label={"Hide for now: " + s.title}
                  >
                    Hide for now
                  </button>
                  <button
                    type="button"
                    className="planner-secondary"
                    onClick={() => openNew(s)}
                  >
                    Plan this
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="planner-empty">
            {lessons.length ? (
              <>
                <h3>No suggestions to add right now</h3>
                <p>
                  Your lessons may already be planned or recently studied, or
                  your available time may be full. You can always add a session
                  yourself.
                </p>
                {dismissed.length > 0 && (
                  <button
                    type="button"
                    className="planner-text-button"
                    onClick={() => setDismissed([])}
                  >
                    Show hidden suggestions
                  </button>
                )}
              </>
            ) : (
              <>
                <h3>Connect your plan to a lesson</h3>
                <p>Upload a lesson in a subject to get study suggestions.</p>
                <Link className="planner-secondary" to="/subjects">
                  Open subjects
                </Link>
              </>
            )}
          </div>
        )}
      </section>

      {legacyTasks.length > 0 && (
        <details className="planner-panel planner-legacy">
          <summary>
            Previous tasks on this browser ({legacyTasks.length})
          </summary>
          <p className="planner-muted">
            These earlier tasks were shared across accounts on this browser.
            Choose one of your tasks to use in your own plan, and select a
            subject if its previous subject is unavailable. Past XP is
            preserved; completing a scheduled session does not award extra XP.
          </p>
          {legacyTasks.map((task) => (
            <div className="planner-legacy-task" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>
                  {task.completed ? "Completed" : "Previously pending"}
                  {validDate(task.dueDate)
                    ? " · " + dateLabel(task.dueDate)
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className="planner-secondary"
                onClick={() =>
                  openNew({
                    title: task.title,
                    subjectId: subjects.some(
                      (s) => String(s.id) === String(task.subjectId),
                    )
                      ? task.subjectId
                      : "",
                    date:
                      validDate(task.dueDate) && task.dueDate >= today
                        ? task.dueDate
                        : today,
                  })
                }
              >
                Use in plan
              </button>
            </div>
          ))}
        </details>
      )}

      {editor && (
        <SessionEditor
          initial={editor}
          plan={plan}
          subjects={subjects}
          lessons={lessons}
          onSave={saveSession}
          onClose={() => setEditor(null)}
          saving={saving}
        />
      )}
      {showSettings && (
        <PlanSettings
          saving={saving}
          plan={plan}
          subjects={subjects}
          onClose={() => setShowSettings(false)}
          onSave={async (preferences) => {
            const saveError = await savePlan({ ...plan, ...preferences });
            if (!saveError) {
              setShowSettings(false);
              setNotice("Study time and exam dates saved.");
            }
            return saveError;
          }}
        />
      )}
    </div>
  );
}
