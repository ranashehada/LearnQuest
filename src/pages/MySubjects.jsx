
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { API_URL } from "../utils/api";
import { deleteLessonFiles, setLessonStorageUser } from "../utils/lessonStorage";
import { commitStudyDeletion, prepareSubjectDeletion } from "../utils/subjectDeletion";
import ConfirmDeletionDialog from "../components/ConfirmDeletionDialog";
import SubjectIcon from "../components/SubjectIcon";
import { SUBJECT_ICON_CHOICES, getSubjectIconKey } from "../utils/subjectIconConfig";
import { readSubjectList, saveSubjectList } from "../utils/subjectStorage";


function getSubjectsKey(userId) {
  return `learnquest-user-${userId}-subjects`;
}

export default function MySubjects() {
  const [userId, setUserId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState("");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectIcon, setSubjectIcon] = useState("auto");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [deletionError, setDeletionError] = useState("");
  const [deletionNotice, setDeletionNotice] = useState("");
  const savedSubjectsRaw = useRef(null);

  useEffect(() => {
    if (deletionNotice) document.getElementById("subjects-heading")?.focus();
  }, [deletionNotice]);

  useEffect(() => {
    let active = true;

    async function loadUserSubjects() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Please log in to view your subjects."
          );
        }

        const data = await response.json();

        if (!data.user?.id) {
          throw new Error("Unable to identify your account.");
        }

        if (!active) return;

        const id = data.user.id;
        const key = getSubjectsKey(id);

        const saved = readSubjectList(localStorage, key);
        savedSubjectsRaw.current = saved.raw;
        setUserId(id);
        setSubjects(saved.subjects);
      } catch (err) {
        if (active) {
          setAccountError(
            err.message || "Unable to load your subjects."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUserSubjects();

    return () => {
      active = false;
    };
  }, []);

  function saveSubjects(updated) {
    if (!userId) {
      setError("Your account could not be identified. Your draft is still here; please log in again.");
      return false;
    }

    try {
      savedSubjectsRaw.current = saveSubjectList(
        localStorage, getSubjectsKey(userId), savedSubjectsRaw.current, updated
      );

      setSubjects(updated);

      window.dispatchEvent(
        new Event("learnquest:stats-updated")
      );
      return true;
    } catch (err) {
      setError(err.message || "Unable to save subjects in this browser. Your draft is still here.");
      return false;
    }
  }

  function openAddForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setSubjectIcon("auto");
    setError("");
    setShowForm(true);
  }

  function openEditForm(subject) {
    setEditingId(subject.id);
    setName(subject.name);
    setDescription(subject.description || "");
    setSubjectIcon(subject.icon || "auto");
    setError("");
    setShowForm(true);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }

    if (editingId) {
      const updated = subjects.map((subject) =>
        subject.id === editingId
          ? {
              ...subject,
              name: name.trim(),
              description: description.trim(),
              icon: subjectIcon,
            }
          : subject
      );

      if (!saveSubjects(updated)) return;
    } else {
      const newSubject = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        icon: subjectIcon,
        createdAt: new Date().toISOString(),
      };

      if (!saveSubjects([...subjects, newSubject])) return;
    }

    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
  }

  function openDeleteSubject(subject) {
    if (!userId || deletingId) return;
    setError("");
    setDeletionError("");
    setDeletionNotice("");

    try {
      const prepared = prepareSubjectDeletion(localStorage, userId, subject.id);
      setPendingDeletion({ subject, prepared });
    } catch (err) {
      setError(err.message || "Could not prepare subject deletion. Nothing was deleted.");
    }
  }

  async function confirmDeleteSubject() {
    if (!pendingDeletion || deletingId) return;
    const { subject, prepared } = pendingDeletion;
    const count = prepared.lessonIds.length;
    setDeletingId(subject.id);
    setDeletionError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Please log in again before deleting a subject.");
      const data = await response.json();
      if (String(data.user?.id) !== String(userId)) {
        throw new Error("Your account changed. Refresh before deleting a subject.");
      }

      setLessonStorageUser(userId);
      await commitStudyDeletion(localStorage, prepared, deleteLessonFiles);
      savedSubjectsRaw.current = prepared.changes.get(getSubjectsKey(userId));
      setSubjects(JSON.parse(prepared.changes.get(getSubjectsKey(userId))));
      if (editingId === subject.id) setShowForm(false);
      setPendingDeletion(null);
      setDeletionNotice(`"${subject.name}" and its ${count} ${count === 1 ? "lesson" : "lessons"} were deleted. Earned XP was kept.`);
      window.dispatchEvent(new Event("learnquest:stats-updated"));
    } catch (err) {
      setDeletionError(err.message || "Could not delete the subject. Your data was left untouched.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredSubjects = subjects.filter((subject) =>
    subject.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="subjects-page">
        <h1>My Subjects</h1>
        <p>Loading your subjects...</p>
      </div>
    );
  }

  if (accountError) {
    return (
      <div className="subjects-page">
        <h1>My Subjects</h1>
        <p className="form-error" role="alert">
          {accountError}
        </p>
      </div>
    );
  }

  return (
    <div className="subjects-page">
      <div className="subjects-heading">
        <div>
          <h1 id="subjects-heading" tabIndex={-1}>My Subjects</h1>
          <p>Organize and manage your learning subjects.</p>
        </div>

        <button
          className="btn-primary"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      <div className="subjects-search">
        <Search size={20} />

        <input
          type="search"
          placeholder="Search subjects..."
          aria-label="Search subjects"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />
      </div>

      {deletionNotice && <p role="status">{deletionNotice}</p>}
      {error && !showForm && <p className="form-error" role="alert">{error}</p>}
      {deletingId && <p role="status">Deleting subject and uploaded files...</p>}

      {pendingDeletion && (
        <ConfirmDeletionDialog
          title="Delete this subject?"
          description={`"${pendingDeletion.subject.name}" and ${pendingDeletion.prepared.lessonIds.length} ${pendingDeletion.prepared.lessonIds.length === 1 ? "lesson" : "lessons"} will be permanently deleted, along with uploaded files, saved AI content, unfinished quizzes, and detailed answer reviews. Earned XP and scores will stay, and planned study sessions will become general sessions. This cannot be undone.`}
          confirmLabel="Delete subject permanently"
          cancelLabel="Keep subject"
          deleting={deletingId === pendingDeletion.subject.id}
          error={deletionError}
          onClose={() => {
            setPendingDeletion(null);
            setDeletionError("");
          }}
          onConfirm={confirmDeleteSubject}
        />
      )}

      {showForm && (
        <div className="subject-form-card">
          <h2>
            {editingId
              ? "Edit Subject"
              : "Create New Subject"}
          </h2>

          <form onSubmit={handleSubmit}>
            <label htmlFor="subjectName">
              Subject Name *
            </label>

            <input
              id="subjectName"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Human Computer Interaction"
              maxLength={100}
              required
            />

            <label htmlFor="subjectDescription">
              Description (Optional)
            </label>

            <textarea
              id="subjectDescription"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="What will you study in this subject?"
              rows={3}
              maxLength={500}
            />

            <fieldset className="subject-icon-picker">
              <legend>Subject icon</legend>
              <div className="subject-icon-options">
                {SUBJECT_ICON_CHOICES.map((choice) => {
                  const preview = { name, icon: choice.key };
                  return (
                    <label key={choice.key} className="subject-icon-option">
                      <input
                        type="radio"
                        name="subjectIcon"
                        value={choice.key}
                        checked={subjectIcon === choice.key}
                        onChange={() => setSubjectIcon(choice.key)}
                      />
                      <span className={`subject-icon subject-visual--${getSubjectIconKey(preview)}`}>
                        <SubjectIcon subject={preview} size={24} />
                      </span>
                      <span>{choice.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="subject-form-actions">
              <button
                type="button"
                className="subject-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
              >
                {editingId
                  ? "Save Changes"
                  : "Create Subject"}
              </button>
            </div>
          </form>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="subjects-empty">
          <BookOpen size={44} />
          <h2>No subjects yet</h2>

          <p>
            Create your first subject to get started.
          </p>

          <button
            className="btn-primary"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Your First Subject
          </button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="subjects-empty">
          <Search size={40} />
          <h2>No matching subjects</h2>

          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className="subjects-grid">
          {filteredSubjects.map((subject) => (
            <article
              className="subject-card"
              key={subject.id}
            >
              <div className="subject-card-top">
                <div className={`subject-icon subject-visual--${getSubjectIconKey(subject)}`}>
                  <SubjectIcon subject={subject} />
                </div>

                <div className="subject-card-actions">
                  <button
                    aria-label={`Edit ${subject.name}`}
                    title="Edit subject"
                    onClick={() =>
                      openEditForm(subject)
                    }
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    aria-label={`Delete ${subject.name}`}
                    title="Delete subject"
                    disabled={deletingId !== null}
                    onClick={() =>
                      openDeleteSubject(subject)
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3>{subject.name}</h3>

              <p>
                {subject.description ||
                  "No description added yet."}
              </p>

              <Link
                to={`/subjects/${subject.id}`}
                className="subject-open-link"
              >
                Open Subject
                <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
