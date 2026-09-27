import { useCallback, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Bar, Empty, ProgressRing } from "../components/ui";
import { LESSONS_BY_ID } from "../data/grammar";
import type { Word } from "../data/types";
import { dueWords, findWord, sample, shuffle } from "../lib/curriculum";
import { startDrill, startModeDrill, takeDrill, type Drill } from "../lib/drill";
import { navigate } from "../lib/router";
import { useAppState } from "../lib/store";
import type { WordQuestionKind } from "../components/exercises";
import { ExercisesRun, ListeningStep, RecapStep, ReviewStep, SpeakingStep, buildRecap, type StepProps } from "./steps";

export function Review() {
  const s = useAppState();
  const due = dueWords(s);
  const learned = Object.values(s.words);
  const weak = learned.filter((p) => p.lapses > 0).sort((a, b) => b.lapses - a.lapses);
  const themes = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of learned) {
      const w = findWord(s, p.id);
      if (w) m.set(w.theme, (m.get(w.theme) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learned.length]);

  const learnedWords = (): Word[] => learned.map((p) => findWord(s, p.id)).filter((w): w is Word => !!w);
  const none = learned.length === 0;

  const modes: { icon: string; title: string; desc: string; mode: Drill["mode"]; tint: string }[] = [
    { icon: "layers", title: "Flashcards", desc: "Retourne les cartes et évalue-toi", mode: "flash", tint: "brand" },
    { icon: "keyboard", title: "Écriture", desc: "Écris le mot anglais à partir du français", mode: "type", tint: "success" },
    { icon: "headphones", title: "Écoute", desc: "Reconnais les mots à l'oreille", mode: "listen", tint: "accent" },
    { icon: "file", title: "Dictée", desc: "Écris des phrases entières entendues", mode: "dictation", tint: "warning" },
    { icon: "mic", title: "Prononciation", desc: "Parle, l'app t'écoute et te note", mode: "speaking", tint: "brand" },
  ];

  return (
    <div className="container stack-lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Réviser</h1>
        <p>La répétition espacée te présente chaque mot juste avant que tu l'oublies. Tout ce que tu as appris repasse régulièrement.</p>
      </div>

      {none ? (
        <div className="card">
          <Empty icon="repeat" title="Rien à réviser pour l'instant">
            <p style={{ marginBottom: 16 }}>Fais ta première session pour remplir ton répertoire.</p>
            <button className="btn primary" onClick={() => navigate("/session")}>
              Commencer la session du jour
            </button>
          </Empty>
        </div>
      ) : (
        <>
          <div className="grid-2">
            <div className="card stack" style={{ background: "linear-gradient(150deg, var(--brand-soft), var(--surface) 70%)" }}>
              <div className="row between">
                <div>
                  <div className="eyebrow">Révisions du jour</div>
                  <h2 style={{ fontSize: 30, marginTop: 6 }}>{due.length ? `${due.length} mot${due.length > 1 ? "s" : ""} à revoir` : "Tu es à jour ✓"}</h2>
                </div>
                <ProgressRing value={learned.length ? 1 - due.length / learned.length : 1} size={76} stroke={9}>
                  <Icon name="repeat" size={22} />
                </ProgressRing>
              </div>
              <p className="muted small">
                {due.length ? "Ces mots arrivent au moment idéal pour s'ancrer dans ta mémoire à long terme." : "Aucun mot n'est dû. Tu peux faire le grand tour ou t'entraîner librement."}
              </p>
              <button className="btn primary lg" disabled={!due.length} onClick={() => startDrill(due.slice(0, 40), "Révisions du jour")}>
                <Icon name="play" size={16} fill /> Réviser maintenant
              </button>
            </div>
            <div className="card stack" style={{ background: "linear-gradient(150deg, var(--accent-soft), var(--surface) 70%)" }}>
              <div>
                <div className="eyebrow">Le grand tour</div>
                <h2 style={{ fontSize: 30, marginTop: 6 }}>Tout ce que tu as vu</h2>
              </div>
              <p className="muted small">
                Un mélange de 15 mots piochés dans tout ton répertoire et d'exercices de grammaire des leçons déjà faites. Idéal pour vérifier que rien ne
                s'efface.
              </p>
              <button className="btn accent lg" onClick={() => startModeDrill("mix", "Le grand tour", sample(learnedWords(), 15))}>
                <Icon name="shuffle" size={16} /> Lancer le grand tour
              </button>
            </div>
          </div>

          <section>
            <div className="section-title">
              <h2>Modes d'entraînement</h2>
            </div>
            <div className="grid-auto">
              {modes.map((m) => (
                <button
                  key={m.title}
                  className="card interactive"
                  style={{ textAlign: "left" }}
                  onClick={() => startModeDrill(m.mode, m.title, m.mode === "dictation" || m.mode === "speaking" ? undefined : sample(learnedWords(), 12))}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: `var(--${m.tint}-soft)`,
                      color: `var(--${m.tint})`,
                      marginBottom: 14,
                    }}
                  >
                    <Icon name={m.icon} size={22} />
                  </div>
                  <h3 style={{ fontSize: 18 }}>{m.title}</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>
                    {m.desc}
                  </p>
                </button>
              ))}
              {weak.length > 0 && (
                <button
                  className="card interactive"
                  style={{ textAlign: "left" }}
                  onClick={() =>
                    startDrill(
                      weak.slice(0, 15).map((p) => findWord(s, p.id)).filter((w): w is Word => !!w),
                      "Mes mots fragiles",
                    )
                  }
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                      marginBottom: 14,
                    }}
                  >
                    <Icon name="target" size={22} />
                  </div>
                  <h3 style={{ fontSize: 18 }}>Mots fragiles</h3>
                  <p className="muted small" style={{ marginTop: 4 }}>
                    Les {Math.min(15, weak.length)} mots que tu oublies le plus souvent
                  </p>
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Par thème</h2>
              <span className="faint small">{themes.length} thèmes</span>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              {themes.map(([t, n]) => (
                <button
                  key={t}
                  className="chip"
                  style={{ height: 36, padding: "0 14px" }}
                  onClick={() =>
                    startDrill(
                      shuffle(learnedWords().filter((w) => w.theme === t)).slice(0, 15),
                      `Thème : ${t}`,
                    )
                  }
                >
                  {t} <span className="faint">{n}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————
// Exécution d'une séance ponctuelle
// ————————————————————————————————————————————————

const KINDS: Partial<Record<NonNullable<Drill["mode"]>, WordQuestionKind[]>> = {
  flash: ["flash"],
  type: ["type"],
  listen: ["listen", "spell"],
};

export function DrillPage() {
  const [drill] = useState(() => takeDrill());
  const [inner, setInner] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const [phase, setPhase] = useState(0); // grand tour : 0 = mots, 1 = grammaire
  const [run, setRun] = useState(0);
  const recap = useRef(buildRecap(new Set(), 0, 5));
  const acc = useRef({ correct: 0, total: 0 });

  const onProgress = useCallback((f: number) => setInner(f), []);
  const lessonExercises = useMemo(() => {
    const lesson = drill?.lessonId ? LESSONS_BY_ID.get(drill.lessonId) : undefined;
    return lesson ? shuffle(lesson.exercises) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  if (!drill) {
    navigate("/review");
    return null;
  }

  const isTour = drill.mode === "mix" && drill.title === "Le grand tour" && recap.current.length > 0;
  const finish: StepProps["onComplete"] = (r) => {
    acc.current.correct += r.correct;
    acc.current.total += r.total;
    if (isTour && phase === 0) {
      setPhase(1);
      setInner(0);
      return;
    }
    setResult({ ...acc.current });
  };

  const progress = result ? 1 : isTour ? (phase + inner) / 2 : inner;

  let body: React.ReactNode;
  if (result) {
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 100;
    body = (
      <div className="stack-lg center rise" style={{ alignItems: "center", paddingTop: 32 }}>
        <ProgressRing value={pct / 100} size={150} stroke={14} color="var(--success)">
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800 }}>{pct}%</div>
        </ProgressRing>
        <div>
          <h1 style={{ fontSize: 30 }}>{pct >= 80 ? "Excellent travail !" : pct >= 50 ? "Bien joué !" : "Continue, ça rentre !"}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {result.correct} bonne{result.correct > 1 ? "s" : ""} réponse{result.correct > 1 ? "s" : ""} sur {result.total}
          </p>
        </div>
        <div className="stack-sm" style={{ width: "100%", maxWidth: 380 }}>
          <button
            className="btn primary lg block"
            onClick={() => {
              acc.current = { correct: 0, total: 0 };
              recap.current = buildRecap(new Set(), 0, 5);
              setPhase(0);
              setResult(null);
              setInner(0);
              setRun(run + 1);
            }}
          >
            <Icon name="refresh" size={18} /> Recommencer
          </button>
          <button className="btn ghost lg block" onClick={() => navigate("/review")}>
            Retour aux révisions
          </button>
        </div>
      </div>
    );
  } else if (drill.lessonId) {
    body = <ExercisesRun key={run} exercises={lessonExercises} onProgress={onProgress} onComplete={finish} />;
  } else if (drill.mode === "dictation") {
    body = <ListeningStep key={run} count={8} onProgress={onProgress} onComplete={finish} />;
  } else if (drill.mode === "speaking") {
    body = <SpeakingStep key={run} count={6} onProgress={onProgress} onComplete={finish} />;
  } else if (isTour && phase === 1) {
    body = <RecapStep key={`r${run}`} items={recap.current} onProgress={onProgress} onComplete={finish} />;
  } else {
    const words = run === 0 ? drill.words ?? [] : shuffle(drill.words ?? []);
    body = words.length ? (
      <ReviewStep key={run} words={words} kinds={drill.mode ? KINDS[drill.mode] : undefined} onProgress={onProgress} onComplete={finish} />
    ) : (
      <Empty icon="words" title="Aucun mot à réviser" />
    );
  }

  return (
    <div className="session">
      <div className="session-top">
        <button
          className="btn ghost icon"
          onClick={() => {
            window.speechSynthesis?.cancel();
            navigate("/review");
          }}
          aria-label="Quitter"
        >
          <Icon name="x" />
        </button>
        <Bar value={progress} color="linear-gradient(90deg, var(--brand), var(--brand-2))" />
        <span className="chip brand hide-xs" style={{ flex: "none" }}>
          {drill.title}
        </span>
      </div>
      <div className="session-body">{body}</div>
    </div>
  );
}
