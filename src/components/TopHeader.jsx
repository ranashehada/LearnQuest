
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Zap,
  ChevronDown,
  UserRound,
  GraduationCap,
  Trophy,
  Star,
  ArrowRight,
} from "lucide-react";
import "./TopHeader.css";

const RESULTS_KEY = "learnquest-quiz-results";
const PROFILE_KEY = "learnquest-profile";
const ACTIVITY_KEY = "learnquest-study-activity";
const TASKS_KEY = "learnquest-study-tasks";

const POINTS_PER_TASK = 5;

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getLocalDay(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateStreak(dates) {
  const uniqueDates = new Set(
    dates.map(getLocalDay).filter(Boolean)
  );

  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  if (!uniqueDates.has(getLocalDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);

    if (!uniqueDates.has(getLocalDay(cursor))) {
      return 0;
    }
  }

  let streak = 0;

  while (uniqueDates.has(getLocalDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLevelName(level) {
  if (level === 1) return "Beginner";
  if (level === 2) return "Explorer";
  if (level === 3) return "Achiever";
  if (level === 4) return "Scholar";
  if (level === 5) return "Master";
  return "Learning Champion";
}

export default function TopHeader() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "Student",
    photoURL: "",
  });

  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function updateStats() {
      const savedProfile = readJSON(PROFILE_KEY, {});
      const quizResults = readJSON(RESULTS_KEY, []);
      const studyActivity = readJSON(ACTIVITY_KEY, []);
      const studyTasks = readJSON(TASKS_KEY, []);

      setProfile({
        name: savedProfile.name || "Student",
        photoURL: savedProfile.photoURL || "",
      });

      const results = Array.isArray(quizResults)
        ? quizResults
        : [];

      const tasks = Array.isArray(studyTasks)
        ? studyTasks
        : [];

      // XP earned from AI quizzes
      const quizXp = results.reduce((total, result) => {
        const earned = Number(result.xpEarned);

        if (Number.isFinite(earned) && earned >= 0) {
          return total + earned;
        }

        const score = Number(result.score);

        return (
          total +
          (Number.isFinite(score) && score >= 0
            ? score * 10
            : 0)
        );
      }, 0);

      // XP earned from Study Planner tasks
      // Each task earns XP only once.
      const taskXp =
        tasks.filter((task) => task.xpAwarded === true)
          .length * POINTS_PER_TASK;

      // Combine all earned XP
      setTotalXp(quizXp + taskXp);

      const activities = Array.isArray(studyActivity)
        ? studyActivity
        : [];

      const quizDates = results
        .map((result) => result.completedAt)
        .filter(Boolean);

      const taskDates = tasks
        .filter((task) => task.completed && task.completedAt)
        .map((task) => task.completedAt);

      // Study streak includes quiz and task activity.
      setStreak(
        calculateStreak([
          ...activities,
          ...quizDates,
          ...taskDates,
        ])
      );
    }

    updateStats();

    window.addEventListener("focus", updateStats);
    window.addEventListener("storage", updateStats);
    window.addEventListener(
      "learnquest:stats-updated",
      updateStats
    );

    return () => {
      window.removeEventListener("focus", updateStats);
      window.removeEventListener("storage", updateStats);
      window.removeEventListener(
        "learnquest:stats-updated",
        updateStats
      );
    };
  }, []);

  const level = Math.floor(totalXp / 100) + 1;
  const levelName = getLevelName(level);
  const levelXp = totalXp % 100;
  const xpRemaining = 100 - levelXp;
  const progress = levelXp;

  return (
    <header className="lq-gamified-header">
      <div className="lq-gamified-main">
        {/* WELCOME MESSAGE */}
        <div className="lq-gamified-welcome">
          <div className="lq-welcome-icon">
            <GraduationCap size={23} />
          </div>

          <div>
            <h2>Keep Learning!</h2>
            <p>Every lesson brings you closer.</p>
          </div>
        </div>

        {/* STATS AND PROFILE */}
        <div className="lq-gamified-right">
          <div
            className="lq-game-badge lq-streak-badge"
            title="Consecutive study days"
          >
            <Flame size={19} />
            <span>{streak}</span>
            <small>Streak</small>
          </div>

          <div
            className="lq-game-badge lq-xp-badge"
            title="Total XP earned"
          >
            <Zap size={19} />
            <span>{totalXp}</span>
            <small>XP</small>
          </div>

          {/* PROFILE MENU */}
          <div className="lq-profile-wrapper">
            <button
              type="button"
              className="lq-profile-trigger"
              onClick={() =>
                setMenuOpen((previous) => !previous)
              }
              aria-expanded={menuOpen}
              aria-label="Open profile menu"
            >
              <div className="lq-game-avatar">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt="Profile"
                  />
                ) : (
                  <UserRound size={22} />
                )}
              </div>

              <ChevronDown size={15} />
            </button>

            {menuOpen && (
              <div className="lq-profile-dropdown">
                <div className="lq-dropdown-user">
                  <div className="lq-game-avatar">
                    {profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt="Profile"
                      />
                    ) : (
                      <UserRound size={22} />
                    )}
                  </div>

                  <div>
                    <strong>{profile.name}</strong>
                    <span>
                      Level {level} · {levelName}
                    </span>
                  </div>
                </div>

                <div className="lq-dropdown-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  <UserRound size={17} />
                  My Profile
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/my-progress");
                  }}
                >
                  <Trophy size={17} />
                  My Progress
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LEVEL PROGRESS */}
      <div className="lq-level-panel">
        <div className="lq-level-left">
          <div className="lq-level-icon">
            <Star size={21} fill="currentColor" />
          </div>

          <div>
            <span className="lq-level-caption">
              YOUR ADVENTURE
            </span>

            <h3>
              Level {level}
              <span> · {levelName}</span>
            </h3>
          </div>
        </div>

        <div className="lq-level-progress-area">
          <div className="lq-level-progress-info">
            <span>Level Progress</span>
            <strong>{levelXp} / 100 XP</strong>
          </div>

          <div className="lq-level-progress-track">
            <div
              className="lq-level-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p>
            {xpRemaining} more XP to reach Level {level + 1}!
          </p>
        </div>
      </div>
    </header>
  );
}
