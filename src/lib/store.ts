import { useSyncExternalStore } from "react";
import type { Level, Word } from "../data/types";
import { dayKey, addDays } from "./date";
import type { WordProgress } from "./srs";

export type Pace = 5 | 8 | 12 | 16;

export interface Profile {
  name: string;
  startLevel: Level;
  targetLevel: Level;
  dailyNew: Pace;
  startedOn: string;
  reminder?: string;
}

export type AiProvider = "gemini" | "claude";

export interface Settings {
  provider: AiProvider;
  geminiKey: string;
  geminiModel: string;
  apiKey: string;
  model: string;
  voiceURI: string;
  rate: number;
  theme: "system" | "light" | "dark";
  autoplay: boolean;
}

export interface DayLog {
  date: string;
  xp: number;
  newWords: string[];
  reviewed: number;
  correct: number;
  answered: number;
  minutes: number;
  completed: boolean;
  focus?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: number;
}

export interface Writing {
  date: string;
  prompt: string;
  text: string;
  feedback?: string;
}

export interface State {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  settings: Settings;
  words: Record<string, WordProgress>;
  customWords: Word[];
  grammarDone: Record<string, { score: number; date: string }>;
  readingsDone: Record<string, { score: number; date: string }>;
  days: Record<string, DayLog>;
  sessionsDone: number;
  chats: Record<string, ChatMessage[]>;
  writings: Writing[];
  xp: number;
}

const KEY = "anglais365j:v1";

export const DEFAULT_MODEL = "claude-opus-5";

function initialState(): State {
  return {
    version: 1,
    onboarded: false,
    profile: { name: "", startLevel: "A1", targetLevel: "B2", dailyNew: 8, startedOn: dayKey() },
    settings: { provider: "gemini", geminiKey: "", geminiModel: "gemini-3.8-flash", apiKey: "", model: DEFAULT_MODEL, voiceURI: "", rate: 0.95, theme: "system", autoplay: true },
    words: {},
    customWords: [],
    grammarDone: {},
    readingsDone: {},
    days: {},
    sessionsDone: 0,
    chats: {},
    writings: [],
    xp: 0,
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<State>;
    const base = initialState();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      settings: {
        ...base.settings,
        // un ancien utilisateur qui avait déjà une clé Claude garde Claude
        ...(parsed.settings?.apiKey && !parsed.settings.provider ? { provider: "claude" as const } : {}),
        ...parsed.settings,
      },
    } as State;
  } catch {
    return initialState();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* stockage plein ou indisponible : l'app continue en mémoire */
  }
}

export function getState(): State {
  return state;
}

/** Applique une modification (sur une copie) puis notifie les composants. */
export function update(fn: (draft: State) => void) {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  persist();
  listeners.forEach((l) => l());
}

export function replaceState(next: State) {
  state = { ...initialState(), ...next };
  persist();
  listeners.forEach((l) => l());
}

export function resetState() {
  state = initialState();
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function todayLog(s: State, date = dayKey()): DayLog {
  return s.days[date] ?? { date, xp: 0, newWords: [], reviewed: 0, correct: 0, answered: 0, minutes: 0, completed: false };
}

/** Enregistre de l'activité sur la journée en cours. */
export function logActivity(patch: Partial<Omit<DayLog, "date">> & { addXp?: number; addNew?: string[] }) {
  update((d) => {
    const date = dayKey();
    const log = todayLog(d, date);
    if (patch.addXp) {
      log.xp += patch.addXp;
      d.xp += patch.addXp;
    }
    if (patch.addNew) log.newWords = [...new Set([...log.newWords, ...patch.addNew])];
    if (patch.reviewed) log.reviewed += patch.reviewed;
    if (patch.correct) log.correct += patch.correct;
    if (patch.answered) log.answered += patch.answered;
    if (patch.minutes) log.minutes += patch.minutes;
    if (patch.focus) log.focus = patch.focus;
    if (patch.completed && !log.completed) {
      log.completed = true;
      d.sessionsDone += 1;
    }
    d.days[date] = log;
  });
}

export function streak(s: State): { current: number; best: number } {
  const done = new Set(Object.values(s.days).filter((d) => d.completed).map((d) => d.date));
  let current = 0;
  let cursor = dayKey();
  if (!done.has(cursor)) cursor = addDays(cursor, -1); // la série n'est pas perdue avant la fin de la journée
  while (done.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...done].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current) };
}

export function exportData(): string {
  return JSON.stringify({ ...state, settings: { ...state.settings, apiKey: "", geminiKey: "" } }, null, 2);
}

/** Tout l'état (référence stable entre deux mises à jour). */
export function useAppState(): State {
  return useSyncExternalStore(subscribe, getState);
}

/** Abonnement aux modifications (utilisé par la synchronisation en ligne). */
export function subscribeStore(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
