import type { GrammarLesson } from "../types";
import { A1_A2 } from "./a1a2";
import { B1 } from "./b1";
import { B2_C1 } from "./b2c1";

export const LESSONS: GrammarLesson[] = [...A1_A2, ...B1, ...B2_C1];
export const LESSONS_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
