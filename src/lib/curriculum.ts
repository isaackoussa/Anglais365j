import { LESSONS } from "../data/grammar";
import { READINGS } from "../data/readings";
import { LEVELS, type GrammarLesson, type Level, type Reading, type Word } from "../data/types";
import { WORDS, WORDS_BY_ID } from "../data/vocab";
import { addDays, dayKey } from "./date";
import type { State } from "./store";

export const levelIndex = (l: Level) => LEVELS.indexOf(l);

export const LEVEL_INFO: Record<Level, { name: string; desc: string; color: string }> = {
  A1: { name: "Débutant", desc: "Se présenter, phrases simples du quotidien", color: "var(--lv-a1)" },
  A2: { name: "Élémentaire", desc: "Échanges simples, raconter au passé", color: "var(--lv-a2)" },
  B1: { name: "Intermédiaire", desc: "Se débrouiller en voyage, donner son avis", color: "var(--lv-b1)" },
  B2: { name: "Intermédiaire avancé", desc: "Argumenter, comprendre l'essentiel d'un sujet complexe", color: "var(--lv-b2)" },
  C1: { name: "Avancé", desc: "S'exprimer avec aisance et précision, registres variés", color: "var(--lv-c1)" },
};

export function inProgram(s: State, level: Level): boolean {
  const i = levelIndex(level);
  return i >= levelIndex(s.profile.startLevel) && i <= levelIndex(s.profile.targetLevel);
}

export function allWords(s: State): Word[] {
  return [...WORDS, ...s.customWords];
}

export function findWord(s: State, id: string): Word | undefined {
  return WORDS_BY_ID.get(id) ?? s.customWords.find((w) => w.id === id);
}

export function programWords(s: State): Word[] {
  return WORDS.filter((w) => inProgram(s, w.level));
}

export function programLessons(s: State): GrammarLesson[] {
  return LESSONS.filter((l) => inProgram(s, l.level));
}

export function programReadings(s: State): Reading[] {
  return READINGS.filter((r) => inProgram(s, r.level));
}

export function nextNewWords(s: State, n: number = s.profile.dailyNew): Word[] {
  return programWords(s).filter((w) => !s.words[w.id]).slice(0, n);
}

export function nextLesson(s: State): GrammarLesson | undefined {
  return programLessons(s).find((l) => !s.grammarDone[l.id]);
}

export function nextReading(s: State): Reading | undefined {
  return programReadings(s).find((r) => !s.readingsDone[r.id]);
}

export function dueWords(s: State, today = dayKey()): Word[] {
  return Object.values(s.words)
    .filter((p) => p.due <= today)
    .sort((a, b) => (a.due === b.due ? b.lapses - a.lapses : a.due < b.due ? -1 : 1))
    .map((p) => findWord(s, p.id))
    .filter((w): w is Word => !!w);
}

export type Focus = "grammar" | "reading" | "listening" | "writing" | "speaking";

export const FOCUS_INFO: Record<Focus, { label: string; icon: string; desc: string }> = {
  grammar: { label: "Grammaire", icon: "book", desc: "Une nouvelle notion expliquée en français, puis pratique" },
  reading: { label: "Lecture", icon: "file", desc: "Un texte à ton niveau avec questions de compréhension" },
  listening: { label: "Écoute & dictée", icon: "headphones", desc: "Écoute des phrases et écris ce que tu entends" },
  writing: { label: "Expression écrite", icon: "pen", desc: "Rédige quelques lignes, l'IA te corrige" },
  speaking: { label: "Prononciation", icon: "mic", desc: "Répète à voix haute, l'app t'écoute" },
};

const ROTATION: Focus[] = ["grammar", "reading", "grammar", "listening", "grammar", "writing", "speaking"];

/** Numéro du jour dans le programme (1 = premier jour). */
export function programDay(s: State): number {
  const today = s.days[dayKey()];
  return today?.completed ? s.sessionsDone : s.sessionsDone + 1;
}

export function focusForDay(s: State, day = programDay(s)): Focus {
  const f = ROTATION[(day - 1) % ROTATION.length];
  if (f === "grammar" && !nextLesson(s)) return "listening";
  if (f === "reading" && !nextReading(s)) return "writing";
  return f;
}

export interface LevelProgress {
  level: Level;
  words: number;
  learned: number;
  mastered: number;
  lessons: number;
  lessonsDone: number;
  pct: number;
}

export function levelProgress(s: State, level: Level): LevelProgress {
  const ws = WORDS.filter((w) => w.level === level);
  const ls = LESSONS.filter((l) => l.level === level);
  let learned = 0;
  let mastered = 0;
  for (const w of ws) {
    const p = s.words[w.id];
    if (p) {
      learned++;
      if (p.interval >= 21) mastered++;
    }
  }
  const lessonsDone = ls.filter((l) => s.grammarDone[l.id]).length;
  // Un mot appris compte à moitié, un mot maîtrisé compte entièrement
  const wordScore = ws.length ? (learned * 0.5 + mastered * 0.5) / ws.length : 1;
  const lessonScore = ls.length ? lessonsDone / ls.length : 1;
  const pct = Math.round((wordScore * 0.6 + lessonScore * 0.4) * 100);
  return { level, words: ws.length, learned, mastered, lessons: ls.length, lessonsDone, pct };
}

/** Niveau estimé : dernier niveau validé à 75 % (les niveaux sous le départ sont considérés acquis). */
export function estimatedLevel(s: State): { level: Level | "Pré-A1"; working: Level } {
  const start = levelIndex(s.profile.startLevel);
  let reached: Level | "Pré-A1" = start > 0 ? LEVELS[start - 1] : "Pré-A1";
  let working: Level = s.profile.startLevel;
  for (let i = start; i < LEVELS.length; i++) {
    const lv = LEVELS[i];
    if (levelProgress(s, lv).pct >= 75) {
      reached = lv;
      working = LEVELS[Math.min(i + 1, LEVELS.length - 1)];
    } else {
      working = lv;
      break;
    }
  }
  return { level: reached, working };
}

export function programStats(s: State) {
  const words = programWords(s);
  const lessons = programLessons(s);
  const learned = words.filter((w) => s.words[w.id]).length;
  const lessonsDone = lessons.filter((l) => s.grammarDone[l.id]).length;
  const remainingWords = words.length - learned;
  const remainingLessons = lessons.length - lessonsDone;
  // ≈ 3 leçons de grammaire tous les 7 jours dans la rotation
  const daysForWords = Math.ceil(remainingWords / s.profile.dailyNew);
  const daysForLessons = Math.ceil((remainingLessons * 7) / 3);
  // + une période de consolidation pour que les derniers mots soient vraiment maîtrisés
  const daysLeft = Math.max(daysForWords, daysForLessons) + (remainingWords > 0 ? 21 : 0);
  const total = learned + lessonsDone * 10;
  const max = words.length + lessons.length * 10;
  return {
    words: words.length,
    learned,
    lessons: lessons.length,
    lessonsDone,
    daysLeft,
    finishDate: addDays(dayKey(), daysLeft),
    pct: max ? Math.round((total / max) * 100) : 100,
  };
}

/** Mélange de Fisher-Yates (copie). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** Distracteurs plausibles : même niveau / même thème de préférence. */
export function distractors(s: State, word: Word, n = 3): Word[] {
  const pool = allWords(s).filter((w) => w.id !== word.id && w.fr !== word.fr && w.en !== word.en);
  const close = pool.filter((w) => w.theme === word.theme);
  const sameLevel = pool.filter((w) => w.level === word.level && w.theme !== word.theme);
  const picked = sample(close, n);
  if (picked.length < n) picked.push(...sample(sameLevel, n - picked.length));
  if (picked.length < n) picked.push(...sample(pool, n - picked.length));
  return picked.slice(0, n);
}

/** Mots déjà appris mais pas dus aujourd'hui : pour le « tour » de consolidation. */
export function consolidationWords(s: State, n: number, exclude: Set<string>): Word[] {
  const today = dayKey();
  const pool = Object.values(s.words)
    .filter((p) => p.due > today && !exclude.has(p.id))
    .sort((a, b) => b.lapses - a.lapses || (a.lastSeen < b.lastSeen ? -1 : 1));
  // on privilégie les mots fragiles et ceux qu'on n'a pas vus depuis longtemps, avec un peu de hasard
  const head = pool.slice(0, n * 3);
  return sample(head, n)
    .map((p) => findWord(s, p.id))
    .filter((w): w is Word => !!w);
}

export function doneLessons(s: State): GrammarLesson[] {
  return LESSONS.filter((l) => s.grammarDone[l.id]);
}
