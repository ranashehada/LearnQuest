
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
  LogOut,
} from "lucide-react";
import { API_URL } from "../utils/api";
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
  if (!dateValue) return null;

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

function getNextMilestone(xp) {
  // Honest progress goals only — no unimplemented feature unlocks.
  const milestones = [250, 500, 1000, 2000];
  const nextXp =
    milestones.find((goal) => xp < goal) ||
    Math.ceil((xp + 100) / 100) * 100;

  return {
    xp: nextXp,
    label: `${nextXp.toLocaleString()} XP goal`,
  };
}

export default function TopHeader() {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);

  const [profile, setProfile] = useState({
    name: "Student",
    photoURL: "",
  });

  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // Get the real account name and email.
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
          if (active) {
            navigate("/login", { replace: true });
          }
          return;
        }

        const data = await response.json();

        if (active && data.user) {
          setAccount(data.user);
        }
      } catch (error) {
        console.error("Unable to load account:", error);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [navigate]);

  // Close the profile menu with Escape or an outside click.
  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    function handlePointerDown(event) {
      const wrapper = event.target.closest(".lq-profile-wrapper");
      if (!wrapper) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  // Keep the existing profile photo and statistics.
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

      const taskXp =
        tasks.filter((task) => task.xpAwarded === true)
          .length * POINTS_PER_TASK;

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

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      setMenuOpen(false);

      // Do not clear localStorage:
      // it contains existing learning data and uploaded-file references.
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLoggingOut(false);
    }
  }

  const level = Math.floor(totalXp / 100) + 1;
  const levelName = getLevelName(level);
  const levelXp = totalXp % 100;
  const xpRemaining = 100 - levelXp;
  const progress = levelXp;
  const nextMilestone = getNextMilestone(totalXp);
  const milestoneRemaining = Math.max(
    nextMilestone.xp - totalXp,
    0
  );

  // Prefer the Full Name saved on Profile; fall back to the account name.
  const savedProfileName = profile.name?.trim();
  const displayName =
    savedProfileName && savedProfileName !== "Student"
      ? savedProfileName
      : account?.name || savedProfileName || "Student";

  return (
    <header className="lq-gamified-header">
      <div className="lq-gamified-main">
        {/* WELCOME MESSAGE */}
        <div className="lq-gamified-welcome">
          <div className="lq-welcome-icon">
            <GraduationCap size={23} aria-hidden="true" />
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
            aria-label={`${streak} day study streak`}
          >
            <Flame size={19} aria-hidden="true" />
            <span>{streak}</span>
            <small>Streak</small>
          </div>

          <div
            className="lq-game-badge lq-xp-badge"
            title="Total XP earned"
            aria-label={`${totalXp} total experience points`}
          >
            <Zap size={19} aria-hidden="true" />
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
              aria-haspopup="menu"
              aria-controls="lq-profile-menu"
              aria-label="Open profile menu"
            >
              <div className="lq-game-avatar">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt=""
                  />
                ) : (
                  <UserRound size={22} aria-hidden="true" />
                )}
              </div>

              <ChevronDown size={15} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                id="lq-profile-menu"
                className="lq-profile-dropdown"
                role="menu"
                aria-label="Profile menu"
              >
                <div className="lq-dropdown-user">
                  <div className="lq-game-avatar">
                    {profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt=""
                      />
                    ) : (
                      <UserRound size={22} aria-hidden="true" />
                    )}
                  </div>

                  <div>
                    <strong>{displayName}</strong>

                    {account?.email && (
                      <span>{account.email}</span>
                    )}

                    <span>
                      Level {level} · {levelName}
                    </span>
                  </div>
                </div>

                <div className="lq-dropdown-divider" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  <UserRound size={17} aria-hidden="true" />
                  My Profile
                  <ArrowRight size={15} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/my-progress");
                  }}
                >
                  <Trophy size={17} aria-hidden="true" />
                  My Progress
                  <ArrowRight size={15} aria-hidden="true" />
                </button>

                <div className="lq-dropdown-divider" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut size={17} aria-hidden="true" />

                  {loggingOut
                    ? "Logging Out..."
                    : "Log Out"}

                  <ArrowRight size={15} aria-hidden="true" />
                </button>

                {logoutError && (
                  <p
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  >
                    {logoutError}
                  </p>
                )}
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

          <div
            className="lq-level-progress-track"
            role="progressbar"
            aria-label="Level progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="lq-level-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p>
            {xpRemaining} more XP to reach Level {level + 1}!
          </p>

          <div className="lq-milestone-progress">
            <span>
              Next progress goal: {nextMilestone.label}
            </span>
            <strong>
              {milestoneRemaining > 0
                ? `${milestoneRemaining} XP remaining`
                : "Goal reached"}
            </strong>
          </div>
        </div>
      </div>
    </header>
  );
}
