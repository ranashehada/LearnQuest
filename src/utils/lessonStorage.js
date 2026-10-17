
const LEGACY_LESSONS_KEY = "learnquest-lessons";

const DB_NAME = "learnquest-files";
const STORE_NAME = "uploads";

const API_URL = "http://localhost:5000";

// Cache the authenticated user ID in memory only.
// Never use localStorage as proof of authentication.
let currentUserId = null;

export function setLessonStorageUser(userId) {
  currentUserId = userId ? String(userId) : null;
}

export function clearLessonStorageUser() {
  currentUserId = null;
}

export async function initializeLessonStorageUser() {
  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    clearLessonStorageUser();
    throw new Error("Please log in first.");
  }

  const data = await response.json();

  if (!data.user?.id) {
    clearLessonStorageUser();
    throw new Error("Unable to identify your account.");
  }

  setLessonStorageUser(data.user.id);

  return data.user;
}

function requireUserId() {
  if (!currentUserId) {
    throw new Error(
      "Lesson storage is not initialized. " +
      "Call initializeLessonStorageUser first."
    );
  }

  return currentUserId;
}

function getLessonsKey() {
  return `learnquest-user-${requireUserId()}-lessons`;
}

function getFileKey(lessonId) {
  return `user:${requireUserId()}:lesson:${lessonId}`;
}

export function getLessons() {
  const key = getLessonsKey();

  try {
    const lessons = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(lessons) ? lessons : [];
  } catch {
    return [];
  }
}

export function saveLessons(lessons) {
  if (!Array.isArray(lessons)) {
    throw new Error("Lessons must be an array.");
  }

  localStorage.setItem(
    getLessonsKey(),
    JSON.stringify(lessons)
  );

  window.dispatchEvent(
    new Event("learnquest:stats-updated")
  );
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);
  });
}

export async function saveLessonFile(id, file) {
  const key = getFileKey(id);
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).put(
      file,
      key
    );

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ||
        new Error("File save was cancelled.")
      );
    };
  });
}

export async function getLessonFile(id) {
  const key = getFileKey(id);
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const request = transaction
      .objectStore(STORE_NAME)
      .get(key);

    let result = null;

    request.onsuccess = () => {
      result = request.result || null;
    };

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function deleteLessonFile(id) {
  const key = getFileKey(id);
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    transaction.objectStore(STORE_NAME).delete(key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// Read-only access to old lesson metadata.
// This does NOT move or delete any old data.
export function getLegacyLessons() {
  try {
    const lessons = JSON.parse(
      localStorage.getItem(
        LEGACY_LESSONS_KEY
      ) || "[]"
    );

    return Array.isArray(lessons) ? lessons : [];
  } catch {
    return [];
  }
}
