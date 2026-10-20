
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  Plus,
  Clock3,
  TrendingUp,
  PlayCircle,
  ClipboardCheck,
} from "lucide-react";

import "./Dashboard.css";
import FocusTimer from "./FocusTimer";
import { API_URL } from "../utils/api";
import SubjectIcon from "../components/SubjectIcon";
import { getSubjectIconKey } from "../utils/subjectIconConfig";

const TASK_XP = 5;
const RESULTS_KEY = "learnquest-quiz-results";
const TASKS_KEY = "learnquest-study-tasks";

function userKey(userId, type) {
  return `learnquest-user-${userId}-${type}`;
}

function readArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getXP(result) {
  const xp = Number(result.xpEarned);

  if (Number.isFinite(xp) && xp >= 0) {
    return xp;
  }

  const score = Number(result.score);

  return Number.isFinite(score) && score >= 0
    ? score * 10
    : 0;
}

function getLocalDay(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getLastSevenDays(results, tasks) {
  const today = new Date();
  const days = [];

  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);

    const key = getLocalDay(date);

    const quizXP = results.reduce((sum, result) => {
      return getLocalDay(result.completedAt) === key
        ? sum + getXP(result)
        : sum;
    }, 0);

    const taskXP = tasks.reduce((sum, task) => {
      return task.xpAwarded === true &&
        getLocalDay(task.completedAt) === key
        ? sum + TASK_XP
        : sum;
    }, 0);

    days.push({
      key,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
      }),
      xp: quizXP + taskXP,
    });
  }

  return days;
}

function getLevelName(level) {
  if (level === 1) return "Beginner";
  if (level === 2) return "Explorer";
  if (level === 3) return "Achiever";
  if (level === 4) return "Scholar";
  if (level === 5) return "Master";

  return "Learning Champion";
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent activity";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [data, setData] = useState({
    subjects: [],
    lessons: [],
    results: [],
    tasks: [],
  });

  useEffect(() => {
    function scrollToFocus() {
      if (window.location.hash !== "#focus-mode") return;

      window.setTimeout(() => {
        document.getElementById("focus-mode")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }

    scrollToFocus();
    window.addEventListener("hashchange", scrollToFocus);

    return () => {
      window.removeEventListener("hashchange", scrollToFocus);
    };
  }, [loading]);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Please log in to view your dashboard."
          );
        }

        const result = await response.json();

        if (!result.user?.id) {
          throw new Error(
            "Unable to identify your account."
          );
        }

        if (active) {
          setAccount(result.user);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!account?.id) return;

    function loadData() {
      const userId = account.id;

      const subjects = readArray(
        userKey(userId, "subjects")
      );

      const lessons = readArray(
        userKey(userId, "lessons")
      );

      const results = readArray(RESULTS_KEY);

      const tasks = readArray(TASKS_KEY);

      // Show only lessons belonging to this user's subjects.
      const subjectIds = new Set(
        subjects.map((subject) => String(subject.id))
      );

      const safeLessons = lessons.filter((lesson) =>
        subjectIds.has(
          String(lesson.subjectId ?? lesson.subject_id)
        )
      );

      setData({
        subjects,
        lessons: safeLessons,
        results,
        tasks,
      });
    }

    loadData();

    window.addEventListener("focus", loadData);
    window.addEventListener("storage", loadData);
    window.addEventListener(
      "learnquest:stats-updated",
      loadData
    );

    return () => {
      window.removeEventListener("focus", loadData);
      window.removeEventListener("storage", loadData);
      window.removeEventListener(
        "learnquest:stats-updated",
        loadData
      );
    };
  }, [account?.id]);

  const { subjects, lessons, results, tasks } = data;

  const totalXP = useMemo(() => {
    const quizXP = results.reduce(
      (sum, result) => sum + getXP(result),
      0
    );

    const taskXP =
      tasks.filter((task) => task.xpAwarded === true)
        .length * TASK_XP;

    return quizXP + taskXP;
  }, [results, tasks]);

  const averageScore = useMemo(() => {
    if (!results.length) return null;

    const sum = results.reduce(
      (total, result) =>
        total + (Number(result.percentage) || 0),
      0
    );

    return Math.round(sum / results.length);
  }, [results]);

  const level = Math.floor(totalXP / 100) + 1;
  const levelName = getLevelName(level);
  const levelProgress = totalXP % 100;

  const weeklyXP = useMemo(
    () => getLastSevenDays(results, tasks),
    [results, tasks]
  );

  const maxWeeklyXP = Math.max(
    10,
    ...weeklyXP.map((day) => day.xp)
  );

  const recentActivity = useMemo(() => {
    const quizzes = results.map((quiz, index) => ({
      type: "quiz",
      key: `quiz-${quiz.id || index}`,
      completedAt: quiz.completedAt,
      quiz,
    }));

    const completedTasks = tasks
      .filter((task) => task.completed && task.completedAt)
      .map((task, index) => ({
        type: "task",
        key: `task-${task.id || index}`,
        completedAt: task.completedAt,
        task,
      }));

    return [...quizzes, ...completedTasks]
      .sort(
        (a, b) =>
          new Date(b.completedAt || 0) -
          new Date(a.completedAt || 0)
      )
      .slice(0, 4);
  }, [results, tasks]);

  const recentLessons = useMemo(() => {
    let lastOpenedLessonId = null;
    let lastOpenedSubjectId = null;

    try {
      const saved = JSON.parse(
        localStorage.getItem(userKey(account?.id, "last-opened-lesson")) || "null"
      );
      lastOpenedLessonId = saved?.lessonId;
      lastOpenedSubjectId = saved?.subjectId;
    } catch {
      // Recent uploads remain available if the saved pointer is invalid.
    }

    return [...lessons]
      .sort(
        (a, b) => {
          const aIsLastOpened =
            String(a.id) === String(lastOpenedLessonId) &&
            String(a.subjectId ?? a.subject_id) === String(lastOpenedSubjectId);
          const bIsLastOpened =
            String(b.id) === String(lastOpenedLessonId) &&
            String(b.subjectId ?? b.subject_id) === String(lastOpenedSubjectId);

          if (aIsLastOpened !== bIsLastOpened) return aIsLastOpened ? -1 : 1;

          return new Date(
            b.updatedAt ||
              b.createdAt ||
              b.uploadedAt ||
              0
          ) -
          new Date(
            a.updatedAt ||
              a.createdAt ||
              a.uploadedAt ||
              0
          );
        }
      )
      .slice(0, 3);
  }, [lessons, account]);

  const firstName =
    typeof account?.name === "string" &&
    account.name.trim()
      ? account.name.trim().split(/\s+/)[0]
      : "Student";

  if (loading) {
    return (
      <div className="lq-dashboard">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lq-dashboard">
        <p role="alert">{error}</p>
      </div>
    );
  }

  return (
    <div className="lq-dashboard">
      {/* WELCOME */}
      <section className="lq-dashboard-welcome">
        <div>
          <span className="lq-dashboard-eyebrow">
            YOUR LEARNING SPACE
          </span>

          <h1>
            Welcome back, {firstName}!
            <span> ✨</span>
          </h1>

          <p>
            Every lesson, quiz, and point brings
            you closer to your goals.
          </p>
        </div>

        <div className="lq-dashboard-level-chip">
          <Trophy size={19} />
          <span>
            Level {level} · {levelName}
          </span>
        </div>
      </section>

      {/* PRIMARY STUDY ACTIONS */}
      <section className="lq-dashboard-actions" aria-label="Primary study actions">
        <div className="lq-dashboard-actions-intro">
          <span className="lq-dashboard-eyebrow">START HERE</span>
          <h2>What do you want to do?</h2>
          <p>Reach your subjects and study tools without searching.</p>
        </div>

        <div className="lq-dashboard-action-grid">
          <Link to="/subjects" className="lq-dashboard-action primary">
            <Plus size={22} />
            <span>
              <strong>Create or open a subject</strong>
              <small>Organize your lessons</small>
            </span>
            <ArrowRight size={17} />
          </Link>

          <Link to="/study-planner" className="lq-dashboard-action">
            <ClipboardCheck size={22} />
            <span>
              <strong>Plan your next study session</strong>
              <small>Keep your work organized</small>
            </span>
            <ArrowRight size={17} />
          </Link>

          <Link to="/my-progress" className="lq-dashboard-action">
            <Target size={22} />
            <span>
              <strong>Review your progress</strong>
              <small>See quiz scores and XP</small>
            </span>
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <FocusTimer />

      {/* DASHBOARD STATISTICS */}
      <section className="lq-dashboard-stats">
        <div className="lq-dashboard-stat">
          <div className="lq-stat-icon purple">
            <BookOpen size={22} />
          </div>

          <span className="lq-stat-label">
            Total Subjects
          </span>

          <strong>{subjects.length}</strong>

          <small>
            Courses in your workspace
          </small>
        </div>

        <div className="lq-dashboard-stat">
          <div className="lq-stat-icon blue">
            <FileText size={22} />
          </div>

          <span className="lq-stat-label">
            Uploaded Lessons
          </span>

          <strong>{lessons.length}</strong>

          <small>
            Your available study materials
          </small>
        </div>

        <div className="lq-dashboard-stat">
          <div className="lq-stat-icon green">
            <Target size={22} />
          </div>

          <span className="lq-stat-label">
            Average Quiz Score
          </span>

          <strong>
            {averageScore === null
              ? "—"
              : `${averageScore}%`}
          </strong>

          <small>
            From {results.length} completed quizzes
          </small>
        </div>

        <div className="lq-dashboard-stat">
          <div className="lq-stat-icon gold">
            <Zap size={22} />
          </div>

          <span className="lq-stat-label">
            Total XP Earned
          </span>

          <strong>{totalXP}</strong>

          <small>
            {100 - levelProgress} XP until Level{" "}
            {level + 1}
          </small>
        </div>
      </section>

      {/* XP JOURNEY AND ACTIVITY */}
      <section className="lq-dashboard-two-columns">
        <div className="lq-dashboard-panel">
          <div className="lq-panel-heading">
            <div>
              <h2>
                <TrendingUp size={20} />
                Your XP Journey
              </h2>

              <p>
                Points earned during the last 7 days
              </p>
            </div>

            <span className="lq-panel-tag">
              This Week
            </span>
          </div>

          <div className="lq-xp-chart">
            {weeklyXP.map((day) => (
              <div
                className="lq-xp-chart-column"
                key={day.key}
                aria-label={`${day.label}: ${day.xp} XP`}
              >
                <span className="lq-xp-chart-value">
                  {day.xp}
                </span>

                <div className="lq-xp-chart-track">
                  <div
                    className="lq-xp-chart-bar"
                    style={{
                      height:
                        day.xp === 0
                          ? "4px"
                          : `${Math.max(
                              10,
                              (day.xp / maxWeeklyXP) *
                                100
                            )}%`,
                    }}
                    title={`${day.xp} XP`}
                  />
                </div>

                <span className="lq-xp-chart-day">
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div className="lq-chart-footer">
            <Zap size={16} />

            <span>
              {weeklyXP.reduce(
                (sum, day) => sum + day.xp,
                0
              )}{" "}
              XP earned in the last 7 days
            </span>
          </div>
        </div>

        <div className="lq-dashboard-panel">
          <div className="lq-panel-heading">
            <div>
              <h2>
                <ClipboardCheck size={20} />
                Recent Activity
              </h2>

              <p>
                Your latest quiz and study achievements
              </p>
            </div>
          </div>

          {recentActivity.length > 0 ? (
            <div className="lq-recent-quiz-list">
              {recentActivity.map(
                (activity, index) => {
                  if (activity.type === "task") {
                    const task = activity.task;

                    const subject = subjects.find(
                      (item) =>
                        String(item.id) ===
                        String(task.subjectId)
                    );

                    return (
                      <div
                        className="lq-recent-quiz"
                        key={activity.key}
                      >
                        <div className="lq-recent-quiz-icon">
                          <ClipboardCheck size={19} />
                        </div>

                        <div className="lq-recent-quiz-info">
                          <strong>
                            {task.title ||
                              "Study Task"}
                          </strong>

                          <span>
                            {subject?.name ||
                              "Study Planner"}
                            {" · "}
                            {formatDate(
                              task.completedAt
                            )}
                          </span>
                        </div>

                        <div className="lq-recent-quiz-result">
                          <strong>Done</strong>
                          <span>
                            {task.xpAwarded
                              ? "+5 XP"
                              : "Task"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const quiz = activity.quiz;

                  const lesson = lessons.find(
                    (item) =>
                      String(item.id) ===
                      String(quiz.lessonId)
                  );

                  const title =
                    lesson?.title ||
                    lesson?.name ||
                    lesson?.fileName ||
                    `Practice Quiz ${index + 1}`;

                  return (
                    <div
                      className="lq-recent-quiz"
                      key={activity.key}
                    >
                      <div className="lq-recent-quiz-icon">
                        <Trophy size={19} />
                      </div>

                      <div className="lq-recent-quiz-info">
                        <strong>{title}</strong>

                        <span>
                          {quiz.difficulty ||
                            "medium"}
                          {" · "}
                          {formatDate(
                            quiz.completedAt
                          )}
                        </span>
                      </div>

                      <div className="lq-recent-quiz-result">
                        <strong>
                          {Number(
                            quiz.percentage
                          ) || 0}
                          %
                        </strong>

                        <span>
                          +{getXP(quiz)} XP
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="lq-dashboard-small-empty">
              <Trophy size={30} />

              <h3>No activity yet</h3>

              <p>
                Complete a quiz to start earning XP.
              </p>

              <Link to="/subjects">
                Open Subjects
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SUBJECTS AND LESSONS */}
      <section className="lq-dashboard-two-columns lq-dashboard-bottom">
        <div className="lq-dashboard-panel">
          <div className="lq-panel-heading">
            <div>
              <h2>
                <BookOpen size={20} />
                My Subjects
              </h2>

              <p>
                Continue exploring your courses
              </p>
            </div>

            <Link
              to="/subjects"
              className="lq-panel-link"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>

          {subjects.length > 0 ? (
            <div className="lq-subject-preview-list">
              {subjects
                .slice(0, 4)
                .map((subject, index) => {
                  const subjectLessons =
                    lessons.filter(
                      (lesson) =>
                        String(
                          lesson.subjectId ??
                            lesson.subject_id
                        ) === String(subject.id)
                    );

                  return (
                    <Link
                      key={subject.id || index}
                      to={`/subjects/${subject.id}`}
                      className="lq-subject-preview"
                    >
                      <div className={`lq-subject-preview-icon subject-visual--${getSubjectIconKey(subject)}`}>
                        <SubjectIcon subject={subject} size={20} />
                      </div>

                      <div>
                        <strong>
                          {subject.name ||
                            subject.title ||
                            "Untitled Subject"}
                        </strong>

                        <span>
                          {subjectLessons.length}{" "}
                          lessons
                        </span>
                      </div>

                      <ArrowRight size={17} />
                    </Link>
                  );
                })}
            </div>
          ) : (
            <div className="lq-dashboard-small-empty">
              <BookOpen size={30} />

              <h3>No subjects yet</h3>

              <p>
                Add your first subject to organize
                your learning materials.
              </p>

              <Link to="/subjects">
                <Plus size={15} />
                Add Subject
              </Link>
            </div>
          )}
        </div>

        <div className="lq-dashboard-panel">
          <div className="lq-panel-heading">
            <div>
              <h2>
                <Clock3 size={20} />
                Continue Learning
              </h2>

              <p>
                Jump back into your study materials
              </p>
            </div>
          </div>

          {recentLessons.length > 0 ? (
            <div className="lq-lesson-preview-list">
              {recentLessons.map(
                (lesson, index) => {
                  const subjectId =
                    lesson.subjectId ??
                    lesson.subject_id;

                  const lessonId = lesson.id;

                  const canOpen =
                    subjectId != null &&
                    lessonId != null;

                  const content = (
                    <>
                      <div className="lq-lesson-preview-icon">
                        <PlayCircle size={21} />
                      </div>

                      <div>
                        <strong>
                          {lesson.title ||
                            lesson.name ||
                            lesson.fileName ||
                            "Untitled Lesson"}
                        </strong>

                        <span>
                          Open your study workspace
                        </span>
                      </div>

                      <ArrowRight size={17} />
                    </>
                  );

                  return canOpen ? (
                    <Link
                      key={lessonId}
                      to={`/subjects/${subjectId}/lessons/${lessonId}`}
                      className="lq-lesson-preview"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={lessonId || index}
                      className="lq-lesson-preview"
                    >
                      {content}
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="lq-dashboard-small-empty">
              <FileText size={30} />

              <h3>No lessons uploaded</h3>

              <p>
                Upload a PDF or PowerPoint lesson
                to start studying with AI.
              </p>

              <Link to="/subjects">
                Go to My Subjects
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
