import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Empty, LevelBadge, Modal, SpeakButton, toast } from "../components/ui";
import { LEVELS, type Level, type Word } from "../data/types";
import { addCustomWord, removeCustomWord, resetWord } from "../lib/actions";
import { allWords } from "../lib/curriculum";
import { dayKey, diffDays, formatShort } from "../lib/date";
import { startDrill } from "../lib/drill";
import { MASTERY_LABEL, mastery, type Mastery } from "../lib/srs";
import { useAppState } from "../lib/store";
import { normalize } from "../lib/text";

type Filter = "learned" | "due" | "learning" | "known" | "mastered" | "custom" | "upcoming";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "learned", label: "Tous mes mots" },
  { id: "due", label: "À revoir" },
  { id: "learning", label: "En cours" },
  { id: "known", label: "Acquis" },
  { id: "mastered", label: "Maîtrisés" },
  { id: "custom", label: "Ajoutés par moi" },
  { id: "upcoming", label: "À venir" },
];

const MASTERY_COLOR: Record<Mastery, string> = {
  new: "var(--ink-3)",
  learning: "var(--warning)",
  known: "var(--brand)",
  mastered: "var(--success)",
};

export function Words() {
  const s = useAppState();
  const today = dayKey();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("learned");
  const [level, setLevel] = useState<Level | "all">("all");
  const [sort, setSort] = useState<"recent" | "alpha" | "weak" | "due">("recent");
  const [limit, setLimit] = useState(120);
  const [open, setOpen] = useState<Word | null>(null);
  const [adding, setAdding] = useState(false);

  const words = allWords(s);
  const counts = useMemo(() => {
    const c = { learned: 0, due: 0, learning: 0, known: 0, mastered: 0 };
    for (const p of Object.values(s.words)) {
      c.learned++;
      if (p.due <= today) c.due++;
      const m = mastery(p);
      if (m !== "new") c[m]++;
    }
    return c;
  }, [s.words, today]);

  const list = useMemo(() => {
    const nq = normalize(q);
    let l = words.filter((w) => {
      const p = s.words[w.id];
      switch (filter) {
        case "learned":
          if (!p) return false;
          break;
        case "due":
          if (!p || p.due > today) return false;
          break;
        case "custom":
          if (!w.custom) return false;
          break;
        case "upcoming":
          if (p) return false;
          break;
        default:
          if (!p || mastery(p) !== filter) return false;
      }
      if (level !== "all" && w.level !== level) return false;
      if (nq && !normalize(w.en).includes(nq) && !normalize(w.fr).includes(nq)) return false;
      return true;
    });
    if (filter !== "upcoming") {
      l = [...l].sort((a, b) => {
        const pa = s.words[a.id];
        const pb = s.words[b.id];
        if (sort === "alpha") return a.en.localeCompare(b.en);
        if (sort === "weak") return (pb?.lapses ?? 0) - (pa?.lapses ?? 0) || (pa?.interval ?? 0) - (pb?.interval ?? 0);
        if (sort === "due") return (pa?.due ?? "").localeCompare(pb?.due ?? "");
        return (pb?.learnedOn ?? "").localeCompare(pa?.learnedOn ?? "");
      });
    }
    return l;
  }, [words, s.words, filter, level, q, sort, today]);

  return (
    <div className="container">
      <div className="page-head">
        <div className="row between wrap">
          <div>
            <h1>Mon répertoire</h1>
            <p>Tous les mots que tu as appris, leur niveau de mémorisation et leur prochaine révision.</p>
          </div>
          <button className="btn primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Ajouter un mot
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 8 }}>
        <MasteryTile label="À revoir aujourd'hui" value={counts.due} color="var(--accent)" onClick={() => setFilter("due")} />
        <MasteryTile label="En cours" value={counts.learning} color={MASTERY_COLOR.learning} onClick={() => setFilter("learning")} />
        <MasteryTile label="Acquis" value={counts.known} color={MASTERY_COLOR.known} onClick={() => setFilter("known")} />
        <MasteryTile label="Maîtrisés" value={counts.mastered} color={MASTERY_COLOR.mastered} onClick={() => setFilter("mastered")} />
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input className="input" placeholder="Rechercher un mot (anglais ou français)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Trier">
          <option value="recent">Plus récents</option>
          <option value="alpha">A → Z</option>
          <option value="weak">Plus fragiles</option>
          <option value="due">Prochaine révision</option>
        </select>
        <div className="segmented" style={{ width: "100%" }}>
          {FILTERS.map((f) => (
            <button key={f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className={`chip ${level === "all" ? "on" : ""}`} onClick={() => setLevel("all")}>
            Tous niveaux
          </button>
          {LEVELS.map((lv) => (
            <button key={lv} className={`chip ${level === lv ? "on" : ""}`} onClick={() => setLevel(lv)}>
              {lv}
            </button>
          ))}
          <span className="grow" />
          {list.length > 0 && filter !== "upcoming" && (
            <button className="btn soft sm" onClick={() => startDrill(list.slice(0, 20), `Révision : ${FILTERS.find((f) => f.id === filter)!.label}`)}>
              <Icon name="play" size={14} fill /> Réviser {Math.min(20, list.length)} mots
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty icon="words" title={counts.learned === 0 ? "Ton répertoire est vide" : "Aucun mot ici"}>
          <p>{counts.learned === 0 ? "Lance ta première session : chaque mot appris viendra se ranger ici." : "Essaie un autre filtre ou une autre recherche."}</p>
        </Empty>
      ) : (
        <div className="word-list">
          <p className="faint small">
            {list.length} mot{list.length > 1 ? "s" : ""}
          </p>
          {list.slice(0, limit).map((w) => (
            <WordRow key={w.id} word={w} onOpen={() => setOpen(w)} />
          ))}
          {list.length > limit && (
            <button className="btn outline" onClick={() => setLimit(limit + 200)}>
              Afficher plus ({list.length - limit} restants)
            </button>
          )}
        </div>
      )}

      {open && <WordDetail word={open} onClose={() => setOpen(null)} />}
      {adding && <AddWord onClose={() => setAdding(false)} />}
    </div>
  );
}

function MasteryTile({ label, value, color, onClick }: { label: string; value: number; color: string; onClick: () => void }) {
  return (
    <button className="stat" style={{ textAlign: "left", cursor: "pointer" }} onClick={onClick}>
      <div className="value" style={{ color }}>
        {value}
      </div>
      <div className="label">{label}</div>
    </button>
  );
}

function MasteryDots({ m }: { m: Mastery }) {
  const n = { new: 0, learning: 1, known: 2, mastered: 3 }[m];
  return (
    <div className="mastery-dots" title={MASTERY_LABEL[m]} style={{ ["--m" as string]: MASTERY_COLOR[m] }}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < n ? "on" : ""} />
      ))}
    </div>
  );
}

function relative(due: string, today: string): string {
  const d = diffDays(due, today);
  if (d <= 0) return "à revoir";
  if (d === 1) return "demain";
  if (d < 30) return `dans ${d} j`;
  return `dans ${Math.round(d / 30)} mois`;
}

function WordRow({ word, onOpen }: { word: Word; onOpen: () => void }) {
  const s = useAppState();
  const p = s.words[word.id];
  const m = mastery(p);
  const today = dayKey();
  return (
    <div className="word-row" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <SpeakButton text={word.en} size="sm" />
      <div style={{ minWidth: 0 }}>
        <div className="en">{word.en}</div>
        <div className="fr">{word.fr}</div>
      </div>
      <div className="row hide-sm" style={{ gap: 10 }}>
        <LevelBadge level={word.custom ? "+" : word.level} />
        {p && <span className={`chip ${p.due <= today ? "accent" : ""}`}>{relative(p.due, today)}</span>}
      </div>
      {p ? <MasteryDots m={m} /> : <Icon name="lock" size={16} className="faint" />}
    </div>
  );
}

function WordDetail({ word, onClose }: { word: Word; onClose: () => void }) {
  const s = useAppState();
  const p = s.words[word.id];
  const m = mastery(p);
  const rate = p && p.seen ? Math.round((p.correct / p.seen) * 100) : null;
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <div className="row between">
          <div className="row" style={{ gap: 8 }}>
            <LevelBadge level={word.custom ? "+" : word.level} />
            <span className="chip">{word.theme}</span>
          </div>
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="row">
          <SpeakButton text={word.en} />
          <div>
            <h2 style={{ fontSize: 34 }}>{word.en}</h2>
            <div style={{ color: "var(--brand-ink)", fontWeight: 650, fontSize: 18 }}>{word.fr}</div>
          </div>
        </div>
        {word.ex && (
          <div className="card flat pad-sm row">
            <SpeakButton text={word.ex} size="sm" />
            <i>{word.ex}</i>
          </div>
        )}
        {p ? (
          <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Info label="Statut" value={<span style={{ color: MASTERY_COLOR[m] }}>{MASTERY_LABEL[m]}</span>} />
            <Info label="Prochaine révision" value={relative(p.due, dayKey())} />
            <Info label="Appris le" value={formatShort(p.learnedOn)} />
            <Info label="Réussite" value={rate === null ? "—" : `${rate}% (${p.seen} fois)`} />
          </div>
        ) : (
          <p className="muted small">Ce mot arrivera bientôt dans ton programme.</p>
        )}
        <div className="row wrap">
          {p && (
            <button className="btn soft" onClick={() => startDrill([word], `Révision : ${word.en}`)}>
              <Icon name="play" size={14} fill /> Réviser
            </button>
          )}
          {p && (
            <button
              className="btn outline"
              onClick={() => {
                resetWord(word.id);
                toast("Le mot reviendra dans ta prochaine révision");
              }}
            >
              <Icon name="refresh" size={16} /> Réapprendre
            </button>
          )}
          {word.custom && (
            <button
              className="btn danger"
              onClick={() => {
                removeCustomWord(word.id);
                onClose();
                toast("Mot supprimé");
              }}
            >
              <Icon name="trash" size={16} /> Supprimer
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, background: "var(--surface-2)" }}>
      <div className="tiny faint">{label}</div>
      <div className="bold">{value}</div>
    </div>
  );
}

export function AddWord({ onClose, initial }: { onClose: () => void; initial?: { en: string; fr: string } }) {
  const [en, setEn] = useState(initial?.en ?? "");
  const [fr, setFr] = useState(initial?.fr ?? "");
  const [ex, setEx] = useState("");
  const submit = () => {
    const w = addCustomWord(en, fr, ex);
    if (w) {
      toast(`« ${w.en} » ajouté à ton répertoire`);
      onClose();
    } else toast("Ce mot existe déjà ou un champ est vide");
  };
  return (
    <Modal onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="row between">
          <h2 style={{ fontSize: 24 }}>Ajouter un mot</h2>
          <button type="button" className="btn ghost icon sm" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <p className="muted small">Un mot croisé dans une série, un livre, au travail ? Il entrera dans tes révisions espacées.</p>
        <label className="field">
          Mot ou expression en anglais
          <input className="input" value={en} onChange={(e) => setEn(e.target.value)} autoFocus lang="en" placeholder="ex : to take for granted" />
        </label>
        <label className="field">
          Traduction
          <input className="input" value={fr} onChange={(e) => setFr(e.target.value)} placeholder="ex : considérer comme acquis" />
        </label>
        <label className="field">
          <span>
            Phrase d'exemple <span className="hint">(facultatif)</span>
          </span>
          <input className="input" value={ex} onChange={(e) => setEx(e.target.value)} lang="en" />
        </label>
        <button className="btn primary lg" type="submit" disabled={!en.trim() || !fr.trim()}>
          Ajouter au répertoire
        </button>
      </form>
    </Modal>
  );
}
