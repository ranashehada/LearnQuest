import { BookOpen, Brain, Calculator, Code2, FlaskConical, Globe2, Languages, Palette } from "lucide-react";
import { getSubjectIconKey } from "../utils/subjectIconConfig";

const ICONS = {
  book: BookOpen,
  math: Calculator,
  science: FlaskConical,
  coding: Code2,
  design: Palette,
  language: Languages,
  world: Globe2,
  mind: Brain,
};

export default function SubjectIcon({ subject, size = 26 }) {
  const key = getSubjectIconKey(subject);
  const Icon = ICONS[key];
  return <Icon size={size} aria-hidden="true" />;
}
