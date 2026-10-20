export const SUBJECT_ICON_CHOICES = [
  { key: "auto", label: "Auto" },
  { key: "book", label: "Book" },
  { key: "math", label: "Math" },
  { key: "science", label: "Science" },
  { key: "coding", label: "Coding" },
  { key: "design", label: "Design" },
  { key: "language", label: "Language" },
  { key: "world", label: "World" },
  { key: "mind", label: "Mind" },
];

const VALID_ICONS = new Set(SUBJECT_ICON_CHOICES.map((choice) => choice.key).filter((key) => key !== "auto"));

export function getSubjectIconKey(subject) {
  if (VALID_ICONS.has(subject?.icon)) return subject.icon;
  const name = String(subject?.name || subject?.title || "").toLowerCase();
  if (/math|algebra|calculus|statistic|geometry|accounting/.test(name)) return "math";
  if (/science|chemistry|biology|physics|medicine|lab/.test(name)) return "science";
  if (/design|art|drawing|hci|ux|ui|interaction/.test(name)) return "design";
  if (/code|coding|program|computer|software|web|data|algorithm/.test(name)) return "coding";
  if (/language|english|french|spanish|arabic|writing|literature/.test(name)) return "language";
  if (/history|geography|world|economics|politic/.test(name)) return "world";
  if (/psychology|philosophy|mind|cognitive/.test(name)) return "mind";
  return "book";
}
