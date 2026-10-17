
import { useEffect, useRef, useState } from "react";
import {
  UserRound,
  Camera,
  Trash2,
  Save,
  Zap,
  Flame,
  Trophy,
  Target,
  Mail,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import "./Profile.css";

const PROFILE_KEY = "learnquest-profile";
const RESULTS_KEY = "learnquest-quiz-results";
const ACTIVITY_KEY = "learnquest-study-activity";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getXP(result) {
  const earned = Number(result.xpEarned);
  if (Number.isFinite(earned) && earned >= 0) return earned;

  const score = Number(result.score);
  return Number.isFinite(score) && score >= 0
    ? score * 10
    : 0;
}

function localDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function calculateStreak(dates) {
  const days = new Set(dates.map(localDay).filter(Boolean));
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  if (!days.has(localDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDay(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(localDay(cursor))) {
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

export default function Profile() {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "Student",
    email: "",
    photoURL: "",
  });

  const [stats, setStats] = useState({
    xp: 0,
    streak: 0,
    quizzes: 0,
    average: null,
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function loadProfile() {
      const saved = readJSON(PROFILE_KEY, {});
      setForm({
        name: saved.name || "Student",
        email: saved.email || "",
        photoURL: saved.photoURL || "",
      });
    }

    function loadStats() {
      const savedResults = readJSON(RESULTS_KEY, []);
      const savedActivity = readJSON(ACTIVITY_KEY, []);

      const results = Array.isArray(savedResults)
        ? savedResults
        : [];

      const activities = Array.isArray(savedActivity)
        ? savedActivity
        : [];

      const xp = results.reduce(
        (sum, result) => sum + getXP(result),
        0
      );

      const average = results.length
        ? Math.round(
            results.reduce(
              (sum, result) =>
                sum + (Number(result.percentage) || 0),
              0
            ) / results.length
          )
        : null;

      const dates = [
        ...activities,
        ...results.map((result) => result.completedAt),
      ];

      setStats({
        xp,
        streak: calculateStreak(dates),
        quizzes: results.length,
        average,
      });
    }

    loadProfile();
    loadStats();

    window.addEventListener("focus", loadStats);
    window.addEventListener("storage", loadStats);
    window.addEventListener("learnquest:stats-updated", loadStats);

    return () => {
      window.removeEventListener("focus", loadStats);
      window.removeEventListener("storage", loadStats);
      window.removeEventListener(
        "learnquest:stats-updated",
        loadStats
      );
    };
  }, []);

  const level = Math.floor(stats.xp / 100) + 1;
  const levelXP = stats.xp % 100;
  const levelName = getLevelName(level);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setMessage("");
    setError("");
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("Please choose an image smaller than 1 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("photoURL", reader.result);
      }
    };

    reader.onerror = () => {
      setError("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function saveProfile(event) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const previous = readJSON(PROFILE_KEY, {});

      const updated = {
        ...previous,
        name,
        email,
        photoURL: form.photoURL,
      };

      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(updated)
      );

      setForm({
        name,
        email,
        photoURL: updated.photoURL,
      });

      window.dispatchEvent(
        new Event("learnquest:stats-updated")
      );

      setError("");
      setMessage("Your profile has been saved successfully!");
    } catch {
      setError(
        "Unable to save your profile. Try using a smaller photo."
      );
    }
  }

  return (
    <div className="lq-profile-page">
      <section className="lq-profile-heading">
        <div>
          <span className="lq-profile-eyebrow">
            YOUR LEARNING IDENTITY
          </span>
          <h1>My Profile ✨</h1>
          <p>
            Personalize your learning space and celebrate
            your achievements.
          </p>
        </div>
        <div className="lq-profile-heading-icon">
          <GraduationCap size={30} />
        </div>
      </section>

      <section className="lq-profile-hero">
        <div className="lq-profile-identity">
          <div className="lq-profile-avatar">
            {form.photoURL ? (
              <img src={form.photoURL} alt="Profile avatar" />
            ) : (
              <UserRound size={43} />
            )}
          </div>

          <div className="lq-profile-identity-text">
            <h2>{form.name.trim() || "Student"}</h2>
            <p>Level {level} · {levelName}</p>
            <span className="lq-profile-adventurer">
              <Trophy size={14} />
              Learning Adventurer
            </span>
          </div>
        </div>

        <div className="lq-profile-level">
          <div className="lq-profile-level-label">
            <span>Progress to Level {level + 1}</span>
            <strong>{levelXP} / 100 XP</strong>
          </div>
          <div className="lq-profile-level-track">
            <div style={{ width: `${levelXP}%` }} />
          </div>
          <small>
            {100 - levelXP} more XP to your next level
          </small>
        </div>
      </section>

      <section className="lq-profile-stats">
        <div className="lq-profile-stat">
          <div className="lq-profile-stat-icon purple">
            <Zap size={22} />
          </div>
          <strong>{stats.xp}</strong>
          <span>Total XP</span>
        </div>

        <div className="lq-profile-stat">
          <div className="lq-profile-stat-icon orange">
            <Flame size={22} />
          </div>
          <strong>{stats.streak}</strong>
          <span>Study Streak</span>
        </div>

        <div className="lq-profile-stat">
          <div className="lq-profile-stat-icon blue">
            <Trophy size={22} />
          </div>
          <strong>{stats.quizzes}</strong>
          <span>Quizzes Completed</span>
        </div>

        <div className="lq-profile-stat">
          <div className="lq-profile-stat-icon green">
            <Target size={22} />
          </div>
          <strong>
            {stats.average === null
              ? "—"
              : `${stats.average}%`}
          </strong>
          <span>Average Score</span>
        </div>
      </section>

      <section className="lq-profile-editor">
        <div className="lq-profile-editor-heading">
          <h2>
            <UserRound size={21} />
            Personal Information
          </h2>
          <p>Update how your profile appears in LearnQuest.</p>
        </div>

        <form onSubmit={saveProfile}>
          <div className="lq-profile-photo-editor">
            <div className="lq-profile-photo-preview">
              {form.photoURL ? (
                <img src={form.photoURL} alt="Selected avatar" />
              ) : (
                <UserRound size={30} />
              )}
            </div>

            <div>
              <h3>Profile Photo</h3>
              <p>JPG, PNG, or WebP · Maximum 1 MB</p>

              <div className="lq-profile-photo-actions">
                <button
                  type="button"
                  className="lq-profile-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} />
                  Upload Photo
                </button>

                {form.photoURL && (
                  <button
                    type="button"
                    className="lq-profile-remove"
                    onClick={() => updateField("photoURL", "")}
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              hidden
            />
          </div>

          <div className="lq-profile-fields">
            <label>
              Full Name
              <div className="lq-profile-input-wrap">
                <UserRound size={18} />
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="Enter your full name"
                  maxLength={80}
                  required
                />
              </div>
            </label>

            <label>
              Email Address
              <div className="lq-profile-input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                  placeholder="Enter your email address"
                  maxLength={150}
                />
              </div>
            </label>
          </div>

          <p className="lq-profile-note">
            This information is stored in your browser.
            It does not change your Google account.
          </p>

          {error && (
            <p className="lq-profile-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="lq-profile-success" role="status">
              <CheckCircle2 size={17} />
              {message}
            </p>
          )}

          <div className="lq-profile-save-row">
            <button type="submit" className="lq-profile-save">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
