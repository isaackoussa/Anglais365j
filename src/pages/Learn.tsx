import { useCallback, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { Bar, LevelBadge, ProgressRing, toast } from "../components/ui";
import { LESSONS, LESSONS_BY_ID } from "../data/grammar";
import { READINGS } from "../data/readings";
import { LEVELS, type Reading } from "../data/types";
import { friendlyError, generateReading, hasApiKey } from "../lib/ai";
import { LEVEL_INFO, inProgram, nextLesson, nextReading } from "../lib/curriculum";
import { navigate } from "../lib/router";
import { useAppState } from "../lib/store";
import { GrammarStep, ReadingStep, type StepProps } from "./steps";

let aiReading: Reading | null = null;

export function Learn() {
  const s = useAppState();
  const [tab, setTab] = useState<"grammar" | "reading">("grammar");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const next = nextLesson(s);
  const nextR = nextReading(s);

  const generate = async () => {
    setLoading(true);
    try {
      aiReading = await generateReading(topic.trim());
      navigate("/reading/ai");
    } catch (e) {
      toast(friendlyError(e) || "Génération interrompue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container stack-lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Cours</h1>
        <p>Toutes les leçons de grammaire et les lectures, de A1 à C1. Le programme du jour t'en propose une à la fois, mais tu peux explorer librement.</p>
      </div>
      <div className="segmented">
        <button className={tab === "grammar" ? "on" : ""} onClick={() => setTab("grammar")}>
          <Icon name="book" size={15} /> Grammaire · {LESSONS.length}
        </button>
        <button className={tab === "reading" ? "on" : ""} onClick={() => setTab("reading")}>
          <Icon name="file" size={15} /> Lectures · {READINGS.length}
        </button>
      </div>

      {tab === "grammar" ? (
        LEVELS.map((lv) => {
          const lessons = LESSONS.filter((l) => l.level === lv);
          const done = lessons.filter((l) => s.grammarDone[l.id]).length;
          return (
            <section key={lv} style={{ opacity: inProgram(s, lv) ? 1 : 0.7 }}>
              <div className="section-title">
                <div className="row">
                  <LevelBadge level={lv} />
                  <h2>{LEVEL_INFO[lv].name}</h2>
                </div>
                <span className="faint small">
                  {done}/{lessons.length} leçons
                </span>
              </div>
              <div className="grid-auto">
                {lessons.map((l) => {
                  const d = s.grammarDone[l.id];
                  const isNext = next?.id === l.id;
                  return (
                    <button
                      key={l.id}
                      className="card interactive pad-sm"
                      style={{
                        textAlign: "left",
                        borderColor: isNext ? `var(--lv-${lv.toLowerCase()})` : undefined,
                        borderWidth: isNext ? 2 : 1,
                      }}
                      onClick={() => navigate(`/lesson/${l.id}`)}
                    >
                      <div className="row between" style={{ marginBottom: 8 }}>
                        {d ? (
                          <span className="chip success">
                            <Icon name="check" size={13} stroke={3} /> {Math.round(d.score * 100)}%
                          </span>
                        ) : isNext ? (
                          <span className="chip brand">Prochaine leçon</span>
                        ) : (
                          <span className="chip">{l.exercises.length} exercices</span>
                        )}
                        <Icon name="chevronRight" size={18} className="faint" />
                      </div>
                      <h3 style={{ fontSize: 17 }}>{l.title}</h3>
                      <p className="muted small" style={{ marginTop: 4 }}>
                        {l.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      ) : (
        <>
          <div className="card stack" style={{ background: "linear-gradient(150deg, var(--brand-soft), var(--surface) 70%)" }}>
            <div className="row">
              <Icon name="sparkles" />
              <h2 style={{ fontSize: 20 }}>Texte sur mesure avec l'IA</h2>
            </div>
            <p className="muted small">
              Choisis un sujet qui te passionne : le coach écrit un texte à ton niveau, qui réutilise tes mots récents, avec questions de compréhension.
            </p>
            {hasApiKey() ? (
              <form
                className="row wrap"
                onSubmit={(e) => {
                  e.preventDefault();
                  generate();
                }}
              >
                <input className="input grow" style={{ minWidth: 220 }} placeholder="Sujet (ex : le football, l'espace, la cuisine japonaise…)" value={topic} onChange={(e) => setTopic(e.target.value)} />
                <button className="btn primary" disabled={loading}>
                  {loading ? "Écriture en cours…" : "Générer"}
                </button>
              </form>
            ) : (
              <button className="btn soft" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/coach")}>
                Activer le coach IA
              </button>
            )}
          </div>
          {LEVELS.map((lv) => {
            const list = READINGS.filter((r) => r.level === lv);
            return (
              <section key={lv}>
                <div className="section-title">
                  <div className="row">
                    <LevelBadge level={lv} />
                    <h2>{LEVEL_INFO[lv].name}</h2>
                  </div>
                </div>
                <div className="grid-auto">
                  {list.map((r) => {
                    const d = s.readingsDone[r.id];
                    return (
                      <button key={r.id} className="card interactive pad-sm" style={{ textAlign: "left" }} onClick={() => navigate(`/reading/${r.id}`)}>
                        <div className="row between" style={{ marginBottom: 8 }}>
                          {d ? (
                            <span className="chip success">
                              <Icon name="check" size={13} stroke={3} /> {Math.round(d.score * 100)}%
                            </span>
                          ) : nextR?.id === r.id ? (
                            <span className="chip brand">Prochaine lecture</span>
                          ) : (
                            <span className="chip">~{Math.round(r.text.split(/\s+/).length / 120) + 1} min</span>
                          )}
                          <Icon name="chevronRight" size={18} className="faint" />
                        </div>
                        <h3 style={{ fontSize: 17 }}>{r.title}</h3>
                        <p className="muted small" style={{ marginTop: 4 }}>
                          {r.text.slice(0, 90)}…
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————
// Leçon / lecture en plein écran
// ————————————————————————————————————————————————

function Shell({ title, back, children }: { title: string; back: string; children: (p: StepProps) => ReactNode }) {
  const [inner, setInner] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [run, setRun] = useState(0);
  const onProgress = useCallback((f: number) => setInner(f), []);
  const onComplete = useCallback((r: { correct: number; total: number }) => setResult(r), []);
  const pct = result && result.total ? Math.round((result.correct / result.total) * 100) : 100;
  return (
    <div className="session">
      <div className="session-top">
        <button
          className="btn ghost icon"
          aria-label="Retour"
          onClick={() => {
            window.speechSynthesis?.cancel();
            navigate(back);
          }}
        >
          <Icon name="x" />
        </button>
        <Bar value={result ? 1 : inner} color="linear-gradient(90deg, var(--brand), var(--brand-2))" />
        <span className="chip brand hide-xs" style={{ flex: "none", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </span>
      </div>
      <div className="session-body">
        {result ? (
          <div className="stack-lg center rise" style={{ alignItems: "center", paddingTop: 32 }}>
            <ProgressRing value={pct / 100} size={150} stroke={14} color="var(--success)">
              <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800 }}>{pct}%</div>
            </ProgressRing>
            <div>
              <h1 style={{ fontSize: 30 }}>{pct >= 80 ? "Notion maîtrisée !" : pct >= 50 ? "C'est en bonne voie !" : "À revoir un peu"}</h1>
              <p className="muted" style={{ marginTop: 6 }}>
                {result.correct}/{result.total} bonnes réponses. {pct < 80 ? "Relis la leçon et réessaie : la répétition fait tout." : "Elle reviendra dans « le tour » pour rester fraîche."}
              </p>
            </div>
            <div className="stack-sm" style={{ width: "100%", maxWidth: 380 }}>
              <button
                className="btn primary lg block"
                onClick={() => {
                  setResult(null);
                  setInner(0);
                  setRun(run + 1);
                }}
              >
                <Icon name="refresh" size={18} /> Refaire
              </button>
              <button className="btn ghost lg block" onClick={() => navigate(back)}>
                Retour aux cours
              </button>
            </div>
          </div>
        ) : (
          <div key={run}>{children({ onProgress, onComplete })}</div>
        )}
      </div>
    </div>
  );
}

export function LessonPage({ id }: { id: string }) {
  const lesson = LESSONS_BY_ID.get(id);
  if (!lesson) {
    navigate("/learn");
    return null;
  }
  return <Shell title={lesson.title} back="/learn">{(p) => <GrammarStep lesson={lesson} {...p} />}</Shell>;
}

export function ReadingPage({ id }: { id: string }) {
  const reading = id === "ai" ? aiReading : READINGS.find((r) => r.id === id);
  if (!reading) {
    navigate("/learn");
    return null;
  }
  return <Shell title={reading.title} back="/learn">{(p) => <ReadingStep reading={reading} {...p} />}</Shell>;
}
