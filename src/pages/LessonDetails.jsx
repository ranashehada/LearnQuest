
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  MessageCircle,
  ClipboardList,
  Download,
  Sparkles,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import AIQuiz from "../components/AIQuiz";
import AIResponse from "../components/AIResponse";

import {
  initializeLessonStorageUser,
  getLessons,
  getLessonFile,
} from "../utils/lessonStorage";
import { API_URL } from "../utils/api";

const AI_RESULTS_KEY = "learnquest-ai-results";

function readSavedAIResults(lessonId) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(AI_RESULTS_KEY) || "{}"
    );

    return saved?.[lessonId] || {};
  } catch {
    return {};
  }
}

function saveAIResult(lessonId, type, content) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(AI_RESULTS_KEY) || "{}"
    );
    const results = saved && typeof saved === "object" ? saved : {};

    results[lessonId] = {
      ...(results[lessonId] || {}),
      [type]: content,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(AI_RESULTS_KEY, JSON.stringify(results));
  } catch (error) {
    console.error("Could not save AI result:", error);
  }
}

function readSubjects(userId) {
  try {
    const key = `learnquest-user-${userId}-subjects`;
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function AIResult({ content }) {
  return (
    <div
      style={{
        marginTop: "20px",
        padding: "24px",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        background: "#ffffff",
      }}
    >
      <AIResponse content={content} />
    </div>
  );
}

function AITransparencyNotice() {
  return (
    <p className="ai-transparency-notice" role="note">
      Based on your uploaded lesson. AI responses may contain mistakes, so
      verify important information with your study material.
    </p>
  );
}

function getAIErrorMessage(error, fallback) {
  if (!error) return fallback;

  if (error.name === "TypeError") {
    return "LearnQuest could not reach the study assistant right now. Please try again in a moment.";
  }

  return error.message || fallback;
}

export default function LessonDetails() {
  const { id, lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = ["explanation", "summary", "quiz"].includes(requestedTab) ? requestedTab : "explanation";

  const [lesson, setLesson] = useState(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [lessonError, setLessonError] = useState("");

  const [activeTab, setActiveTab] = useState("explanation");

  const [fileUrl, setFileUrl] = useState("");
  const [fileError, setFileError] = useState("");

  const [extractionStatus, setExtractionStatus] =
    useState("loading");
  const [extractionError, setExtractionError] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [characterCount, setCharacterCount] = useState(0);

  const [explanation, setExplanation] = useState("");
  const [summary, setSummary] = useState("");
  const [aiLoading, setAiLoading] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiRetryType, setAiRetryType] = useState("");

  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatRetryQuestion, setChatRetryQuestion] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    const controller = new AbortController();

    async function loadLesson() {
      setLoadingLesson(true);
      setLesson(null);
      setLessonError("");
      setFileUrl("");
      setFileError("");
      setExtractionStatus("loading");
      setExtractionError("");
      setExtractedText("");
      setCharacterCount(0);
      setExplanation("");
      setSummary("");
      setAiLoading("");
      setAiError("");
      setAiRetryType("");
      setChatMessages([]);
      setChatQuestion("");
      setChatError("");
      setChatRetryQuestion("");
      setActiveTab(initialTab);

      const savedAIResults = readSavedAIResults(lessonId);
      setExplanation(savedAIResults.explanation || "");
      setSummary(savedAIResults.summary || "");

      try {
        const user = await initializeLessonStorageUser();

        if (cancelled) return;

        const ownsSubject = readSubjects(user.id).some(
          (subject) => String(subject.id) === String(id)
        );

        if (!ownsSubject) {
          throw new Error(
            "This subject does not belong to your account."
          );
        }

        const foundLesson = getLessons().find(
          (item) =>
            String(item.id) === String(lessonId) &&
            String(item.subjectId ?? item.subject_id) ===
              String(id)
        );

        if (!foundLesson) {
          throw new Error(
            "This lesson was not found in your account."
          );
        }

        try {
          localStorage.setItem(
            `learnquest-user-${user.id}-last-opened-lesson`,
            JSON.stringify({ lessonId: String(lessonId), subjectId: String(id) })
          );
        } catch (storageError) {
          console.warn("Could not remember the last opened lesson:", storageError);
        }

        setLesson(foundLesson);
        setLoadingLesson(false);

        const file = await getLessonFile(lessonId);

        if (cancelled) return;

        if (!file) {
          setFileError("Lesson file not found.");
          setExtractionStatus("error");
          setExtractionError(
            "The uploaded file could not be found."
          );
          return;
        }

        objectUrl = URL.createObjectURL(file);
        setFileUrl(objectUrl);

        const formData = new FormData();
        formData.append(
          "file",
          file,
          foundLesson.fileName || file.name
        );

        const response = await fetch(
          `${API_URL}/api/extract-text`,
          {
            method: "POST",
            body: formData,
            signal: controller.signal,
            credentials: "include",
          }
        );

        const result = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to extract lesson text."
          );
        }

        setExtractedText(result.text || "");
        setCharacterCount(
          result.characters ??
            (result.text || "").length
        );
        setExtractionStatus("success");
      } catch (error) {
        if (cancelled || error.name === "AbortError") {
          return;
        }

        if (loadingLesson || !lesson) {
          // A missing lesson/account is handled separately
          // below if no lesson was loaded.
        }

        setLessonError((previous) => previous);
        setExtractionStatus("error");
        setExtractionError(
          error instanceof TypeError
            ? "Cannot connect to the backend. Make sure the server is running on port 5000."
            : error.message || "Could not process this lesson."
        );

        // If the lesson wasn't loaded, show the access error.
        setLesson((current) => {
          if (!current) {
            setLessonError(
              error.message || "Unable to load lesson."
            );
          }
          return current;
        });
      } finally {
        if (!cancelled) setLoadingLesson(false);
      }
    }

    loadLesson();

    return () => {
      cancelled = true;
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id, lessonId, initialTab]);

  async function generateAI(type) {
    if (
      extractionStatus !== "success" ||
      !extractedText ||
      aiLoading
    ) {
      return;
    }

    setAiLoading(type);
    setAiError("");
    setAiRetryType("");

    try {
      const response = await fetch(
        `${API_URL}/api/ai/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            lessonText: extractedText,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "AI generation failed."
        );
      }

      if (type === "explanation") {
        setExplanation(result.content || "");
      } else {
        setSummary(result.content || "");
      }

      saveAIResult(lessonId, type, result.content || "");
    } catch (error) {
      setAiError(getAIErrorMessage(error, "AI generation failed. Please try again."));
      setAiRetryType(type);
    } finally {
      setAiLoading("");
    }
  }

  async function sendChatMessage(questionOverride = "") {
    const question = (questionOverride || chatQuestion).trim();

    if (
      !question ||
      !extractedText ||
      extractionStatus !== "success" ||
      chatLoading
    ) {
      return;
    }

    setChatQuestion("");
    setChatError("");
    setChatRetryQuestion("");
    setChatLoading(true);

    setChatMessages((previous) => [
      ...previous,
      { role: "user", content: question },
    ]);

    try {
      const response = await fetch(
        `${API_URL}/api/ai/chat`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonText: extractedText,
            question,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not send your message."
        );
      }

      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer || "",
        },
      ]);
    } catch (error) {
      setChatError(getAIErrorMessage(error, "The AI could not answer your question. Please try again."));
      setChatRetryQuestion(question);
    } finally {
      setChatLoading(false);
    }
  }

  if (loadingLesson) {
    return (
      <div className="lesson-details-page">
        <p>Loading your lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="lesson-details-page">
        <h1>Lesson Not Found</h1>
        <p role="alert">
          {lessonError ||
            "This lesson is not available in your account."}
        </p>
        <Link
          to={`/subjects/${id}`}
          className="back-link"
        >
          <ArrowLeft size={18} />
          Back to Subject
        </Link>
      </div>
    );
  }

  const isPdf = (lesson.fileName || "")
    .toLowerCase()
    .endsWith(".pdf");

  const tabs = [
    {
      id: "explanation",
      label: "Explanation",
      icon: BookOpen,
    },
    {
      id: "summary",
      label: "Summary",
      icon: FileText,
    },
    {
      id: "chat",
      label: "AI Chat",
      icon: MessageCircle,
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: ClipboardList,
    },
  ];

  const ready = extractionStatus === "success";

  return (
    <div className="lesson-details-page">
      <Link
        to={`/subjects/${id}`}
        className="back-link"
      >
        <ArrowLeft size={18} />
        Back to Subject
      </Link>

      <header className="lesson-details-header">
        <h1>{lesson.title}</h1>
        <p>
          {lesson.description ||
            "Your personalized study workspace"}
        </p>
      </header>

      {/* PROCESSING STATUS */}
      <section
        className="lesson-content-card"
        aria-live="polite"
        style={{ marginBottom: "24px" }}
      >
        {extractionStatus === "loading" && (
          <div className="study-section-heading">
            <LoaderCircle size={24} />
            <div>
              <h2>Processing Your Lesson</h2>
              <p>Reading your uploaded study material...</p>
            </div>
          </div>
        )}

        {ready && (
          <div className="study-section-heading">
            <CheckCircle2 size={24} color="#16a34a" />
            <div>
              <h2>Lesson Ready</h2>
              <p>
                Successfully extracted{" "}
                {characterCount.toLocaleString()} characters
                from your study material.
              </p>
            </div>
          </div>
        )}

        {extractionStatus === "error" && (
          <div
            className="study-section-heading"
            role="alert"
          >
            <AlertCircle size={24} color="#dc2626" />
            <div>
              <h2>Lesson Processing Failed</h2>
              <p>{extractionError}</p>
            </div>
          </div>
        )}
      </section>

      {/* TABS */}
      <div
        className="lesson-tabs"
        role="tablist"
        aria-label="Study tools"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls="study-tab-panel"
              className={`lesson-tab ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setAiError("");
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <section
        id="study-tab-panel"
        className="lesson-content-card study-tab-content"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "explanation" && (
          <div>
            <div className="study-section-heading">
              <Sparkles size={25} />
              <h2>AI Explanation</h2>
            </div>

            <p>
              Understand your lesson with clear,
              step-by-step AI explanations.
            </p>
            <AITransparencyNotice />

            {!explanation ? (
              <div className="study-feature-placeholder">
                <BookOpen size={38} />
                <h3>Your AI Explanation</h3>
                <p>
                  {ready
                    ? "Your lesson is ready. Generate an AI explanation based on your study material."
                    : "Please wait until your lesson is processed."}
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!ready || !!aiLoading}
                  onClick={() =>
                    generateAI("explanation")
                  }
                >
                  <Sparkles size={18} />
                  {aiLoading === "explanation"
                    ? "Generating..."
                    : "Generate Explanation"}
                </button>
              </div>
            ) : (
              <>
                <AIResult content={explanation} />
                <p className="ai-saved-note">Saved for this lesson on this browser.</p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: "20px" }}
                  disabled={!!aiLoading}
                  onClick={() =>
                    generateAI("explanation")
                  }
                >
                  <Sparkles size={18} />
                  {aiLoading === "explanation"
                    ? "Regenerating..."
                    : "Regenerate Explanation"}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div>
            <div className="study-section-heading">
              <FileText size={25} />
              <h2>Lesson Summary</h2>
            </div>

            <p>
              Review the most important concepts and
              key takeaways from your lesson.
            </p>
            <AITransparencyNotice />

            {!summary ? (
              <div className="study-feature-placeholder">
                <FileText size={38} />
                <h3>Your Lesson Summary</h3>
                <p>
                  {ready
                    ? "Your lesson is ready for AI summarization."
                    : "Please wait until your lesson is processed."}
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!ready || !!aiLoading}
                  onClick={() => generateAI("summary")}
                >
                  <Sparkles size={18} />
                  {aiLoading === "summary"
                    ? "Generating..."
                    : "Generate Summary"}
                </button>
              </div>
            ) : (
              <>
                <AIResult content={summary} />
                <p className="ai-saved-note">Saved for this lesson on this browser.</p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: "20px" }}
                  disabled={!!aiLoading}
                  onClick={() => generateAI("summary")}
                >
                  <Sparkles size={18} />
                  {aiLoading === "summary"
                    ? "Regenerating..."
                    : "Regenerate Summary"}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div>
            <div className="study-section-heading">
              <MessageCircle size={25} />
              <h2>AI Study Assistant</h2>
            </div>

            <p>Ask questions about your uploaded lesson.</p>
            <AITransparencyNotice />

            <div className="study-chat-box">
              {chatMessages.length === 0 && (
                <div className="study-chat-message">
                  <Sparkles size={22} />
                  <p>
                    Hello! I'm your AI study assistant.
                    Ask me anything about this lesson.
                  </p>
                </div>
              )}

              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className="study-chat-message"
                  style={{
                    marginBottom: "14px",
                    padding: "16px",
                    borderRadius: "12px",
                    background:
                      message.role === "user"
                        ? "#eeeaff"
                        : "#f8f9fd",
                  }}
                >
                  <strong>
                    {message.role === "user"
                      ? "You"
                      : "LearnQuest AI"}
                  </strong>

                  {message.role === "assistant" ? (
                    <AIResponse content={message.content} />
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              ))}

              {chatLoading && (
                <p aria-live="polite">
                  LearnQuest AI is thinking...
                </p>
              )}
            </div>

            {chatError && (
              <div className="ai-error-box" role="alert">
                <p className="form-error">{chatError}</p>
                {chatRetryQuestion && (
                  <button
                    type="button"
                    className="ai-retry-button"
                    onClick={() => sendChatMessage(chatRetryQuestion)}
                    disabled={chatLoading}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            <form
              className="study-chat-input"
              onSubmit={(event) => {
                event.preventDefault();
                sendChatMessage();
              }}
            >
              <input
                type="text"
                placeholder="Ask a question about this lesson..."
                aria-label="Ask a question"
                value={chatQuestion}
                onChange={(event) =>
                  setChatQuestion(event.target.value)
                }
                disabled={!ready || chatLoading}
                maxLength={2000}
              />

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  !ready ||
                  chatLoading ||
                  !chatQuestion.trim()
                }
              >
                {chatLoading ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "quiz" && (
          <AIQuiz
            key={lessonId}
            lessonText={extractedText}
            lessonId={lessonId}
            subjectId={id}
          />
        )}

        {aiError &&
          (activeTab === "explanation" ||
            activeTab === "summary") && (
            <div
              className="form-error ai-error-box"
              role="alert"
              style={{ marginTop: "16px" }}
            >
              <span>{aiError}</span>
              {aiRetryType && (
                <button
                  type="button"
                  className="ai-retry-button"
                  onClick={() => generateAI(aiRetryType)}
                  disabled={Boolean(aiLoading)}
                >
                  Try Again
                </button>
              )}
            </div>
          )}
      </section>

      {/* UPLOADED MATERIAL */}
      <section className="lesson-content-card lesson-material-section">
        <div className="study-section-heading">
          <FileText size={25} />
          <h2>Uploaded Study Material</h2>
        </div>

        <div className="lesson-file-info">
          <FileText size={22} />
          <span>{lesson.fileName}</span>

          {fileUrl && (
            <a
              href={fileUrl}
              download={lesson.fileName}
              className="lesson-download-link"
            >
              <Download size={17} />
              Download
            </a>
          )}
        </div>

        {fileError && (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        )}

        {fileUrl && isPdf && (
          <iframe
            src={fileUrl}
            title="Lesson PDF"
            className="lesson-pdf-preview"
          />
        )}

        {fileUrl && !isPdf && (
          <p className="lesson-helper">
            PowerPoint preview is not available yet.
            Download the file to open it.
          </p>
        )}

        {ready && extractedText && (
          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
            }}
          >
            <h3>Extracted Lesson Text</h3>

            <p className="lesson-helper">
              Text successfully retrieved from your
              uploaded material.
            </p>

            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontSize: "14px",
                lineHeight: "1.7",
              }}
            >
              {extractedText}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
