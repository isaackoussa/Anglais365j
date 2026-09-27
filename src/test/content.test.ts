import { describe, expect, it } from "vitest";
import { LESSONS } from "../data/grammar";
import { READINGS } from "../data/readings";
import { WORDS } from "../data/vocab";
import { normalize } from "../lib/text";

describe("intégrité du contenu pédagogique", () => {
  it("a un vocabulaire conséquent et sans doublon", () => {
    expect(WORDS.length).toBeGreaterThan(900);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    for (const w of WORDS) expect(w.fr, w.en).toBeTruthy();
  });

  it("a des exercices de grammaire valides", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(l.exercises.length, l.id).toBeGreaterThanOrEqual(3);
      for (const ex of l.exercises) {
        if (ex.kind === "mcq") expect(ex.options[ex.answer], `${l.id}: ${ex.prompt}`).toBeDefined();
        if (ex.kind === "gap") {
          expect(ex.prompt.split("___").length, `${l.id}: ${ex.prompt}`).toBe(2);
          expect(ex.answer.length).toBeGreaterThan(0);
        }
        if (ex.kind === "order") {
          const words = normalize(ex.words.join(" ")).split(" ").sort().join(" ");
          const answer = normalize(ex.answer).split(" ").sort().join(" ");
          expect(answer, `${l.id}: ${ex.answer}`).toBe(words);
        }
      }
    }
  });

  it("a des lectures avec des questions valides", () => {
    for (const r of READINGS) for (const q of r.questions) expect(q.options[q.answer], `${r.id}: ${q.q}`).toBeDefined();
  });
});
