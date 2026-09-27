import { describe, expect, it } from "vitest";
import { addDays } from "../lib/date";
import { mastery, newProgress, schedule } from "../lib/srs";

const T = "2026-01-10";

describe("répétition espacée", () => {
  it("espace les révisions quand on répond bien", () => {
    let p = newProgress("x", T);
    p = schedule(p, 2, T);
    expect(p.interval).toBe(1);
    p = schedule(p, 2, p.due);
    expect(p.interval).toBe(6);
    p = schedule(p, 2, p.due);
    expect(p.interval).toBeGreaterThanOrEqual(14);
    expect(mastery(p)).toBe("known");
  });

  it("remet le mot à demain après un oubli", () => {
    let p = schedule(schedule(newProgress("x", T), 2, T), 2, T);
    p = schedule(p, 0, T);
    expect(p.interval).toBe(1);
    expect(p.due).toBe(addDays(T, 1));
    expect(p.lapses).toBe(1);
    expect(p.ease).toBeLessThan(2.5);
  });

  it("atteint le statut « maîtrisé » après plusieurs réussites", () => {
    let p = newProgress("x", T);
    for (let i = 0; i < 5; i++) p = schedule(p, 3, p.due);
    expect(mastery(p)).toBe("mastered");
  });
});
