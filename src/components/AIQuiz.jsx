
import { useEffect, useState } from "react";
import {
  Sparkles,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Zap,
} from "lucide-react";
import { API_URL } from "../utils/api";
import "./AIQuiz.css";

const RESULTS_KEY = "learnquest-quiz-results";
const SETTINGS_KEY = "learnquest-settings";
const QUIZ_DRAFT_PREFIX = "learnquest-quiz-draft-";
const MAX_SAVED_QUIZ_RESULTS = 50;
const POINTS_PER_QUESTION = 10;

const DEFAULT_SETTINGS = {
  quizQuestionCount: 5,
  quizDifficulty: "medium",
  encouragement: true,
};

function readQuizSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    const count = Number(saved?.quizQuestionCount);
    const difficulty = saved?.quizDifficulty;

    return {
      quizQuestionCount: [5, 10, 15].includes(count)
        ? count
        : DEFAULT_SETTINGS.quizQuestionCount,
      quizDifficulty: ["easy", "medium", "hard"].includes(
        difficulty
      )
        ? difficulty
        : DEFAULT_SETTINGS.quizDifficulty,
      encouragement:
        typeof saved?.encouragement === "boolean"
          ? saved.encouragement
          : DEFAULT_SETTINGS.encouragement,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function normalizeQuestion(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readRecentQuestions(lessonId) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(RESULTS_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved
      .filter((result) => result.lessonId === (lessonId || null))
      .flatMap((result) =>
        Array.isArray(result.questions) ? result.questions : []
      )
      .filter((question) => typeof question === "string" && question.trim())
      .slice(0, 20);
  } catch {
    return [];
  }
}

function hasDuplicateQuestions(questions, previousQuestions) {
  const seen = new Set(
    previousQuestions.map(normalizeQuestion).filter(Boolean)
  );

  for (const question of questions) {
    const normalized = normalizeQuestion(question.question);

    if (!normalized || seen.has(normalized)) {
      return true;
    }

    seen.add(normalized);
  }

  return false;
}

function getQuizDraftKey(lessonId) {
  return `${QUIZ_DRAFT_PREFIX}${lessonId || "unknown"}`;
}

function readSavedQuiz(lessonId) {
  try {
    const saved = localStorage.getItem(getQuizDraftKey(lessonId));
    if (!saved) return { draft: null, error: "" };

    const draft = JSON.parse(saved);
    if (!Array.isArray(draft.questions) || draft.questions.length === 0) {
      throw new Error("Invalid saved quiz");
    }

    return { draft, error: "" };
  } catch {
    return {
      draft: null,
      error: "Your saved quiz could not be opened. You can start a new quiz.",
    };
  }
}

export default function AIQuiz({
  lessonText,
  lessonId,
  subjectId,
}) {
  const [initialSavedQuiz] = useState(() => readSavedQuiz(lessonId));
  const [questionCount, setQuestionCount] = useState(
    () => readQuizSettings().quizQuestionCount
  );

  const [difficulty, setDifficulty] = useState(
    () => readQuizSettings().quizDifficulty
  );

  const [encouragement, setEncouragement] = useState(
    () => readQuizSettings().encouragement
  );

  const [questions, setQuestions] = useState([]);
  const [quizDifficulty, setQuizDifficulty] = useState(
    "medium"
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [answers, setAnswers] = useState([]);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialSavedQuiz.error);
  const [saveError, setSaveError] = useState("");
  const [savedDraft, setSavedDraft] = useState(initialSavedQuiz.draft);

  // Keep quiz defaults in sync with Settings.
  // Do not interrupt a quiz already in progress.
  useEffect(() => {
    function syncSettings() {
      const saved = readQuizSettings();

      setEncouragement(saved.encouragement);

      if (questions.length === 0 && !loading) {
        setQuestionCount(saved.quizQuestionCount);
        setDifficulty(saved.quizDifficulty);
      }
    }

    window.addEventListener(
      "learnquest:settings-updated",
      syncSettings
    );
    window.addEventListener("storage", syncSettings);

    return () => {
      window.removeEventListener(
        "learnquest:settings-updated",
        syncSettings
      );
      window.removeEventListener("storage", syncSettings);
    };
  }, [questions.length, loading]);

  // Preserve an unfinished quiz so an accidental refresh does not erase progress.
  useEffect(() => {
    const key = getQuizDraftKey(lessonId);

    if (questions.length > 0 && !finished) {
      localStorage.setItem(
        key,
        JSON.stringify({
          questions,
          quizDifficulty,
          currentIndex,
          selectedAnswer,
          checked,
          answers,
          xp,
        })
      );
      return;
    }

    if (finished) {
      localStorage.removeItem(key);
    }
  }, [
    lessonId,
    questions,
    quizDifficulty,
    currentIndex,
    selectedAnswer,
    checked,
    answers,
    xp,
    finished,
  ]);

  function resumeQuiz() {
    if (!savedDraft) return;

    setQuestions(savedDraft.questions);
    setQuizDifficulty(savedDraft.quizDifficulty || "medium");
    setCurrentIndex(Math.min(
      Math.max(0, Number(savedDraft.currentIndex) || 0),
      savedDraft.questions.length - 1
    ));
    setSelectedAnswer(savedDraft.selectedAnswer ?? null);
    setChecked(Boolean(savedDraft.checked));
    setAnswers(Array.isArray(savedDraft.answers) ? savedDraft.answers : []);
    setXp(Number(savedDraft.xp) || 0);
    setSavedDraft(null);
  }

  function discardSavedQuiz() {
    try {
      localStorage.removeItem(getQuizDraftKey(lessonId));
      setSavedDraft(null);
    } catch {
      setError("Could not discard your saved quiz in this browser.");
    }
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const isCorrect =
    selectedAnswer === currentQuestion?.correctAnswer;

  const correctAnswers = answers.filter(
    (answer) => answer.isCorrect
  ).length;

  const percentage = totalQuestions
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0;

  async function generateQuiz() {
    if (!lessonText?.trim() || loading || savedDraft) return;

    setLoading(true);
    localStorage.removeItem(getQuizDraftKey(lessonId));
    setError("");
    setSaveError("");
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setChecked(false);
    setShowHint(false);
    setAnswers([]);
    setXp(0);
    setFinished(false);
    setReviewMode(false);

    try {
      let previousQuestions = readRecentQuestions(lessonId);
      let result = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(
          `${API_URL}/api/ai/quiz`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lessonText,
              questionCount,
              difficulty,
              previousQuestions,
            }),
          }
        );

        result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to generate quiz."
          );
        }

        if (
          !Array.isArray(result.questions) ||
          result.questions.length !== questionCount
        ) {
          throw new Error(
            "The quiz was incomplete. Please try again."
          );
        }

        if (!hasDuplicateQuestions(result.questions, previousQuestions)) {
          break;
        }

        previousQuestions = [
          ...previousQuestions,
          ...result.questions.map((question) => question.question),
        ].slice(-20);

        if (attempt === 1) {
          throw new Error(
            "The generated quiz repeated a recent question. Please try again."
          );
        }
      }

      setQuizDifficulty(difficulty);
      setQuestions(result.questions);
    } catch (err) {
      setError(
        err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function checkAnswer() {
    if (
      checked ||
      selectedAnswer === null ||
      !currentQuestion
    ) {
      return;
    }

    const correct =
      selectedAnswer === currentQuestion.correctAnswer;

    setAnswers((previous) => [
      ...previous,
      {
        questionIndex: currentIndex,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: correct,
      },
    ]);

    if (correct) {
      setXp((previous) => previous + POINTS_PER_QUESTION);
    }

    setChecked(true);
  }

  function saveQuizResult(finalAnswers) {
    const score = finalAnswers.filter(
      (answer) => answer.isCorrect
    ).length;

    const finalPercentage = Math.round(
      (score / totalQuestions) * 100
    );

    const result = {
      id: crypto.randomUUID(),
      lessonId: lessonId || null,
      subjectId: subjectId || null,
      questionCount: totalQuestions,
      difficulty: quizDifficulty,
      score,
      percentage: finalPercentage,
      xpEarned: score * POINTS_PER_QUESTION,
      maxXp: totalQuestions * POINTS_PER_QUESTION,
      questions: questions.map((question) => question.question),
      answers: finalAnswers,
      completedAt: new Date().toISOString(),
    };

    try {
      const previous = JSON.parse(
        localStorage.getItem(RESULTS_KEY) || "[]"
      );

      const results = Array.isArray(previous)
        ? previous
        : [];

      localStorage.setItem(
        RESULTS_KEY,
        JSON.stringify(
          [result, ...results].map((savedResult, index) => {
            if (index < MAX_SAVED_QUIZ_RESULTS) return savedResult;
            const summary = { ...savedResult };
            delete summary.questions;
            delete summary.answers;
            return summary;
          })
        )
      );

      window.dispatchEvent(
        new Event("learnquest:stats-updated")
      );
    } catch (err) {
      console.error("Could not save quiz result:", err);
      setSaveError(
        "Quiz completed, but the result could not be saved."
      );
    }
  }

  function nextQuestion() {
    if (!checked || finished) return;

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((previous) => previous + 1);
      setSelectedAnswer(null);
      setChecked(false);
      setShowHint(false);
      return;
    }

    setFinished(true);
    const finalAnswer = {
      questionIndex: currentIndex,
      selectedAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: selectedAnswer === currentQuestion.correctAnswer,
    };
    const finalAnswers = answers.some(
      (answer) => answer.questionIndex === currentIndex
    )
      ? answers
      : [...answers, finalAnswer];

    setAnswers(finalAnswers);
    saveQuizResult(finalAnswers);
  }

  function resetQuiz() {
    const saved = readQuizSettings();

    localStorage.removeItem(getQuizDraftKey(lessonId));

    setQuestionCount(saved.quizQuestionCount);
    setDifficulty(saved.quizDifficulty);
    setEncouragement(saved.encouragement);

    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setChecked(false);
    setShowHint(false);
    setXp(0);
    setFinished(false);
    setReviewMode(false);
    setError("");
    setSaveError("");
  }

  return (
    <div className="ai-quiz">
      <div className="ai-quiz-header">
        <div>
          <h2>AI Practice Quiz</h2>
          <p>
            Learn one question at a time and earn XP!
          </p>
        </div>
        <Sparkles size={26} aria-hidden="true" />
      </div>

      <p className="ai-transparency-notice" role="note">
        Based on your uploaded lesson. AI responses may contain mistakes, so
        verify important information with your study material.
      </p>

      {/* QUIZ SETTINGS */}
      {savedDraft && totalQuestions === 0 && (
        <section className="ai-quiz-resume" aria-labelledby="quiz-resume-heading">
          <h3 id="quiz-resume-heading">Unfinished quiz saved</h3>
          <p>
            You were on question {Math.min(
              Math.max(0, Number(savedDraft.currentIndex) || 0),
              savedDraft.questions.length - 1
            ) + 1} of{" "}
            {savedDraft.questions.length}. Your answers are still here.
          </p>
          <div className="ai-quiz-resume-actions">
            <button type="button" className="ai-quiz-primary" onClick={resumeQuiz}>
              Continue quiz
            </button>
            <button type="button" className="ai-quiz-secondary" onClick={discardSavedQuiz}>
              Discard saved quiz
            </button>
          </div>
        </section>
      )}

      {totalQuestions === 0 && !loading && !savedDraft && (
        <div className="ai-quiz-start">
          <div className="ai-quiz-start-icon">
            <Sparkles size={30} aria-hidden="true" />
          </div>

          <h3>Customize Your Quiz</h3>
          <p>
            Choose your difficulty and earn 10 XP
            for every correct answer.
          </p>

          <div className="ai-quiz-settings">
            <label htmlFor="quiz-count">
              Number of Questions
            </label>

            <select
              id="quiz-count"
              value={questionCount}
              onChange={(event) =>
                setQuestionCount(
                  Number(event.target.value)
                )
              }
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
            </select>

            <label htmlFor="quiz-difficulty">
              Difficulty Level
            </label>

            <select
              id="quiz-difficulty"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value)
              }
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <button
            type="button"
            className="ai-quiz-primary"
            disabled={!lessonText?.trim()}
            onClick={generateQuiz}
          >
            <Sparkles size={18} />
            Start Quiz
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="ai-quiz-loading" role="status">
          <LoaderCircle
            className="ai-quiz-spin"
            size={32}
          />
          <h3>Preparing your quiz...</h3>
          <p>Generating questions from your lesson.</p>
        </div>
      )}

      {error && (
        <p className="ai-quiz-error" role="alert">
          {error}
        </p>
      )}

      {/* ONE QUESTION AT A TIME */}
      {totalQuestions > 0 &&
        !finished &&
        currentQuestion && (
          <div className="lq-game">
            <div className="lq-game-top">
              <span className="lq-game-counter">
                Question {currentIndex + 1} of{" "}
                {totalQuestions}
              </span>

              <span className="lq-game-xp">
                <Zap size={18} />
                {xp} XP
              </span>
            </div>

            <div
              className="ai-quiz-progress-track"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={1}
              aria-valuemax={totalQuestions}
              aria-valuenow={currentIndex + 1}
            >
              <div
                className="ai-quiz-progress-fill"
                style={{
                  width: `${
                    ((currentIndex + 1) /
                      totalQuestions) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="ai-quiz-question-card">
              <div className="ai-quiz-question-top">
                <span className="ai-quiz-number">
                  Question {currentIndex + 1}
                </span>

                <span className="ai-quiz-type">
                  {quizDifficulty.toUpperCase()}
                </span>
              </div>

              <h3>{currentQuestion.question}</h3>

              {!checked && (
                <div className="lq-quiz-hint">
                  <button
                    type="button"
                    className="ai-quiz-hint-button"
                    onClick={() => setShowHint((previous) => !previous)}
                    aria-expanded={showHint}
                  >
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </button>

                  {showHint && (
                    <p className="ai-quiz-hint-text" role="note">
                      <strong>Hint:</strong>{" "}
                      {currentQuestion.hint}
                    </p>
                  )}
                </div>
              )}

              <div className="ai-quiz-options">
                {currentQuestion.options.map(
                  (option, optionIndex) => {
                    const selected =
                      selectedAnswer === optionIndex;

                    const correct =
                      currentQuestion.correctAnswer ===
                      optionIndex;

                    let optionClass = "ai-quiz-option";

                    if (checked && correct) {
                      optionClass += " correct";
                    } else if (
                      checked &&
                      selected &&
                      !correct
                    ) {
                      optionClass += " incorrect";
                    } else if (selected) {
                      optionClass += " selected";
                    }

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        className={optionClass}
                        disabled={checked}
                        aria-pressed={selected}
                        aria-label={`${option}${
                          checked && correct
                            ? ", correct answer"
                            : checked && selected && !correct
                            ? ", your incorrect answer"
                            : selected
                            ? ", selected"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedAnswer(optionIndex)
                        }
                      >
                        <span className="ai-quiz-letter">
                          {String.fromCharCode(
                            65 + optionIndex
                          )}
                        </span>

                        <span>{option}</span>

                        {checked && correct && (
                          <>
                            <span className="ai-quiz-answer-label">
                              Correct answer
                            </span>
                            <CheckCircle2 size={20} aria-hidden="true" />
                          </>
                        )}

                        {checked &&
                          selected &&
                          !correct && (
                            <>
                              <span className="ai-quiz-answer-label">
                                Your answer
                              </span>
                              <XCircle size={20} aria-hidden="true" />
                            </>
                          )}
                      </button>
                    );
                  }
                )}
              </div>

              {/* ANSWER FEEDBACK */}
              {checked && (
                <div
                  className="lq-answer-feedback"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className={
                      isCorrect
                        ? "lq-feedback-title lq-feedback-correct"
                        : "lq-feedback-title lq-feedback-wrong"
                    }
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 size={22} />
                        Correct! +10 XP
                      </>
                    ) : (
                      <>
                        <XCircle size={22} />
                        Not quite! +0 XP
                      </>
                    )}
                  </div>

                  <div className="ai-quiz-explanation">
                    <strong>Explanation</strong>
                    <p>
                      {currentQuestion.explanation}
                    </p>
                  </div>

                  {encouragement && (
                    <p
                      style={{
                        marginTop: "12px",
                        fontSize: "13px",
                        color: "#8063cc",
                        fontWeight: 600,
                      }}
                    >
                      {isCorrect
                        ? "Amazing! Keep up the great work! ✨"
                        : "Every question helps you learn. Keep going! 💜"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="lq-game-actions">
              {!checked ? (
                <button
                  type="button"
                  className="ai-quiz-primary"
                  disabled={selectedAnswer === null}
                  onClick={checkAnswer}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  type="button"
                  className="ai-quiz-primary"
                  onClick={nextQuestion}
                >
                  {currentIndex === totalQuestions - 1
                    ? "View Results"
                    : "Next Question"}
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

      {/* FINAL RESULT */}
      {finished && (
        <div className="ai-quiz-result lq-final-result">
          <Trophy size={45} />

          <h2>Quiz Completed!</h2>

          <div className="lq-final-xp">
            <Zap size={28} />
            {xp} XP
          </div>

          <p>
            You earned {xp} out of{" "}
            {totalQuestions * POINTS_PER_QUESTION} XP!
          </p>

          <div className="ai-quiz-score">
            {correctAnswers} / {totalQuestions}
          </div>

          <p>Your Score: {percentage}%</p>

          {encouragement && (
            <p>
              {percentage === 100
                ? "Perfect score! Amazing work!"
                : percentage >= 60
                ? "Great effort! Keep learning!"
                : "Keep practicing. You can do it!"}
            </p>
          )}

          <button
            type="button"
            className="ai-quiz-secondary"
            onClick={resetQuiz}
          >
            <RotateCcw size={18} />
            Try Another Quiz
          </button>

          <button
            type="button"
            className="ai-quiz-secondary lq-review-toggle"
            onClick={() => setReviewMode((previous) => !previous)}
            aria-expanded={reviewMode}
          >
            {reviewMode ? "Hide Review" : "Review Answers"}
          </button>
        </div>
      )}

      {finished && reviewMode && (
        <section className="lq-quiz-review" aria-label="Quiz answer review">
          <h3>Answer Review</h3>
          <p>Review your answers and explanations from this quiz.</p>

          {questions.map((question, index) => {
            const answer = answers.find(
              (item) => item.questionIndex === index
            );
            const selected = answer?.selectedAnswer;
            const correct = answer?.correctAnswer ?? question.correctAnswer;
            const wasCorrect = answer?.isCorrect;

            return (
              <article
                className={`lq-review-card ${wasCorrect ? "is-correct" : "is-incorrect"}`}
                key={`${question.question}-${index}`}
              >
                <div className="lq-review-card-header">
                  <span>Question {index + 1}</span>
                  <strong>{wasCorrect ? "Correct" : "Incorrect"}</strong>
                </div>

                <h4>{question.question}</h4>

                <p>
                  <strong>Your answer:</strong>{" "}
                  {selected === undefined
                    ? "Not answered"
                    : question.options[selected]}
                </p>

                <p>
                  <strong>Correct answer:</strong>{" "}
                  {question.options[correct]}
                </p>

                <div className="ai-quiz-explanation">
                  <strong>Explanation</strong>
                  <p>{question.explanation}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {saveError && (
        <p className="ai-quiz-error" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
