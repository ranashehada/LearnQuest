
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ListTodo,
  Trophy,
  Target,
  Zap,
  BookOpen,
  Sparkles,
} from "lucide-react";
import "./StudyPlanner.css";

const TASKS_KEY = "learnquest-study-tasks";
const SUBJECTS_KEY = "learnquest-subjects";
const TASK_XP = 5;

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

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "No due date";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudyPlanner() {
  const [tasks, setTasks] = useState(() =>
    readArray(TASKS_KEY)
  );

  const [subjects, setSubjects] = useState(() =>
    readArray(SUBJECTS_KEY)
  );

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState(getLocalDate);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function refreshSubjects() {
      setSubjects(readArray(SUBJECTS_KEY));
    }

    window.addEventListener("focus", refreshSubjects);
    window.addEventListener("storage", refreshSubjects);

    return () => {
      window.removeEventListener(
        "focus",
        refreshSubjects
      );
      window.removeEventListener(
        "storage",
        refreshSubjects
      );
    };
  }, []);

  function saveTasks(updated) {
    try {
      localStorage.setItem(
        TASKS_KEY,
        JSON.stringify(updated)
      );

      setTasks(updated);
      setError("");

      window.dispatchEvent(
        new Event("learnquest:stats-updated")
      );

      return true;
    } catch {
      setError("Unable to save tasks. Please try again.");
      return false;
    }
  }

  function addTask(event) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      subjectId: subjectId || null,
      dueDate: dueDate || null,
      completed: false,
      xpAwarded: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    if (saveTasks([newTask, ...tasks])) {
      setTitle("");
      setSubjectId("");
      setDueDate(getLocalDate());
      setShowForm(false);
    }
  }

  function toggleTask(taskId) {
    const updated = tasks.map((task) => {
      if (task.id !== taskId) return task;

      const completed = !task.completed;

      return {
        ...task,
        completed,
        completedAt: completed
          ? new Date().toISOString()
          : null,
        xpAwarded: task.xpAwarded || completed,
      };
    });

    saveTasks(updated);
  }

  function deleteTask(taskId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    saveTasks(tasks.filter((task) => task.id !== taskId));
  }

  function getSubjectName(id) {
    if (!id) return "General Study";

    const subject = subjects.find(
      (item) => String(item.id) === String(id)
    );

    return subject?.name || "Deleted Subject";
  }

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = tasks.length - completedTasks;

  const progress = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  const earnedXP =
    tasks.filter((task) => task.xpAwarded).length * TASK_XP;

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "pending") return !task.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return a.dueDate.localeCompare(b.dueDate);
    });

  return (
    <div className="lq-planner-page">
      <section className="lq-planner-hero">
        <div>
          <span className="lq-planner-eyebrow">
            YOUR LEARNING JOURNEY
          </span>
          <h1>Study Planner ✨</h1>
          <p>
            Plan your goals, stay organized, and
            celebrate every achievement.
          </p>
        </div>

        <div className="lq-planner-hero-icon">
          <CalendarDays size={32} />
        </div>
      </section>

      <div className="lq-planner-stats">
        <div className="lq-planner-stat">
          <span className="lq-planner-stat-icon purple">
            <ListTodo size={21} />
          </span>
          <strong>{tasks.length}</strong>
          <p>Total Tasks</p>
        </div>

        <div className="lq-planner-stat">
          <span className="lq-planner-stat-icon green">
            <CheckCircle2 size={21} />
          </span>
          <strong>{completedTasks}</strong>
          <p>Completed</p>
        </div>

        <div className="lq-planner-stat">
          <span className="lq-planner-stat-icon orange">
            <Target size={21} />
          </span>
          <strong>{pendingTasks}</strong>
          <p>Pending</p>
        </div>

        <div className="lq-planner-stat">
          <span className="lq-planner-stat-icon yellow">
            <Zap size={21} />
          </span>
          <strong>{earnedXP}</strong>
          <p>Planner XP</p>
        </div>
      </div>

      <section className="lq-planner-card">
        <div className="lq-planner-section-heading">
          <div>
            <h2>Your Progress</h2>
            <p>Every completed task brings you closer.</p>
          </div>
          <span className="lq-planner-progress-value">
            {progress}%
          </span>
        </div>

        <div
          className="lq-planner-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Study tasks completed"
        >
          <div
            className="lq-planner-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="lq-planner-progress-note">
          {completedTasks} of {tasks.length} tasks completed
        </p>
      </section>

      <section className="lq-planner-card">
        <div className="lq-planner-section-heading">
          <div>
            <h2>My Study Tasks</h2>
            <p>Keep your learning goals on track.</p>
          </div>

          <button
            type="button"
            className="lq-planner-primary"
            onClick={() => {
              setShowForm((previous) => !previous);
              setError("");
            }}
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>

        {showForm && (
          <form
            className="lq-planner-form"
            onSubmit={addTask}
          >
            <label htmlFor="planner-title">
              Task Title *
            </label>
            <input
              id="planner-title"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Review HCI Lecture 3"
              maxLength={150}
              required
            />

            <div className="lq-planner-form-grid">
              <div>
                <label htmlFor="planner-subject">
                  Subject
                </label>
                <select
                  id="planner-subject"
                  value={subjectId}
                  onChange={(event) =>
                    setSubjectId(event.target.value)
                  }
                >
                  <option value="">General Study</option>
                  {subjects.map((subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="planner-date">
                  Due Date
                </label>
                <input
                  id="planner-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
                  }
                />
              </div>
            </div>

            {error && (
              <p className="lq-planner-error" role="alert">
                {error}
              </p>
            )}

            <div className="lq-planner-form-actions">
              <button
                type="button"
                className="lq-planner-secondary"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="lq-planner-primary"
              >
                <Plus size={17} />
                Create Task
              </button>
            </div>
          </form>
        )}

        {error && !showForm && (
          <p className="lq-planner-error" role="alert">
            {error}
          </p>
        )}

        <div className="lq-planner-filters">
          {[
            { value: "all", label: "All Tasks" },
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={
                filter === item.value ? "active" : ""
              }
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="lq-planner-empty">
            <BookOpen size={38} />
            <h3>
              {tasks.length === 0
                ? "No study tasks yet"
                : "No tasks in this category"}
            </h3>
            <p>
              {tasks.length === 0
                ? "Create your first task and start planning your success."
                : "Try another filter to see your tasks."}
            </p>
          </div>
        ) : (
          <div className="lq-planner-task-list">
            {filteredTasks.map((task) => {
              const overdue =
                !task.completed &&
                task.dueDate &&
                task.dueDate < getLocalDate();

              return (
                <article
                  key={task.id}
                  className={`lq-planner-task ${
                    task.completed ? "completed" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="lq-planner-check"
                    onClick={() => toggleTask(task.id)}
                    aria-label={
                      task.completed
                        ? `Mark ${task.title} as pending`
                        : `Complete ${task.title}`
                    }
                  >
                    {task.completed ? (
                      <CheckCircle2 size={25} />
                    ) : (
                      <Circle size={25} />
                    )}
                  </button>

                  <div className="lq-planner-task-content">
                    <h3>{task.title}</h3>

                    <div className="lq-planner-task-meta">
                      <span>
                        <BookOpen size={14} />
                        {getSubjectName(task.subjectId)}
                      </span>

                      <span className={overdue ? "overdue" : ""}>
                        <CalendarDays size={14} />
                        {formatDate(task.dueDate)}
                        {overdue ? " · Overdue" : ""}
                      </span>
                    </div>
                  </div>

                  {task.xpAwarded && (
                    <span className="lq-planner-xp-badge">
                      <Zap size={14} />
                      +5 XP
                    </span>
                  )}

                  <button
                    type="button"
                    className="lq-planner-delete"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                    title="Delete task"
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="lq-planner-footer">
        <Trophy size={19} />
        <span>
          {completedTasks > 0
            ? "Great work! Every small step counts."
            : "Start with one task and build your momentum!"}
        </span>
        <Sparkles size={18} />
      </div>
    </div>
  );
}
