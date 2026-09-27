export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

export interface Word {
  id: string;
  en: string;
  fr: string;
  ex: string;
  level: Level;
  theme: string;
  custom?: boolean;
}

export type Exercise =
  | { kind: "mcq"; prompt: string; options: string[]; answer: number; explain?: string }
  | { kind: "gap"; prompt: string; answer: string[]; hint?: string; explain?: string }
  | { kind: "order"; prompt: string; words: string[]; answer: string };

export interface GrammarLesson {
  id: string;
  level: Level;
  title: string;
  subtitle: string;
  intro: string;
  rules: { title: string; body: string }[];
  examples: { en: string; fr: string }[];
  tip?: string;
  exercises: Exercise[];
}

export interface Reading {
  id: string;
  level: Level;
  title: string;
  text: string;
  glossary: { en: string; fr: string }[];
  questions: { q: string; options: string[]; answer: number }[];
}
