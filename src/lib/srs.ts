import { addDays } from "./date";

/** Progression d'un mot dans la mémoire (algorithme SM-2 simplifié). */
export interface WordProgress {
  id: string;
  ease: number; // facilité (1.3 → 2.8)
  interval: number; // jours avant la prochaine révision
  reps: number; // bonnes réponses consécutives
  lapses: number; // nombre d'oublis
  due: string; // date de la prochaine révision (yyyy-mm-dd)
  learnedOn: string;
  lastSeen: string;
  seen: number;
  correct: number;
}

/** 0 = oublié, 1 = difficile, 2 = bien, 3 = facile */
export type Grade = 0 | 1 | 2 | 3;

export function newProgress(id: string, today: string): WordProgress {
  return { id, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: today, learnedOn: today, lastSeen: today, seen: 0, correct: 0 };
}

export function schedule(p: WordProgress, grade: Grade, today: string): WordProgress {
  const next = { ...p, seen: p.seen + 1, lastSeen: today };
  if (grade === 0) {
    next.reps = 0;
    next.lapses += 1;
    next.interval = 1;
    next.ease = Math.max(1.3, p.ease - 0.2);
  } else {
    next.correct += 1;
    next.reps += 1;
    if (next.reps === 1) next.interval = grade === 3 ? 3 : 1;
    else if (next.reps === 2) next.interval = grade === 1 ? 3 : grade === 3 ? 8 : 6;
    else {
      const factor = grade === 1 ? 1.2 : grade === 3 ? p.ease + 0.3 : p.ease;
      next.interval = Math.max(p.interval + 1, Math.round(p.interval * factor));
    }
    next.ease = Math.min(2.8, Math.max(1.3, p.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.1 : 0)));
    next.interval = Math.min(next.interval, 180);
  }
  next.due = addDays(today, next.interval);
  return next;
}

export type Mastery = "new" | "learning" | "known" | "mastered";

export function mastery(p?: WordProgress): Mastery {
  if (!p) return "new";
  if (p.interval >= 21) return "mastered";
  if (p.interval >= 6) return "known";
  return "learning";
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: "Nouveau",
  learning: "En cours",
  known: "Acquis",
  mastered: "Maîtrisé",
};
