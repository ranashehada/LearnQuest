
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
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import "./Profile.css";

const API_URL = "http://localhost:5000";

const PROFILE_KEY = "learnquest-profile";
const RESULTS_KEY = "learnquest-quiz-results";
const ACTIVITY_KEY = "learnquest-study-activity";
const TASKS_KEY = "learnquest-study-tasks";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getXP(result) {
  const earned = Number(result.xpEarned);

  if (Number.isFinite(earned) && earned >= 0) {
    return earned;
  }

  const score = Number(result.score);

  return Number.isFinite(score) && score >= 0
    ? score * 10
    : 0;
}

function localDay(value) {
  if (!value) return null;

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

  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);

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

  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });

  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          { credentials: "include" }
        );

        if (!response.ok) {
          if (active) {
            setError("Please log in to manage your account.");
          }
          return;
        }

        const data = await response.json();

        if (!active || !data.user) return;

        setAccount(data.user);

        const saved = readJSON(PROFILE_KEY, {});

        setForm({
          name: saved.name || data.user.name || "Student",
          email: data.user.email || "",
          photoURL: saved.photoURL || "",
        });
      } catch {
        if (active) {
          setError(
            "Could not connect to the server. Make sure the backend is running."
          );
        }
      } finally {
        if (active) setAccountLoading(false);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function loadStats() {
      const savedResults = readJSON(RESULTS_KEY, []);
      const savedActivity = readJSON(ACTIVITY_KEY, []);
      const savedTasks = readJSON(TASKS_KEY, []);

      const results = Array.isArray(savedResults)
        ? savedResults
        : [];

      const activities = Array.isArray(savedActivity)
        ? savedActivity
        : [];

      const tasks = Array.isArray(savedTasks)
        ? savedTasks
        : [];

      const quizXP = results.reduce(
        (sum, result) => sum + getXP(result),
        0
      );

      const taskXP = tasks.reduce(
        (sum, task) =>
          sum + (task.completed && task.xpAwarded ? 5 : 0),
        0
      );

      const xp = quizXP + taskXP;

      const average = results.length
        ? Math.round(
            results.reduce(
              (sum, result) =>
                sum + (Number(result.percentage) || 0),
              0
            ) / results.length
          )
        : null;

      const completedTaskDates = tasks
        .filter((task) => task.completed && task.completedAt)
        .map((task) => task.completedAt);

      const dates = [
        ...activities,
        ...results.map((result) => result.completedAt),
        ...completedTaskDates,
      ];

      setStats({
        xp,
        streak: calculateStreak(dates),
        quizzes: results.length,
        average,
      });
    }

    loadStats();

    window.addEventListener("focus", loadStats);
    window.addEventListener("storage", loadStats);
    window.addEventListener(
      "learnquest:stats-updated",
      loadStats
    );

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

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
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
    const email = account?.email || form.email.trim();

    if (!name) {
      setError("Please enter your name.");
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

      setForm(updated);

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

  async function handleChangeEmail(event) {
    event.preventDefault();

    setEmailError("");
    setEmailSuccess("");

    if (!account) {
      setEmailError("Please log in first.");
      return;
    }

    const newEmail = emailForm.newEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (newEmail === account.email.toLowerCase()) {
      setEmailError("This is already your current email.");
      return;
    }

    if (!emailForm.currentPassword) {
      setEmailError("Please enter your current password.");
      return;
    }

    setChangingEmail(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/change-email`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newEmail,
            currentPassword: emailForm.currentPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not change your email."
        );
      }

      if (!data.user) {
        throw new Error(
          "The server did not return the updated account."
        );
      }

      setAccount(data.user);

      setForm((previous) => ({
        ...previous,
        email: data.user.email,
      }));

      // Keep the local profile email in sync.
      // The account email itself was already updated by the server.
      const previous = readJSON(PROFILE_KEY, {});

      try {
        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({
            ...previous,
            email: data.user.email,
          })
        );
      } catch (storageError) {
        console.warn(
          "Could not update local profile cache:",
          storageError
        );
      }

      setEmailForm({
        newEmail: "",
        currentPassword: "",
      });

      setEmailSuccess(
        "Email changed successfully! Use your new email next time you log in."
      );

      window.dispatchEvent(
        new Event("learnquest:stats-updated")
      );
    } catch (err) {
      setEmailError(
        err.message || "Could not change your email."
      );
    } finally {
      setChangingEmail(false);
    }
  }

  function updatePasswordField(field, value) {
    setPasswords((previous) => ({
      ...previous,
      [field]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  }

  async function handleChangePassword(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!account) {
      setPasswordError("Please log in first.");
      return;
    }

    if (
      passwords.newPassword !== passwords.confirmPassword
    ) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (
      passwords.newPassword.length < 8 ||
      passwords.newPassword.length > 72
    ) {
      setPasswordError(
        "Password must contain 8 to 72 characters."
      );
      return;
    }

    if (
      passwords.currentPassword === passwords.newPassword
    ) {
      setPasswordError(
        "New password must be different from your current password."
      );
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: passwords.currentPassword,
            newPassword: passwords.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not change your password."
        );
      }

      setPasswordSuccess("Password changed successfully!");

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(
        err.message || "Could not change your password."
      );
    } finally {
      setChangingPassword(false);
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
              <img
                src={form.photoURL}
                alt="Profile avatar"
              />
            ) : (
              <UserRound size={43} />
            )}
          </div>

          <div className="lq-profile-identity-text">
            <h2>{form.name.trim() || "Student"}</h2>

            <p>
              Level {level} · {levelName}
            </p>

            <span className="lq-profile-adventurer">
              <Trophy size={14} />
              Learning Adventurer
            </span>
          </div>
        </div>

        <div className="lq-profile-level">
          <div className="lq-profile-level-label">
            <span>
              Progress to Level {level + 1}
            </span>

            <strong>{levelXP} / 100 XP</strong>
          </div>

          <div className="lq-profile-level-track">
            <div
              style={{ width: `${levelXP}%` }}
            />
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

          <p>
            Update how your profile appears in LearnQuest.
          </p>
        </div>

        <form onSubmit={saveProfile}>
          <div className="lq-profile-photo-editor">
            <div className="lq-profile-photo-preview">
              {form.photoURL ? (
                <img
                  src={form.photoURL}
                  alt="Selected avatar"
                />
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
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <Camera size={16} />
                  Upload Photo
                </button>

                {form.photoURL && (
                  <button
                    type="button"
                    className="lq-profile-remove"
                    onClick={() =>
                      updateField("photoURL", "")
                    }
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
                  value={account?.email || form.email}
                  placeholder="Your account email"
                  disabled
                />
              </div>
            </label>
          </div>

          <p className="lq-profile-note">
            Your name and photo are saved in this browser.
            To update your login email, use Change Email below.
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
            <button
              type="submit"
              className="lq-profile-save"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </section>

      <section className="lq-profile-editor lq-password-section">
        <div className="lq-profile-editor-heading">
          <h2>
            <Mail size={21} />
            Change Email
          </h2>

          <p>
            Update the email address you use to log in.
          </p>
        </div>

        <form onSubmit={handleChangeEmail}>
          <div className="lq-profile-fields">
            <label>
              Current Email

              <div className="lq-profile-input-wrap">
                <Mail size={18} />

                <input
                  type="email"
                  value={account?.email || ""}
                  placeholder={
                    accountLoading
                      ? "Loading account..."
                      : "Your current email"
                  }
                  disabled
                />
              </div>
            </label>

            <label>
              New Email Address

              <div className="lq-profile-input-wrap">
                <Mail size={18} />

                <input
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(event) => {
                    setEmailForm((previous) => ({
                      ...previous,
                      newEmail: event.target.value,
                    }));
                    setEmailError("");
                    setEmailSuccess("");
                  }}
                  placeholder="Enter your new email"
                  autoComplete="off"
                  maxLength={254}
                  required
                />
              </div>
            </label>

            <label>
              Current Password

              <div className="lq-profile-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type={
                    showEmailPassword
                      ? "text"
                      : "password"
                  }
                  value={emailForm.currentPassword}
                  onChange={(event) => {
                    setEmailForm((previous) => ({
                      ...previous,
                      currentPassword: event.target.value,
                    }));
                    setEmailError("");
                    setEmailSuccess("");
                  }}
                  placeholder="Confirm with your password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
          </div>

          <label className="lq-password-visibility">
            <input
              type="checkbox"
              checked={showEmailPassword}
              onChange={(event) =>
                setShowEmailPassword(event.target.checked)
              }
            />

            {showEmailPassword ? (
              <EyeOff size={17} />
            ) : (
              <Eye size={17} />
            )}

            Show password
          </label>

          {emailError && (
            <p className="lq-profile-error" role="alert">
              {emailError}
            </p>
          )}

          {emailSuccess && (
            <p className="lq-profile-success" role="status">
              <CheckCircle2 size={17} />
              {emailSuccess}
            </p>
          )}

          <div className="lq-profile-save-row">
            <button
              type="submit"
              className="lq-profile-save"
              disabled={
                changingEmail ||
                accountLoading ||
                !account
              }
            >
              <Mail size={18} />

              {changingEmail
                ? "Updating Email..."
                : "Update Email"}
            </button>
          </div>
        </form>
      </section>

      <section className="lq-profile-editor lq-password-section">
        <div className="lq-profile-editor-heading">
          <h2>
            <LockKeyhole size={21} />
            Change Password
          </h2>

          <p>
            Keep your LearnQuest account safe and secure.
          </p>
        </div>

        <form onSubmit={handleChangePassword}>
          <div className="lq-profile-fields">
            <label>
              Current Password

              <div className="lq-profile-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type={
                    showPasswords
                      ? "text"
                      : "password"
                  }
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    updatePasswordField(
                      "currentPassword",
                      event.target.value
                    )
                  }
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            <label>
              New Password

              <div className="lq-profile-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type={
                    showPasswords
                      ? "text"
                      : "password"
                  }
                  value={passwords.newPassword}
                  onChange={(event) =>
                    updatePasswordField(
                      "newPassword",
                      event.target.value
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>
            </label>

            <label>
              Confirm New Password

              <div className="lq-profile-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type={
                    showPasswords
                      ? "text"
                      : "password"
                  }
                  value={passwords.confirmPassword}
                  onChange={(event) =>
                    updatePasswordField(
                      "confirmPassword",
                      event.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>
            </label>
          </div>

          <label className="lq-password-visibility">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(event) =>
                setShowPasswords(event.target.checked)
              }
            />

            {showPasswords ? (
              <EyeOff size={17} />
            ) : (
              <Eye size={17} />
            )}

            Show passwords
          </label>

          {passwordError && (
            <p className="lq-profile-error" role="alert">
              {passwordError}
            </p>
          )}

          {passwordSuccess && (
            <p className="lq-profile-success" role="status">
              <CheckCircle2 size={17} />
              {passwordSuccess}
            </p>
          )}

          <div className="lq-profile-save-row">
            <button
              type="submit"
              className="lq-profile-save"
              disabled={
                changingPassword ||
                accountLoading ||
                !account
              }
            >
              <LockKeyhole size={18} />

              {changingPassword
                ? "Updating Password..."
                : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
