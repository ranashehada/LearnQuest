
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  setLessonStorageUser,
  deleteLessonFile,
} from "../utils/lessonStorage";
import { API_URL } from "../utils/api";


function getUserKey(userId, type) {
  return `learnquest-user-${userId}-${type}`;
}

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

export default function SubjectDetails() {
  const { id } = useParams();

  const [userId, setUserId] = useState(null);
  const [subject, setSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [expandedQuizId, setExpandedQuizId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSubject() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Please log in to view this subject."
          );
        }

        const data = await response.json();

        if (!data.user?.id) {
          throw new Error(
            "Unable to identify your account."
          );
        }

        if (!active) return;

        const currentUserId = data.user.id;

        const subjects = readArray(
          getUserKey(currentUserId, "subjects")
        );

        const foundSubject = subjects.find(
          (item) => String(item.id) === String(id)
        );

        // Lessons will be stored separately for each account.
        const userLessons = readArray(
          getUserKey(currentUserId, "lessons")
        );

        setUserId(currentUserId);
        setSubject(foundSubject || null);
        setLessons(userLessons);

        const savedQuizzes = readArray("learnquest-quiz-results");
        setQuizHistory(
          savedQuizzes.filter(
            (quiz) => String(quiz.subjectId) === String(id)
          )
        );
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load subject."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSubject();

    return () => {
      active = false;
    };
  }, [id]);

  const subjectLessons = lessons.filter(
    (lesson) =>
      String(lesson.subjectId ?? lesson.subject_id) ===
      String(id)
  );

  async function handleDelete(lesson) {
    if (!userId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${lesson.title}"?`
    );

    if (!confirmed) return;

    setDeletingId(lesson.id);

    try {
      const updated = lessons.filter(
        (item) => item.id !== lesson.id
      );

      // Update this account's lesson list.
      localStorage.setItem(
        getUserKey(userId, "lessons"),
        JSON.stringify(updated)
      );

      setLessons(updated);

      // Remove the uploaded file from IndexedDB for this account.
      setLessonStorageUser(userId);
      await deleteLessonFile(lesson.id).catch(() => {});

      window.dispatchEvent(
        new Event("learnquest:stats-updated")
      );
    } catch {
      window.alert(
        "Could not delete the lesson. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="subject-details-page">
        <p>Loading subject...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subject-details-page">
        <h1>Unable to load subject</h1>
        <p role="alert">{error}</p>
        <Link to="/subjects">Back to My Subjects</Link>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="subject-details-page">
        <h1>Subject Not Found</h1>
        <p>
          This subject does not exist in your account.
        </p>
        <Link to="/subjects">Back to My Subjects</Link>
      </div>
    );
  }

  return (
    <div className="subject-details-page">
      <Link
        to="/subjects"
        className="back-link"
      >
        <ArrowLeft size={18} />
        Back to My Subjects
      </Link>

      <header className="subject-details-header">
        <div>
          <div className="subject-details-icon">
            <BookOpen size={28} />
          </div>

          <h1>{subject.name}</h1>

          <p>
            {subject.description ||
              "Organize your lessons and study materials."}
          </p>
        </div>

        <Link
          to={`/subjects/${id}/add-lesson`}
          className="btn-primary subject-add-lesson"
        >
          <Plus size={18} />
          Add Lesson
        </Link>
      </header>

      <section className="subject-lessons-section">
        <div className="subject-lessons-heading">
          <h2>Lessons</h2>

          <span>
            {subjectLessons.length}{" "}
            {subjectLessons.length === 1
              ? "lesson"
              : "lessons"}
          </span>
        </div>

        {subjectLessons.length === 0 ? (
          <div className="subject-lessons-empty">
            <FileText size={44} />

            <h3>No lessons yet</h3>

            <p>
              Add your first lesson to start your
              learning journey.
            </p>

            <Link
              to={`/subjects/${id}/add-lesson`}
              className="btn-primary"
            >
              <Plus size={18} />
              Add Your First Lesson
            </Link>
          </div>
        ) : (
          <div className="subject-lesson-list">
            {subjectLessons.map((lesson) => (
              <article
                className="subject-lesson-item"
                key={lesson.id}
              >
                <div className="subject-lesson-icon">
                  <FileText size={24} />
                </div>

                <div className="subject-lesson-text">
                  <h3>{lesson.title}</h3>
                  <p>{lesson.fileName}</p>
                </div>

                <Link
                  to={`/subjects/${id}/lessons/${lesson.id}`}
                  className="subject-lesson-open"
                >
                  Open Lesson
                  <ArrowRight size={17} />
                </Link>

                <button
                  type="button"
                  className="subject-lesson-delete"
                  aria-label={`Delete ${lesson.title}`}
                  disabled={deletingId === lesson.id}
                  onClick={() => handleDelete(lesson)}
                >
                  <Trash2 size={19} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {quizHistory.length > 0 && (
        <section className="subject-quiz-history">
          <div className="subject-lessons-heading">
            <h2>Quiz History for This Subject</h2>
            <span>{quizHistory.length} results</span>
          </div>

          {quizHistory.map((quiz, index) => {
            const quizId = quiz.id || index;
            const hasReview =
              Array.isArray(quiz.questions) &&
              Array.isArray(quiz.answers);

            return (
              <article className="subject-quiz-history-item" key={quizId}>
                <div>
                  <strong>{quiz.percentage || 0}% score</strong>
                  <p>
                    {quiz.questionCount || "—"} questions · {quiz.difficulty || "medium"}
                  </p>
                </div>

                {hasReview && (
                  <button
                    type="button"
                    className="subject-quiz-review-button"
                    onClick={() =>
                      setExpandedQuizId((current) =>
                        current === quizId ? null : quizId
                      )
                    }
                    aria-expanded={expandedQuizId === quizId}
                  >
                    {expandedQuizId === quizId ? "Hide review" : "Review answers"}
                  </button>
                )}

                {expandedQuizId === quizId && hasReview && (
                  <div className="subject-quiz-review">
                    {quiz.questions.map((question, questionIndex) => {
                      const answer = quiz.answers[questionIndex];
                      return (
                        <div key={`${quizId}-${questionIndex}`}>
                          <strong>{questionIndex + 1}. {question}</strong>
                          <span>
                            Your answer: {answer?.selectedAnswer == null ? "Not answered" : String.fromCharCode(65 + answer.selectedAnswer)}
                            {" · "}
                            Correct answer: {answer?.correctAnswer == null ? "—" : String.fromCharCode(65 + answer.correctAnswer)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
