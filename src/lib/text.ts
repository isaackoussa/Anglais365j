/** Normalise une réponse pour la comparer : minuscules, apostrophes, ponctuation. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\(.*?\)/g, "")
    .replace(/[.,!?;:"«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export type Verdict = "exact" | "close" | "wrong";

/** Accepte une petite faute de frappe (1 lettre pour les mots courts, 2 au-delà). */
export function check(input: string, answers: string[]): Verdict {
  const a = normalize(input);
  if (!a) return "wrong";
  let best: Verdict = "wrong";
  for (const raw of answers) {
    for (const variant of raw.split("/")) {
      const b = normalize(variant);
      if (!b) continue;
      if (a === b) return "exact";
      const tolerance = b.length <= 4 ? 0 : b.length <= 8 ? 1 : 2;
      if (levenshtein(a, b) <= tolerance) best = "close";
    }
  }
  return best;
}

/** Similarité 0..1 entre deux phrases (au niveau des mots) — pour la dictée et la prononciation. */
export function similarity(a: string, b: string): number {
  const wa = normalize(a).split(" ").filter(Boolean);
  const wb = normalize(b).split(" ").filter(Boolean);
  if (!wb.length) return 0;
  const dist = levenshteinArr(wa, wb);
  return Math.max(0, 1 - dist / Math.max(wa.length, wb.length));
}

function levenshteinArr(a: string[], b: string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Diff mot à mot pour afficher les erreurs de dictée. */
export function wordDiff(expected: string, got: string): { word: string; ok: boolean }[] {
  const e = expected.split(/\s+/).filter(Boolean);
  const g = new Set(normalize(got).split(" "));
  return e.map((word) => ({ word, ok: g.has(normalize(word)) }));
}
