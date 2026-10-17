
import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Zap,
  Flame,
  Target,
  ClipboardCheck,
  Medal,
  LockKeyhole,
  TrendingUp,
  Star,
  CalendarDays,
} from "lucide-react";
import "./MyProgress.css";

const RESULTS_KEY = "learnquest-quiz-results";
const ACTIVITY_KEY = "learnquest-study-activity";
const LESSONS_KEY = "learnquest-lessons";

function readArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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

  const current = new Date();
  current.setHours(12, 0, 0, 0);

  if (!days.has(localDay(current))) {
    current.setDate(current.getDate() - 1);

    if (!days.has(localDay(current))) return 0;
  }

  let streak = 0;

  while (days.has(localDay(current))) {
    streak++;
    current.setDate(current.getDate() - 1);
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

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyProgress() {
  const [data, setData] = useState({
    results: [],
    activities: [],
    lessons: [],
  });

  useEffect(() => {
    function refresh() {
      setData({
        results: readArray(RESULTS_KEY),
        activities: readArray(ACTIVITY_KEY),
        lessons: readArray(LESSONS_KEY),
      });
    }

    refresh();

    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(
      "learnquest:stats-updated",
      refresh
    );

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(
        "learnquest:stats-updated",
        refresh
      );
    };
  }, []);

  const { results, activities, lessons } = data;

  const totalXP = useMemo(
    () => results.reduce((sum, result) => sum + getXP(result), 0),
    [results]
  );

  const averageScore = results.length
    ? Math.round(
        results.reduce(
          (sum, result) =>
            sum + (Number(result.percentage) || 0),
          0
        ) / results.length
      )
    : null;

  const streak = calculateStreak([
    ...activities,
    ...results.map((result) => result.completedAt),
  ]);

  const level = Math.floor(totalXP / 100) + 1;
  const levelXP = totalXP % 100;
  const levelName = getLevelName(level);

  const weeklyXP = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const day = localDay(date);

      return {
        key: day,
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        xp: results.reduce(
          (sum, result) =>
            localDay(result.completedAt) === day
              ? sum + getXP(result)
              : sum,
          0
        ),
      };
    });
  }, [results]);

  const maxXP = Math.max(10, ...weeklyXP.map((day) => day.xp));

  const history = useMemo(
    () =>
      [...results].sort(
        (a, b) =>
          new Date(b.completedAt || 0) -
          new Date(a.completedAt || 0)
      ),
    [results]
  );

  const achievements = [
    {
      title: "First Steps",
      description: "Complete your first quiz",
      icon: Medal,
      unlocked: results.length >= 1,
    },
    {
      title: "Quiz Explorer",
      description: "Complete 5 quizzes",
      icon: ClipboardCheck,
      unlocked: results.length >= 5,
    },
    {
      title: "XP Collector",
      description: "Earn 100 XP",
      icon: Zap,
      unlocked: totalXP >= 100,
    },
    {
      title: "High Achiever",
      description: "Score 100% on a quiz",
      icon: Star,
      unlocked: results.some(
        (result) => Number(result.percentage) === 100
      ),
    },
    {
      title: "On Fire",
      description: "Reach a 3-day study streak",
      icon: Flame,
      unlocked: streak >= 3,
    },
    {
      title: "Quiz Master",
      description: "Complete 15 quizzes",
      icon: Trophy,
      unlocked: results.length >= 15,
    },
  ];

  const unlockedCount = achievements.filter(
    (item) => item.unlocked
  ).length;

  return (
    <div className="lq-progress-page">
      <section className="lq-progress-hero">
        <div>
          <span className="lq-progress-eyebrow">
            YOUR LEARNING JOURNEY
          </span>
          <h1>My Progress ✨</h1>
          <p>
            Track your achievements, improve your scores,
            and keep growing every day.
          </p>
        </div>

        <div className="lq-progress-hero-icon">
          <Trophy size={36} />
        </div>
      </section>

      <section className="lq-progress-stats">
        <div className="lq-progress-stat">
          <div className="lq-progress-stat-icon purple">
            <Zap size={23} />
          </div>
          <span>Total XP</span>
          <strong>{totalXP}</strong>
          <small>Level {level} · {levelName}</small>
        </div>

        <div className="lq-progress-stat">
          <div className="lq-progress-stat-icon orange">
            <Flame size={23} />
          </div>
          <span>Study Streak</span>
          <strong>{streak} Days</strong>
          <small>Consecutive active study days</small>
        </div>

        <div className="lq-progress-stat">
          <div className="lq-progress-stat-icon blue">
            <ClipboardCheck size={23} />
          </div>
          <span>Quizzes Completed</span>
          <strong>{results.length}</strong>
          <small>Your completed practice quizzes</small>
        </div>

        <div className="lq-progress-stat">
          <div className="lq-progress-stat-icon green">
            <Target size={23} />
          </div>
          <span>Average Score</span>
          <strong>
            {averageScore === null ? "—" : `${averageScore}%`}
          </strong>
          <small>Across all completed quizzes</small>
        </div>
      </section>

      <section className="lq-progress-grid">
        <div className="lq-progress-card">
          <div className="lq-progress-card-heading">
            <div>
              <h2>
                <TrendingUp size={20} />
                Weekly Learning Activity
              </h2>
              <p>XP earned over the last seven days</p>
            </div>
            <span className="lq-progress-tag">Last 7 Days</span>
          </div>

          <div className="lq-progress-chart">
            {weeklyXP.map((day) => (
              <div
                key={day.key}
                className="lq-progress-chart-column"
              >
                <span>{day.xp || ""}</span>
                <div className="lq-progress-chart-track">
                  <div
                    className="lq-progress-chart-bar"
                    style={{
                      height:
                        day.xp === 0
                          ? "4px"
                          : `${Math.max(
                              10,
                              (day.xp / maxXP) * 100
                            )}%`,
                    }}
                    title={`${day.xp} XP`}
                  />
                </div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>

          <div className="lq-progress-chart-footer">
            <Zap size={17} />
            {weeklyXP.reduce(
              (sum, day) => sum + day.xp,
              0
            )} XP earned in the last 7 days
          </div>
        </div>

        <div className="lq-progress-card lq-progress-level">
          <div className="lq-progress-card-heading">
            <div>
              <h2>
                <Star size={20} />
                Your Level
              </h2>
              <p>Keep earning XP to level up</p>
            </div>
          </div>

          <div className="lq-progress-level-emblem">
            <Star size={35} fill="currentColor" />
          </div>

          <h3>Level {level}</h3>
          <p className="lq-progress-level-name">{levelName}</p>

          <div className="lq-progress-level-numbers">
            <span>Level Progress</span>
            <strong>{levelXP} / 100 XP</strong>
          </div>

          <div className="lq-progress-level-track">
            <div style={{ width: `${levelXP}%` }} />
          </div>

          <p className="lq-progress-level-next">
            {100 - levelXP} more XP to reach Level {level + 1}
          </p>
        </div>
      </section>

      <section className="lq-progress-card lq-progress-achievements">
        <div className="lq-progress-card-heading">
          <div>
            <h2>
              <Medal size={20} />
              Achievements
            </h2>
            <p>Unlock badges as you learn and improve</p>
          </div>
          <span className="lq-progress-tag">
            {unlockedCount} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="lq-progress-achievement-grid">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;

            return (
              <div
                key={achievement.title}
                className={
                  achievement.unlocked
                    ? "lq-progress-achievement unlocked"
                    : "lq-progress-achievement locked"
                }
              >
                <div className="lq-progress-achievement-icon">
                  {achievement.unlocked ? (
                    <Icon size={27} />
                  ) : (
                    <LockKeyhole size={25} />
                  )}
                </div>

                <strong>{achievement.title}</strong>
                <p>{achievement.description}</p>

                <span>
                  {achievement.unlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lq-progress-card">
        <div className="lq-progress-card-heading">
          <div>
            <h2>
              <CalendarDays size={20} />
              Quiz History
            </h2>
            <p>Review your previous quiz performance</p>
          </div>
          <span className="lq-progress-tag">
            {history.length} Results
          </span>
        </div>

        {history.length === 0 ? (
          <div className="lq-progress-empty">
            <ClipboardCheck size={38} />
            <h3>No quiz history yet</h3>
            <p>
              Complete your first quiz to see your
              learning progress here.
            </p>
          </div>
        ) : (
          <div className="lq-progress-history">
            {history.map((quiz, index) => {
              const lesson = lessons.find(
                (item) =>
                  String(item.id) === String(quiz.lessonId)
              );

              const lessonTitle =
                lesson?.title ||
                lesson?.name ||
                lesson?.fileName ||
                `Practice Quiz ${index + 1}`;

              const percentage =
                Number(quiz.percentage) || 0;

              return (
                <div
                  className="lq-progress-history-row"
                  key={quiz.id || index}
                >
                  <div className="lq-progress-history-icon">
                    <ClipboardCheck size={21} />
                  </div>

                  <div className="lq-progress-history-info">
                    <strong>{lessonTitle}</strong>
                    <span>
                      {formatDate(quiz.completedAt)}
                      {" · "}
                      {quiz.difficulty || "medium"}
                      {" · "}
                      {quiz.questionCount || quiz.total || "—"} questions
                    </span>
                  </div>

                  <div className="lq-progress-history-score">
                    <strong>{percentage}%</strong>
                    <span>+{getXP(quiz)} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
