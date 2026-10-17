
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRight
} from "lucide-react";

export default function MySubjects() {
  const [subjects, setSubjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("learnquest-subjects")) || [];
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function saveSubjects(updated) {
    setSubjects(updated);
    localStorage.setItem(
      "learnquest-subjects",
      JSON.stringify(updated)
    );
  }

  function openAddForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setError("");
    setShowForm(true);
  }

  function openEditForm(subject) {
    setEditingId(subject.id);
    setName(subject.name);
    setDescription(subject.description || "");
    setError("");
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();

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
              description: description.trim()
            }
          : subject
      );

      saveSubjects(updated);
    } else {
      const newSubject = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString()
      };

      saveSubjects([...subjects, newSubject]);
    }

    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
  }

  function deleteSubject(subject) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${subject.name}"?`
    );

    if (!confirmed) return;

    saveSubjects(subjects.filter((s) => s.id !== subject.id));
  }

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="subjects-page">
      <div className="subjects-heading">
        <div>
          <h1>My Subjects</h1>
          <p>Organize and manage your learning subjects.</p>
        </div>

        <button className="btn-primary" onClick={openAddForm}>
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
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="subject-form-card">
          <h2>
            {editingId ? "Edit Subject" : "Create New Subject"}
          </h2>

          <form onSubmit={handleSubmit}>
            <label htmlFor="subjectName">Subject Name *</label>
            <input
              id="subjectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you study in this subject?"
              rows={3}
              maxLength={500}
            />

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

              <button type="submit" className="btn-primary">
                {editingId ? "Save Changes" : "Create Subject"}
              </button>
            </div>
          </form>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="subjects-empty">
          <BookOpen size={44} />
          <h2>No subjects yet</h2>
          <p>Create your first subject to get started.</p>
          <button className="btn-primary" onClick={openAddForm}>
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
            <article className="subject-card" key={subject.id}>
              <div className="subject-card-top">
                <div className="subject-icon">
                  <BookOpen size={26} />
                </div>

                <div className="subject-card-actions">
                  <button
                    aria-label={`Edit ${subject.name}`}
                    title="Edit subject"
                    onClick={() => openEditForm(subject)}
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    aria-label={`Delete ${subject.name}`}
                    title="Delete subject"
                    onClick={() => deleteSubject(subject)}
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
                Open Subject <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
