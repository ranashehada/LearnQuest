
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import {
  initializeLessonStorageUser,
  getLessons,
  saveLessons,
  saveLessonFile,
  deleteLessonFile,
} from "../utils/lessonStorage";

const MAX_SIZE = 20 * 1024 * 1024;

function readSubjects(userId) {
  try {
    const key = `learnquest-user-${userId}-subjects`;
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function AddLesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountReady, setAccountReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSubject() {
      try {
        const user = await initializeLessonStorageUser();

        if (!active) return;

        const subjects = readSubjects(user.id);
        const found = subjects.find(
          (item) => String(item.id) === String(id)
        );

        setSubject(found || null);
        setAccountReady(true);
      } catch (err) {
        if (active) {
          setLoadError(err.message || "Could not load your account.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSubject();

    return () => {
      active = false;
    };
  }, [id]);

  function validateFile(selected) {
    if (!selected) return;

    const extension = selected.name.split(".").pop().toLowerCase();

    if (!["pdf", "pptx"].includes(extension)) {
      setFile(null);
      setError("Please upload a PDF or PPTX file.");
      return;
    }

    if (selected.size > MAX_SIZE) {
      setFile(null);
      setError("File size must not exceed 20 MB.");
      return;
    }

    setFile(selected);
    setError("");
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    validateFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    if (!accountReady || !subject) {
      setError("Subject not found in your account.");
      return;
    }

    if (!title.trim()) {
      setError("Lesson title is required.");
      return;
    }

    if (!file) {
      setError("Please upload a lesson file.");
      return;
    }

    setSaving(true);
    setError("");

    const lessonId = crypto.randomUUID();
    let fileSaved = false;

    try {
      // Recheck the active account before saving.
      const user = await initializeLessonStorageUser();

      const ownedSubject = readSubjects(user.id).some(
        (item) => String(item.id) === String(id)
      );

      if (!ownedSubject) {
        throw new Error("This subject does not belong to your account.");
      }

      const newLesson = {
        id: lessonId,
        subjectId: id,
        title: title.trim(),
        description: description.trim(),
        fileName: file.name,
        fileType: file.type,
        createdAt: new Date().toISOString(),
        completed: false,
      };

      await saveLessonFile(lessonId, file);
      fileSaved = true;

      const existingLessons = getLessons();
      saveLessons([...existingLessons, newLesson]);

      navigate(`/subjects/${id}/lessons/${lessonId}`);
    } catch (err) {
      if (fileSaved) {
        await deleteLessonFile(lessonId).catch(() => {});
      }

      setError(
        err.message || "Could not save the lesson. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="add-lesson-page">
        <p>Loading subject...</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="add-lesson-page">
        <h1>Subject Not Found</h1>
        {loadError && <p role="alert">{loadError}</p>}
        <Link to="/subjects">Back to My Subjects</Link>
      </div>
    );
  }

  return (
    <div className="add-lesson-page">
      <Link to={`/subjects/${id}`} className="back-link">
        <ArrowLeft size={18} />
        Back to Subject
      </Link>

      <div className="add-lesson-heading">
        <h1>Create a New Lesson</h1>
        <p>
          Upload your study materials and prepare to learn with AI.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="lesson-form">
        <div className="lesson-form-section">
          <h2>Lesson Details</h2>

          <label htmlFor="lessonSubject">Subject</label>
          <input
            id="lessonSubject"
            value={subject.name}
            readOnly
          />

          <label htmlFor="lessonTitle">Lesson Title *</label>
          <input
            id="lessonTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to HCI"
            maxLength={100}
            required
          />

          <label htmlFor="lessonDescription">
            Description (Optional)
          </label>
          <textarea
            id="lessonDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this lesson about?"
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="lesson-form-section">
          <h2>Upload Study Material</h2>
          <p className="lesson-helper">
            Supported formats: PDF, PPTX · Maximum size: 20 MB
          </p>

          <div
            className={`lesson-upload-zone ${
              dragging ? "dragging" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud size={38} />
            <p>Drag and drop your file here</p>
            <span>or</span>

            <button
              type="button"
              className="lesson-browse-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx"
              hidden
              onChange={(e) => {
                validateFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>

          {file && (
            <div className="lesson-selected-file">
              <FileText size={22} />
              <div>
                <strong>{file.name}</strong>
                <p>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove selected file"
                onClick={() => setFile(null)}
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="lesson-info">
          <Sparkles size={22} />
          <div>
            <strong>What happens next?</strong>
            <p>
              After creating your lesson, you can access your
              study workspace and use AI explanations, summaries,
              chat, and quizzes.
            </p>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="lesson-form-actions">
          <Link to={`/subjects/${id}`} className="lesson-cancel">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || !accountReady}
          >
            {saving ? "Saving Lesson..." : "Create Lesson"}
          </button>
        </div>
      </form>
    </div>
  );
}
