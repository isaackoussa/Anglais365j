import { describe, expect, it } from "vitest";
import { check, similarity } from "../lib/text";

describe("vérification des réponses", () => {
  it("accepte les variantes et ignore la casse / ponctuation", () => {
    expect(check("  Is ", ["is", "'s"])).toBe("exact");
    expect(check("hasn’t", ["hasn't"])).toBe("exact");
    expect(check("voyage", ["trajet / voyage"])).toBe("exact");
  });
  it("tolère une petite faute sur les mots longs, pas sur les courts", () => {
    expect(check("luggadge", ["luggage"])).toBe("close");
    expect(check("iz", ["is"])).toBe("wrong");
  });
  it("mesure la similarité d'une dictée", () => {
    expect(similarity("I love to travel by train", "I love to travel by train.")).toBe(1);
    expect(similarity("I love travel by train", "I love to travel by train")).toBeGreaterThan(0.8);
  });
});
