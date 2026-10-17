import { useEffect, useState } from "react";
import { Timer, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import "./FocusTimer.css";

const TIMER_KEY = "learnquest-focus-timer";
const SESSIONS_KEY = "learnquest-focus-sessions";
const DURATIONS = [25, 45, 60];

function readTimer() {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
    if (saved && DURATIONS.includes(saved.duration) &&
        ["idle", "running", "paused"].includes(saved.status) &&
        Number.isFinite(saved.remaining) && saved.remaining >= 0 &&
        (saved.status !== "running" || Number.isFinite(saved.endsAt))) {
      return saved;
    }
  } catch { /* use default */ }
  return { duration: 25, remaining: 1500, status: "idle", endsAt: null };
}

function secondsLeft(timer) {
  return timer.status === "running"
    ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
    : timer.remaining;
}

export default function FocusTimer() {
  const [timer, setTimer] = useState(readTimer);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  }, [timer]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timer.status !== "running" || timer.endsAt > now) return;
    const completedAt = new Date(timer.endsAt).toISOString();
    const session = {
      id: crypto.randomUUID(),
      durationMinutes: timer.duration,
      completedAt,
    };
    try {
      const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
      const sessions = Array.isArray(saved) ? saved : [];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify([...sessions, session]));
      window.dispatchEvent(new Event("learnquest:stats-updated"));
    } catch {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify([session]));
    }
    setTimer({ duration: timer.duration, remaining: timer.duration * 60, status: "idle", endsAt: null });
    setNotice("Great job! You completed your focus session.");
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("LearnQuest Focus Mode", { body: "Your focus session is complete!" });
    }
  }, [timer, now]);

  useEffect(() => {
    const sync = (event) => {
      if (event.key === TIMER_KEY) setTimer(readTimer());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const remaining = secondsLeft(timer);
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const progress = Math.max(0, Math.min(100, (1 - remaining / (timer.duration * 60)) * 100));

  function chooseDuration(duration) {
    setNotice("");
    setTimer({ duration, remaining: duration * 60, status: "idle", endsAt: null });
  }

  function startPause() {
    setNotice("");
    if (timer.status === "running") {
      setTimer({ ...timer, status: "paused", remaining: secondsLeft(timer), endsAt: null });
    } else {
      setTimer({ ...timer, status: "running", endsAt: Date.now() + timer.remaining * 1000 });
    }
  }

  function reset() {
    setNotice("");
    setTimer({ duration: timer.duration, remaining: timer.duration * 60, status: "idle", endsAt: null });
  }

  return (
    <section className="lq-focus-card" aria-label="Focus Mode">
      <div className="lq-focus-heading">
        <div className="lq-focus-title"><Timer size={22} /><div><h2>Focus Mode</h2><p>Stay focused. Make every minute count.</p></div></div>
        <span className="lq-focus-tag">Pomodoro</span>
      </div>
      <div className="lq-focus-options" aria-label="Focus duration">
        {DURATIONS.map((duration) => (
          <button key={duration} type="button" disabled={timer.status !== "idle"}
            className={timer.duration === duration ? "selected" : ""}
            onClick={() => chooseDuration(duration)}>{duration} min</button>
        ))}
      </div>
      <div className="lq-focus-clock" role="timer" aria-label="Time remaining">
        {minutes}:{seconds}
      </div>
      <div className="lq-focus-track"><div style={{ width: `${progress}%` }} /></div>
      <p className="lq-focus-status">{timer.status === "running" ? "Focus session in progress" : timer.status === "paused" ? "Session paused" : "Ready for your next study session?"}</p>
      <div className="lq-focus-actions">
        <button type="button" className="lq-focus-primary" onClick={startPause}>
          {timer.status === "running" ? <Pause size={18} /> : <Play size={18} />}
          {timer.status === "running" ? "Pause" : timer.status === "paused" ? "Resume" : "Start Focus"}
        </button>
        <button type="button" className="lq-focus-secondary" onClick={reset}><RotateCcw size={18} />Reset</button>
      </div>
      {notice && <p className="lq-focus-success" role="status"><CheckCircle2 size={17} />{notice}</p>}
    </section>
  );
}
