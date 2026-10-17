
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Target,
  Zap,
  Flame,
  Trophy,
  ArrowRight,
  Plus,
  Sparkles,
  Clock3,
  TrendingUp,
  PlayCircle,
  ClipboardCheck,
} from "lucide-react";
import "./Dashboard.css";
import FocusTimer from "./FocusTimer";

const SUBJECTS_KEY = "learnquest-subjects";
const LESSONS_KEY = "learnquest-lessons";
const RESULTS_KEY = "learnquest-quiz-results";
const PROFILE_KEY = "learnquest-profile";
const TASKS_KEY = "learnquest-study-tasks";
const TASK_XP = 5;

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readProfile() {
  try {
    return JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "{}"
    ) || {};
  } catch {
    return {};
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

function getLocalDay(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

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

    const xp = results.reduce((sum, result) => {
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
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      xp: xp + taskXP,
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

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Dashboard() {
  const [data, setData] = useState({
    subjects: [],
    lessons: [],
    results: [],
    tasks: [],
    profile: {},
  });

  useEffect(() => {
    function loadData() {
      setData({
        subjects: readArray(SUBJECTS_KEY),
        lessons: readArray(LESSONS_KEY),
        results: readArray(RESULTS_KEY),
        tasks: readArray(TASKS_KEY),
        profile: readProfile(),
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
  }, []);

  const {
    subjects,
    lessons,
    results,
    tasks,
    profile,
  } = data;

  const totalXP = useMemo(() => {
    const quizXP = results.reduce(
      (sum, result) => sum + getXP(result),
      0
    );
    const taskXP = tasks.filter(
      (task) => task.xpAwarded === true
    ).length * TASK_XP;
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

    // Only completed tasks are included in recent activity.
    const completedTasks = tasks
      .filter((task) => task.completed && task.completedAt)
      .map((task, index) => ({
        type: "task",
        key: `task-${task.id || index}`,
        completedAt: task.completedAt,
        task,
      }));

    return [...quizzes, ...completedTasks]
      .sort((a, b) =>
        new Date(b.completedAt || 0) -
        new Date(a.completedAt || 0)
      )
      .slice(0, 4);
  }, [results, tasks]);

  const recentLessons = useMemo(
    () =>
      [...lessons]
        .sort(
          (a, b) =>
            new Date(
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
            )
        )
        .slice(0, 3),
    [lessons]
  );

  const firstName =
    typeof profile.name === "string" &&
    profile.name.trim()
      ? profile.name.trim().split(/\s+/)[0]
      : "Student";

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

      <FocusTimer />

      {/* REAL STATS */}
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
            {100 - levelProgress} XP until Level {level + 1}
          </small>
        </div>
      </section>

      {/* ACTIVITY AND QUIZZES */}
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
              >
                <span className="lq-xp-chart-value">
                  {day.xp > 0 ? day.xp : ""}
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
                              (day.xp / maxWeeklyXP) * 100
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
              )} XP earned in the last 7 days
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
              <p>Your latest quiz and study achievements</p>
            </div>
          </div>

          {recentActivity.length > 0 ? (
            <div className="lq-recent-quiz-list">
              {recentActivity.map((activity, index) => {
                if (activity.type === "task") {
                  const task = activity.task;
                  const subject = subjects.find(
                    (item) => String(item.id) === String(task.subjectId)
                  );

                  return (
                    <div className="lq-recent-quiz" key={activity.key}>
                      <div className="lq-recent-quiz-icon">
                        <ClipboardCheck size={19} />
                      </div>
                      <div className="lq-recent-quiz-info">
                        <strong>{task.title || "Study Task"}</strong>
                        <span>
                          {subject?.name || "Study Planner"}
                          {" · "}
                          {formatDate(task.completedAt)}
                        </span>
                      </div>
                      <div className="lq-recent-quiz-result">
                        <strong>Done</strong>
                        <span>{task.xpAwarded ? "+5 XP" : "Task"}</span>
                      </div>
                    </div>
                  );
                }

                const quiz = activity.quiz;
                const lesson = lessons.find(
                  (item) => String(item.id) === String(quiz.lessonId)
                );
                const title =
                  lesson?.title ||
                  lesson?.name ||
                  lesson?.fileName ||
                  `Practice Quiz ${index + 1}`;

                return (
                  <div className="lq-recent-quiz" key={activity.key}>
                    <div className="lq-recent-quiz-icon">
                      <Trophy size={19} />
                    </div>
                    <div className="lq-recent-quiz-info">
                      <strong>{title}</strong>
                      <span>
                        {quiz.difficulty || "medium"}
                        {" · "}
                        {formatDate(quiz.completedAt)}
                      </span>
                    </div>
                    <div className="lq-recent-quiz-result">
                      <strong>{Number(quiz.percentage) || 0}%</strong>
                      <span>+{getXP(quiz)} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lq-dashboard-small-empty">
              <Trophy size={30} />
              <h3>No activity yet</h3>
              <p>
                Complete a quiz or study task to start earning XP.
              </p>
              <Link to="/study-planner">
                Open Study Planner
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SUBJECTS AND RECENT LESSONS */}
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
              {subjects.slice(0, 4).map((subject, index) => {
                const subjectLessons = lessons.filter(
                  (lesson) =>
                    String(lesson.subjectId) ===
                    String(subject.id)
                );

                return (
                  <Link
                    key={subject.id || index}
                    to={`/subjects/${subject.id}`}
                    className="lq-subject-preview"
                  >
                    <div className="lq-subject-preview-icon">
                      <BookOpen size={20} />
                    </div>

                    <div>
                      <strong>
                        {subject.name ||
                          subject.title ||
                          "Untitled Subject"}
                      </strong>
                      <span>
                        {subjectLessons.length} lessons
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
              {recentLessons.map((lesson, index) => {
                const subjectId =
                  lesson.subjectId ||
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
              })}
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
