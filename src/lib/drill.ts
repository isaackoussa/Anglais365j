import type { Word } from "../data/types";
import { navigate } from "./router";

/** Séance d'entraînement ponctuelle lancée depuis le répertoire, les cours, etc. */
export interface Drill {
  title: string;
  words?: Word[];
  lessonId?: string;
  mode?: "mix" | "flash" | "type" | "listen" | "dictation" | "speaking";
}

let pending: Drill | null = null;

export function startDrill(words: Word[], title: string, mode: Drill["mode"] = "mix") {
  pending = { title, words, mode };
  navigate(`/drill?t=${Date.now()}`);
}

export function startLessonDrill(lessonId: string, title: string) {
  pending = { title, lessonId };
  navigate(`/drill?t=${Date.now()}`);
}

export function startModeDrill(mode: Drill["mode"], title: string, words?: Word[]) {
  pending = { title, mode, words };
  navigate(`/drill?t=${Date.now()}`);
}

export function takeDrill(): Drill | null {
  return pending;
}
