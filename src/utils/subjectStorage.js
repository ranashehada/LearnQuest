export function readSubjectList(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw == null) return { subjects: [], raw: null };
    const subjects = JSON.parse(raw);
    if (Array.isArray(subjects)) return { subjects, raw };
  } catch {
    // Never turn damaged saved data into an empty list.
  }
  throw new Error("Your saved subjects could not be read. No data has been changed.");
}

export function saveSubjectList(storage, key, expectedRaw, subjects) {
  if (!Array.isArray(subjects)) throw new Error("Subjects must be a list.");

  let currentRaw;
  try {
    currentRaw = storage.getItem(key);
  } catch {
    throw new Error("Browser storage is unavailable. Your subject draft is still here.");
  }
  if (currentRaw !== expectedRaw) {
    throw new Error("Subjects changed in another tab. Your draft is still here; reload to see the latest changes before saving.");
  }

  const raw = JSON.stringify(subjects);
  try {
    storage.setItem(key, raw);
  } catch {
    throw new Error("Could not save subjects in this browser. Your draft is still here; free browser storage and try again.");
  }
  return raw;
}
