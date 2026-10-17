
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import {
  getLessons,
  saveLessons,
  deleteLessonFile
} from "../utils/lessonStorage";

export default function SubjectDetails() {
  const { id } = useParams();

  const [lessons, setLessons] = useState(getLessons);

  const subjects = JSON.parse(
    localStorage.getItem("learnquest-subjects") || "[]"
  );

  const subject = subjects.find((item) => item.id === id);

  const subjectLessons = lessons.filter(
    (lesson) => lesson.subjectId === id
  );

  async function handleDelete(lesson) {
    if (
      !window.confirm(
        `Are you sure you want to delete "${lesson.title}"?`
      )
    ) {
      return;
    }

    try {
      await deleteLessonFile(lesson.id);
      const updated = lessons.filter((item) => item.id !== lesson.id);
      saveLessons(updated);
      setLessons(updated);
    } catch {
      window.alert("Could not delete the lesson. Please try again.");
    }
  }

  if (!subject) {
    return (
      <div className="subject-details-page">
        <h1>Subject Not Found</h1>
        <Link to="/subjects">Back to My Subjects</Link>
      </div>
    );
  }

  return (
    <div className="subject-details-page">
      <Link to="/subjects" className="back-link">
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
            {subjectLessons.length === 1 ? "lesson" : "lessons"}
          </span>
        </div>

        {subjectLessons.length === 0 ? (
          <div className="subject-lessons-empty">
            <FileText size={44} />
            <h3>No lessons yet</h3>
            <p>
              Add your first lesson to start your learning journey.
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
              <article className="subject-lesson-item" key={lesson.id}>
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
                  Open Lesson <ArrowRight size={17} />
                </Link>

                <button
                  type="button"
                  className="subject-lesson-delete"
                  aria-label={`Delete ${lesson.title}`}
                  onClick={() => handleDelete(lesson)}
                >
                  <Trash2 size={19} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
