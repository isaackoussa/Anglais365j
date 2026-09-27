import type { Word } from "../data/types";
import { slug } from "../data/vocab";
import { dayKey } from "./date";
import { newProgress, schedule, type Grade } from "./srs";
import { getState, logActivity, update } from "./store";

export const XP = { correct: 10, close: 6, newWord: 5, lesson: 40, session: 50, reading: 30, writing: 40 };

/** Enregistre une réponse sur un mot déjà appris (révision espacée). */
export function gradeWord(id: string, grade: Grade) {
  const today = dayKey();
  update((d) => {
    const p = d.words[id] ?? newProgress(id, today);
    d.words[id] = schedule(p, grade, today);
  });
  logActivity({ reviewed: 1, answered: 1, correct: grade > 0 ? 1 : 0, addXp: grade >= 2 ? XP.correct : grade === 1 ? XP.close : 0 });
}

/** Premier apprentissage d'un mot : il entre dans le répertoire et sera révisé demain. */
export function learnWord(id: string, correct: boolean) {
  const today = dayKey();
  update((d) => {
    if (d.words[id]) return;
    d.words[id] = schedule(newProgress(id, today), correct ? 2 : 1, today);
  });
  logActivity({ addNew: [id], answered: 1, correct: correct ? 1 : 0, addXp: XP.newWord + (correct ? XP.correct : 0) });
}

export function recordAnswer(correct: boolean) {
  logActivity({ answered: 1, correct: correct ? 1 : 0, addXp: correct ? XP.correct : 0 });
}

export function addCustomWord(en: string, fr: string, ex = "", theme = "Mes mots"): Word | null {
  const id = `u-${slug(en)}`;
  if (!en.trim() || !fr.trim()) return null;
  const s = getState();
  if (s.customWords.some((w) => w.id === id)) return null;
  const word: Word = { id, en: en.trim(), fr: fr.trim(), ex: ex.trim(), level: "B1", theme, custom: true };
  update((d) => {
    d.customWords.push(word);
    d.words[id] = newProgress(id, dayKey()); // dû aujourd'hui : il apparaîtra dans la prochaine révision
  });
  return word;
}

export function removeCustomWord(id: string) {
  update((d) => {
    d.customWords = d.customWords.filter((w) => w.id !== id);
    delete d.words[id];
  });
}

export function resetWord(id: string) {
  update((d) => {
    const p = d.words[id];
    if (p) d.words[id] = { ...newProgress(id, dayKey()), learnedOn: p.learnedOn, seen: p.seen, correct: p.correct };
  });
}
