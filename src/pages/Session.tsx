import { useCallback, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Bar, Confetti, ProgressRing } from "../components/ui";
import type { GrammarLesson, Reading, Word } from "../data/types";
import { XP } from "../lib/actions";
import { FOCUS_INFO, dueWords, focusForDay, nextLesson, nextNewWords, nextReading, programDay, type Focus } from "../lib/curriculum";
import { navigate } from "../lib/router";
import { getState, logActivity, streak, todayLog, type State } from "../lib/store";
import {
  GrammarStep,
  LearnStep,
  ListeningStep,
  ReadingStep,
  RecapStep,
  ReviewStep,
  SpeakingStep,
  WritingStep,
  buildRecap,
  type StepProps,
} from "./steps";

export type PlanStep =
  | { kind: "review"; title: string; icon: string; words: Word[] }
  | { kind: "learn"; title: string; icon: string; words: Word[] }
  | { kind: "grammar"; title: string; icon: string; lesson: GrammarLesson }
  | { kind: "reading"; title: string; icon: string; reading: Reading }
  | { kind: "listening" | "speaking" | "writing"; title: string; icon: string }
  | { kind: "recap"; title: string; icon: string; items: ReturnType<typeof buildRecap> };

const MAX_REVIEW = 40;

/** Construit le programme du jour : révisions → nouveaux mots → focus → tour de consolidation. */
export function buildPlan(s: State): PlanStep[] {
  const steps: PlanStep[] = [];
  const due = dueWords(s).slice(0, MAX_REVIEW);
  if (due.length) steps.push({ kind: "review", title: `${due.length} révision${due.length > 1 ? "s" : ""}`, icon: "repeat", words: due });

  const remaining = Math.max(0, s.profile.dailyNew - todayLog(s).newWords.length);
  const fresh = nextNewWords(s, remaining);
  if (fresh.length) steps.push({ kind: "learn", title: `${fresh.length} nouveaux mots`, icon: "sparkles", words: fresh });

  const focus: Focus = focusForDay(s);
  const info = FOCUS_INFO[focus];
  if (focus === "grammar") {
    const lesson = nextLesson(s);
    if (lesson) steps.push({ kind: "grammar", title: lesson.title, icon: info.icon, lesson });
  } else if (focus === "reading") {
    const reading = nextReading(s);
    if (reading) steps.push({ kind: "reading", title: reading.title, icon: info.icon, reading });
  } else {
    steps.push({ kind: focus, title: info.label, icon: info.icon });
  }

  const exclude = new Set([...due, ...fresh].map((w) => w.id));
  const recap = buildRecap(exclude);
  if (recap.length >= 2) steps.push({ kind: "recap", title: "Le tour de ce que tu sais", icon: "refresh", items: recap });
  return steps;
}

export function focusLabel(step: PlanStep): string {
  switch (step.kind) {
    case "review":
      return "Révision espacée";
    case "learn":
      return "Nouveaux mots";
    case "grammar":
      return "Grammaire";
    case "reading":
      return "Lecture";
    case "recap":
      return "Consolidation";
    default:
      return FOCUS_INFO[step.kind].label;
  }
}

export function Session() {
  const [plan] = useState(() => buildPlan(getState()));
  const [idx, setIdx] = useState(0);
  const [inner, setInner] = useState(0);
  const results = useRef({ correct: 0, total: 0 });
  const startXp = useRef(getState().xp);
  const startTime = useRef(Date.now());
  const day = useRef(programDay(getState()));
  const [finished, setFinished] = useState(plan.length === 0);

  const onProgress = useCallback((f: number) => setInner(f), []);
  const onComplete = useCallback<StepProps["onComplete"]>(
    (r) => {
      results.current.correct += r.correct;
      results.current.total += r.total;
      setInner(0);
      if (idx + 1 < plan.length) {
        setIdx(idx + 1);
        window.scrollTo({ top: 0 });
      } else {
        const minutes = Math.max(1, Math.round((Date.now() - startTime.current) / 60000));
        logActivity({ completed: true, minutes, addXp: XP.session, focus: plan.find((p) => !["review", "learn", "recap"].includes(p.kind))?.kind });
        setFinished(true);
      }
    },
    [idx, plan],
  );

  const progress = finished ? 1 : (idx + inner) / Math.max(1, plan.length);
  const step = plan[idx];

  const exit = () => {
    window.speechSynthesis?.cancel();
    if (finished || confirm("Quitter la session ? Tes réponses sont déjà enregistrées.")) navigate("/");
  };

  return (
    <div className="session">
      <div className="session-top">
        <button className="btn ghost icon" onClick={exit} aria-label="Quitter">
          <Icon name="x" />
        </button>
        <Bar value={progress} color="linear-gradient(90deg, var(--success), #4fd6a0)" />
        {!finished && step && (
          <span className="chip brand" style={{ flex: "none" }}>
            <Icon name={step.icon} size={14} />
            <span className="hide-xs">{focusLabel(step)}</span> {idx + 1}/{plan.length}
          </span>
        )}
      </div>
      <div className="session-body">
        {finished ? (
          <Summary
            empty={plan.length === 0}
            correct={results.current.correct}
            total={results.current.total}
            xp={getState().xp - startXp.current}
            day={day.current}
          />
        ) : (
          <StepRenderer key={idx} step={step} onProgress={onProgress} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

function StepRenderer({ step, ...props }: StepProps & { step: PlanStep }) {
  switch (step.kind) {
    case "review":
      return <ReviewStep words={step.words} {...props} />;
    case "learn":
      return <LearnStep words={step.words} {...props} />;
    case "grammar":
      return <GrammarStep lesson={step.lesson} {...props} />;
    case "reading":
      return <ReadingStep reading={step.reading} {...props} />;
    case "listening":
      return <ListeningStep {...props} />;
    case "speaking":
      return <SpeakingStep {...props} />;
    case "writing":
      return <WritingStep {...props} />;
    case "recap":
      return <RecapStep items={step.items} {...props} />;
  }
}

function Summary({ correct, total, xp, day, empty }: { correct: number; total: number; xp: number; day: number; empty: boolean }) {
  const s = getState();
  const st = useMemo(() => streak(s), [s]);
  const acc = total ? correct / total : 1;
  const log = todayLog(s);
  const mood = acc >= 0.9 ? "Session brillante ! 🌟" : acc >= 0.7 ? "Très belle session ! 💪" : "Session terminée, bravo pour l'effort ! 🌱";
  return (
    <div className="stack-lg center" style={{ alignItems: "center", paddingTop: 24 }}>
      <Confetti run={!empty} />
      <div className="bounce-in">
        <ProgressRing value={acc} size={160} stroke={14} color="var(--success)">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{Math.round(acc * 100)}%</div>
            <div className="faint tiny">de réussite</div>
          </div>
        </ProgressRing>
      </div>
      <div className="rise">
        <div className="eyebrow">Jour {day} terminé</div>
        <h1 style={{ fontSize: 34, marginTop: 6 }}>{empty ? "Rien à réviser pour l'instant" : mood}</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          {empty ? "Tu es à jour ! Reviens demain ou continue dans « Réviser »." : "Ta progression est enregistrée. Les mots reviendront au bon moment pour s'ancrer."}
        </p>
      </div>
      <div className="rise" style={{ width: "100%", animationDelay: "0.1s", display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="stat">
          <div className="value" style={{ color: "var(--warning)" }}>+{xp}</div>
          <div className="label">XP gagnés</div>
        </div>
        <div className="stat">
          <div className="value" style={{ color: "var(--accent)" }}>🔥 {st.current}</div>
          <div className="label">jour{st.current > 1 ? "s" : ""} d'affilée</div>
        </div>
        <div className="stat">
          <div className="value" style={{ color: "var(--brand)" }}>{log.newWords.length}</div>
          <div className="label">nouveaux mots aujourd'hui</div>
        </div>
      </div>
      <div className="stack-sm" style={{ width: "100%", maxWidth: 420 }}>
        <button className="btn lg primary block" onClick={() => navigate("/")}>
          Retour à l'accueil
        </button>
        <button className="btn lg ghost block" onClick={() => navigate("/review")}>
          Continuer à m'entraîner
        </button>
      </div>
    </div>
  );
}
