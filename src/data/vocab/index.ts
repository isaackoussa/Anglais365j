import type { Level, Word } from "../types";
import a1 from "./a1";
import a2 from "./a2";
import b1 from "./b1";
import b2 from "./b2";
import c1 from "./c1";

const RAW: Record<Level, string> = { A1: a1, A2: a2, B1: b1, B2: b2, C1: c1 };

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parse(level: Level, raw: string, seen: Set<string>): Word[] {
  const out: Word[] = [];
  let theme = "Général";
  for (const line of raw.split("\n")) {
    const l = line.trim();
    if (!l) continue;
    if (l.startsWith("#")) {
      theme = l.slice(1).trim();
      continue;
    }
    const [en, fr, ex] = l.split("|").map((s) => s.trim());
    if (!en || !fr) continue;
    const id = slug(en);
    if (seen.has(id)) continue; // un mot n'apparaît qu'une fois dans tout le programme
    seen.add(id);
    out.push({ id, en, fr, ex: ex ?? "", level, theme });
  }
  return out;
}

const seen = new Set<string>();
export const WORDS: Word[] = (Object.keys(RAW) as Level[]).flatMap((lv) => parse(lv, RAW[lv], seen));
export const WORDS_BY_ID: Map<string, Word> = new Map(WORDS.map((w) => [w.id, w]));
export const THEMES: string[] = [...new Set(WORDS.map((w) => w.theme))];
