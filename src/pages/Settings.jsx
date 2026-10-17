
import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  BookOpen,
  Bell,
  Save,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import "./Settings.css";

const SETTINGS_KEY = "learnquest-settings";

const DEFAULT_SETTINGS = {
  theme: "light",
  quizQuestionCount: 5,
  quizDifficulty: "medium",
  encouragement: true,
};

function readSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    return {
      ...DEFAULT_SETTINGS,
      ...(saved && typeof saved === "object" ? saved : {}),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function Settings() {
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function refreshSettings() {
      setSettings(readSettings());
    }

    window.addEventListener("storage", refreshSettings);

    return () => {
      window.removeEventListener("storage", refreshSettings);
    };
  }, []);

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
    setError("");
  }

  function saveSettings(event) {
    event.preventDefault();

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );

      document.documentElement.setAttribute(
        "data-lq-theme",
        settings.theme
      );

      window.dispatchEvent(
        new Event("learnquest:settings-updated")
      );

      setSaved(true);
      setError("");
    } catch {
      setError("Unable to save your settings. Please try again.");
    }
  }

  return (
    <div className="lq-settings-page">
      <section className="lq-settings-hero">
        <div>
          <span className="lq-settings-eyebrow">
            PERSONALIZE YOUR EXPERIENCE
          </span>
          <h1>Settings ⚙️</h1>
          <p>
            Make LearnQuest feel just right for
            your learning journey.
          </p>
        </div>

        <div className="lq-settings-hero-icon">
          <SettingsIcon size={32} />
        </div>
      </section>

      <form onSubmit={saveSettings}>
        <section className="lq-settings-card">
          <div className="lq-settings-card-heading">
            <div className="lq-settings-section-icon">
              <Sun size={22} />
            </div>
            <div>
              <h2>Appearance</h2>
              <p>Choose how LearnQuest looks.</p>
            </div>
          </div>

          <div className="lq-settings-theme-grid">
            <button
              type="button"
              className={`lq-settings-theme-option ${
                settings.theme === "light" ? "selected" : ""
              }`}
              onClick={() => updateSetting("theme", "light")}
              aria-pressed={settings.theme === "light"}
            >
              <div className="lq-settings-theme-preview light">
                <span />
                <span />
                <span />
              </div>

              <span className="lq-settings-theme-name">
                <Sun size={18} />
                Light Mode
              </span>

              <small>Bright and clean</small>
            </button>

            <button
              type="button"
              className={`lq-settings-theme-option ${
                settings.theme === "dark" ? "selected" : ""
              }`}
              onClick={() => updateSetting("theme", "dark")}
              aria-pressed={settings.theme === "dark"}
            >
              <div className="lq-settings-theme-preview dark">
                <span />
                <span />
                <span />
              </div>

              <span className="lq-settings-theme-name">
                <Moon size={18} />
                Dark Mode
              </span>

              <small>Comfortable for night study</small>
            </button>
          </div>
        </section>

        <section className="lq-settings-card">
          <div className="lq-settings-card-heading">
            <div className="lq-settings-section-icon">
              <BookOpen size={22} />
            </div>
            <div>
              <h2>Study Preferences</h2>
              <p>Set your preferred quiz experience.</p>
            </div>
          </div>

          <div className="lq-settings-fields">
            <label>
              Default Quiz Questions
              <select
                value={settings.quizQuestionCount}
                onChange={(event) =>
                  updateSetting(
                    "quizQuestionCount",
                    Number(event.target.value)
                  )
                }
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
              </select>
            </label>

            <label>
              Default Quiz Difficulty
              <select
                value={settings.quizDifficulty}
                onChange={(event) =>
                  updateSetting(
                    "quizDifficulty",
                    event.target.value
                  )
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
        </section>

        <section className="lq-settings-card">
          <div className="lq-settings-card-heading">
            <div className="lq-settings-section-icon">
              <Bell size={22} />
            </div>
            <div>
              <h2>Notifications</h2>
              <p>Control motivational messages.</p>
            </div>
          </div>

          <label className="lq-settings-toggle-row">
            <div>
              <strong>Encouragement Messages</strong>
              <p>
                Show motivational messages during
                your learning journey.
              </p>
            </div>

            <input
              type="checkbox"
              checked={settings.encouragement}
              onChange={(event) =>
                updateSetting(
                  "encouragement",
                  event.target.checked
                )
              }
            />
          </label>

          <p className="lq-settings-note">
            These are in-app preferences, not email
            or push notifications.
          </p>
        </section>

        {saved && (
          <div className="lq-settings-success" role="status">
            <CheckCircle2 size={19} />
            Your settings have been saved!
          </div>
        )}

        {error && (
          <div className="lq-settings-error" role="alert">
            {error}
          </div>
        )}

        <div className="lq-settings-save-row">
          <span>
            <Sparkles size={17} />
            Your learning space, your way.
          </span>

          <button type="submit" className="lq-settings-save">
            <Save size={18} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
