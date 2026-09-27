import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import {
  DictationQuestion,
  ExerciseQuestion,
  SpeakingQuestion,
  WordQuestion,
  chooseKind,
  type WordQuestionKind,
} from "../components/exercises";
import { Foot, LevelBadge, SpeakButton, toast } from "../components/ui";
import { WRITING_PROMPTS } from "../data/prompts";
import type { Exercise, GrammarLesson, Reading, Word } from "../data/types";
import { correctWriting, friendlyError, hasApiKey } from "../lib/ai";
import { XP, gradeWord, learnWord, recordAnswer } from "../lib/actions";
import { allWords, consolidationWords, doneLessons, estimatedLevel, findWord, sample, shuffle } from "../lib/curriculum";
import { dayKey } from "../lib/date";
import { speak } from "../lib/speech";
import type { Grade } from "../lib/srs";
import { getState, logActivity, update, useAppState } from "../lib/store";

export interface StepProps {
  onProgress: (fraction: number) => void;
  onComplete: (result: { correct: number; total: number }) => void;
}

// ————————————————————————————————————————————————
// Révision espacée (les erreurs reviennent en fin de série)
// ————————————————————————————————————————————————

export function ReviewStep({ words, kinds, onProgress, onComplete }: StepProps & { words: Word[]; kinds?: WordQuestionKind[] }) {
  const s = getState();
  const [queue, setQueue] = useState(() =>
    words.map((w) => ({ word: w, kind: chooseKind(s.words[w.id]?.reps ?? 0, kinds), retry: false })),
  );
  const [i, setI] = useState(0);
  const stats = useRef({ correct: 0, total: 0 });
  const total = queue.length;

  useEffect(() => onProgress(total ? i / total : 1), [i, total, onProgress]);

  const item = queue[i];
  if (!item) return null;

  const done = (grade: Grade) => {
    if (!item.retry) {
      gradeWord(item.word.id, grade);
      stats.current.total++;
      if (grade > 0) stats.current.correct++;
    }
    let q = queue;
    if (grade === 0 && !item.retry) {
      // on revoit le mot plus tard dans la série, sous une autre forme
      q = [...queue, { word: item.word, kind: item.kind === "mcq-en" ? "mcq-fr" : "mcq-en", retry: true }];
      setQueue(q);
    }
    if (i + 1 >= q.length) onComplete(stats.current);
    else setI(i + 1);
  };

  return <WordQuestion key={`${item.word.id}-${i}`} word={item.word} kind={item.kind} onDone={done} />;
}

// ————————————————————————————————————————————————
// Nouveaux mots : découverte puis vérification
// ————————————————————————————————————————————————

export function LearnStep({ words, onProgress, onComplete }: StepProps & { words: Word[] }) {
  const [phase, setPhase] = useState<"discover" | "quiz">("discover");
  const [i, setI] = useState(0);
  const quiz = useMemo(() => shuffle(words), [words]);
  const stats = useRef({ correct: 0, total: 0 });
  const autoplay = useAppState().settings.autoplay;

  useEffect(() => {
    onProgress(phase === "discover" ? (i / words.length) * 0.5 : 0.5 + (i / words.length) * 0.5);
  }, [i, phase, words.length, onProgress]);

  useEffect(() => {
    if (phase !== "discover") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const next = () => {
    if (i + 1 < words.length) setI(i + 1);
    else {
      setPhase("quiz");
      setI(0);
    }
  };

  if (phase === "discover") {
    const w = words[i];
    return (
      <div key={w.id} className="rise">
        <div className="step-kicker">
          <Icon name="sparkles" size={15} /> Nouveau mot · {i + 1}/{words.length}
        </div>
        <div className="word-hero" style={{ ["--lv" as string]: `var(--lv-${w.level.toLowerCase()})` }}>
          <div className="row" style={{ justifyContent: "center", gap: 8, marginBottom: 14 }}>
            <LevelBadge level={w.level} />
            <span className="chip">{w.theme}</span>
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 14 }}>
            <SpeakButton text={w.en} auto={autoplay} />
            <div className="word">{w.en}</div>
          </div>
          <div className="tr">{w.fr}</div>
          {w.ex && (
            <div className="ex">
              <SpeakButton text={w.ex} size="sm" />
              <span style={{ fontStyle: "italic" }}>{w.ex}</span>
            </div>
          )}
        </div>
        <p className="faint small center" style={{ marginTop: 16 }}>
          Écoute, répète à voix haute, puis passe au suivant.
        </p>
        <Foot className="session-foot">
          <div className="inner">
            {i > 0 && (
              <button className="btn lg outline" onClick={() => setI(i - 1)} aria-label="Précédent">
                <Icon name="arrowLeft" />
              </button>
            )}
            <button className="btn lg primary grow" onClick={next}>
              {i + 1 < words.length ? "Mot suivant" : "Je vérifie que j'ai retenu"} <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </Foot>
      </div>
    );
  }

  const w = quiz[i];
  return (
    <WordQuestion
      key={`q-${w.id}`}
      word={w}
      kind={i % 3 === 2 ? "mcq-fr" : "mcq-en"}
      onDone={(g) => {
        learnWord(w.id, g > 0);
        stats.current.total++;
        if (g > 0) stats.current.correct++;
        if (i + 1 < quiz.length) setI(i + 1);
        else onComplete(stats.current);
      }}
    />
  );
}

// ————————————————————————————————————————————————
// Grammaire : leçon puis exercices
// ————————————————————————————————————————————————

export function LessonView({ lesson }: { lesson: GrammarLesson }) {
  const lv = `var(--lv-${lesson.level.toLowerCase()})`;
  return (
    <div className="stack" style={{ ["--lv" as string]: lv }}>
      <div>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <LevelBadge level={lesson.level} />
          <span className="eyebrow">Grammaire</span>
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>{lesson.title}</h1>
        <p className="muted" style={{ marginTop: 6, fontSize: 18 }}>
          {lesson.subtitle}
        </p>
      </div>
      <p style={{ fontSize: 17 }}>{lesson.intro}</p>
      <div className="stack-sm">
        {lesson.rules.map((r, i) => (
          <div key={i} className="rule">
            <h4>{r.title}</h4>
            <p>{r.body}</p>
          </div>
        ))}
      </div>
      <div className="card flat">
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          Exemples
        </div>
        {lesson.examples.map((e, i) => (
          <div key={i} className="example">
            <SpeakButton text={e.en} size="sm" />
            <div>
              <div className="en">{e.en}</div>
              <div className="fr">{e.fr}</div>
            </div>
          </div>
        ))}
      </div>
      {lesson.tip && (
        <div className="tip">
          <Icon name="bulb" />
          <span>{lesson.tip}</span>
        </div>
      )}
    </div>
  );
}

export function ExercisesRun({ exercises, onProgress, onComplete }: StepProps & { exercises: Exercise[] }) {
  const [i, setI] = useState(0);
  const stats = useRef({ correct: 0, total: 0 });
  useEffect(() => onProgress(i / exercises.length), [i, exercises.length, onProgress]);
  const ex = exercises[i];
  if (!ex) return null;
  return (
    <ExerciseQuestion
      key={i}
      ex={ex}
      onDone={(ok) => {
        recordAnswer(ok);
        stats.current.total++;
        if (ok) stats.current.correct++;
        if (i + 1 < exercises.length) setI(i + 1);
        else onComplete(stats.current);
      }}
    />
  );
}

export function GrammarStep({ lesson, onProgress, onComplete }: StepProps & { lesson: GrammarLesson }) {
  const [phase, setPhase] = useState<"learn" | "practice">("learn");
  const exercises = useMemo(() => shuffle(lesson.exercises), [lesson]);
  useEffect(() => {
    if (phase === "learn") onProgress(0);
  }, [phase, onProgress]);

  if (phase === "learn") {
    return (
      <div className="rise">
        <LessonView lesson={lesson} />
        <Foot className="session-foot">
          <div className="inner">
            <button className="btn lg primary grow" onClick={() => setPhase("practice")}>
              J'ai compris, je pratique <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </Foot>
      </div>
    );
  }
  return (
    <ExercisesRun
      exercises={exercises}
      onProgress={(f) => onProgress(0.2 + f * 0.8)}
      onComplete={(r) => {
        const score = r.total ? r.correct / r.total : 1;
        update((d) => {
          const prev = d.grammarDone[lesson.id];
          d.grammarDone[lesson.id] = { score: Math.max(score, prev?.score ?? 0), date: prev?.date ?? dayKey() };
        });
        logActivity({ addXp: XP.lesson });
        onComplete(r);
      }}
    />
  );
}

// ————————————————————————————————————————————————
// Lecture
// ————————————————————————————————————————————————

export function ReadingView({ reading }: { reading: Reading }) {
  const [reading_, setReading] = useState<number | null>(null);
  const paragraphs = reading.text.split(/\n\s*\n/);
  const gloss = new Map(reading.glossary.map((g) => [g.en.toLowerCase(), g.fr]));
  const readAll = (idx: number) => {
    if (idx >= paragraphs.length) return setReading(null);
    setReading(idx);
    speak(paragraphs[idx], { rate: getState().settings.rate * 0.95, onEnd: () => readAll(idx + 1) });
  };

  return (
    <div className="stack">
      <div>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <LevelBadge level={reading.level} />
          <span className="eyebrow">Lecture</span>
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>{reading.title}</h1>
      </div>
      <div className="row wrap">
        <button
          className="btn soft sm"
          onClick={() => {
            if (reading_ !== null) {
              window.speechSynthesis?.cancel();
              setReading(null);
            } else readAll(0);
          }}
        >
          <Icon name={reading_ !== null ? "stop" : "headphones"} size={16} />
          {reading_ !== null ? "Arrêter" : "Écouter le texte"}
        </button>
        <span className="faint tiny">Touche les mots surlignés pour voir leur traduction</span>
      </div>
      <div className="card">
        <div className="reading-text">
          {paragraphs.map((p, i) => (
            <p key={i} style={reading_ === i ? { background: "var(--brand-soft)", borderRadius: 8 } : undefined}>
              {highlight(p, gloss)}
            </p>
          ))}
        </div>
      </div>
      {reading.glossary.length > 0 && (
        <div className="card flat pad-sm">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Vocabulaire du texte
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            {reading.glossary.map((g) => (
              <span key={g.en} className="chip">
                <b style={{ color: "var(--ink)" }}>{g.en}</b> · {g.fr}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function highlight(p: string, gloss: Map<string, string>) {
  if (!gloss.size) return p;
  const terms = [...gloss.keys()].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${terms.join("|")})\\b`, "gi");
  const parts = p.split(re);
  return parts.map((part, i) =>
    gloss.has(part.toLowerCase()) ? (
      <span key={i} className="hl" title={gloss.get(part.toLowerCase())} onClick={() => toast(`${part} : ${gloss.get(part.toLowerCase())}`)}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function ReadingStep({ reading, onProgress, onComplete }: StepProps & { reading: Reading }) {
  const [phase, setPhase] = useState<"read" | "questions">("read");
  const exercises: Exercise[] = useMemo(() => reading.questions.map((q) => ({ kind: "mcq", prompt: q.q, options: q.options, answer: q.answer })), [reading]);
  useEffect(() => {
    if (phase === "read") onProgress(0.1);
  }, [phase, onProgress]);
  if (phase === "read") {
    return (
      <div className="rise">
        <ReadingView reading={reading} />
        <Foot className="session-foot">
          <div className="inner">
            <button
              className="btn lg primary grow"
              onClick={() => {
                window.speechSynthesis?.cancel();
                setPhase("questions");
              }}
            >
              Répondre aux questions <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </Foot>
      </div>
    );
  }
  return (
    <ExercisesRun
      exercises={exercises}
      onProgress={(f) => onProgress(0.3 + f * 0.7)}
      onComplete={(r) => {
        if (!reading.id.startsWith("ai-")) {
          update((d) => {
            d.readingsDone[reading.id] = { score: r.total ? r.correct / r.total : 1, date: dayKey() };
          });
        }
        logActivity({ addXp: XP.reading });
        onComplete(r);
      }}
    />
  );
}

// ————————————————————————————————————————————————
// Écoute (dictée) & prononciation
// ————————————————————————————————————————————————

/** Phrases à travailler : exemples des mots appris et des leçons faites. */
export function practiceSentences(n: number): { en: string; fr?: string }[] {
  const s = getState();
  const learned = Object.values(s.words)
    .sort((a, b) => (a.learnedOn < b.learnedOn ? 1 : -1))
    .slice(0, 80)
    .map((p) => findWord(s, p.id))
    .filter((w): w is Word => !!w && w.ex.length > 8);
  const fromWords = learned.map((w) => ({ en: w.ex, fr: `Mot clé : ${w.en} = ${w.fr}` }));
  const fromLessons = doneLessons(s).flatMap((l) => l.examples.map((e) => ({ en: e.en.replace(/^«.*?»\s*→\s*/, ""), fr: e.fr })));
  let pool = [...fromWords, ...fromLessons];
  if (pool.length < n) {
    const { working } = estimatedLevel(s);
    pool = pool.concat(
      allWords(s)
        .filter((w) => w.level === working && w.ex.length > 8)
        .map((w) => ({ en: w.ex, fr: `Mot clé : ${w.en} = ${w.fr}` })),
    );
  }
  return sample(pool, n);
}

export function ListeningStep({ onProgress, onComplete, count = 5 }: StepProps & { count?: number }) {
  const sentences = useMemo(() => practiceSentences(count), [count]);
  const [i, setI] = useState(0);
  const stats = useRef({ correct: 0, total: 0 });
  useEffect(() => onProgress(i / sentences.length), [i, sentences.length, onProgress]);
  const cur = sentences[i];
  if (!cur) return null;
  return (
    <DictationQuestion
      key={i}
      sentence={cur.en}
      translation={cur.fr}
      onDone={(score) => {
        const ok = score >= 0.75;
        recordAnswer(ok);
        stats.current.total++;
        if (ok) stats.current.correct++;
        if (i + 1 < sentences.length) setI(i + 1);
        else onComplete(stats.current);
      }}
    />
  );
}

export function SpeakingStep({ onProgress, onComplete, count = 5 }: StepProps & { count?: number }) {
  const sentences = useMemo(() => practiceSentences(count), [count]);
  const [i, setI] = useState(0);
  const stats = useRef({ correct: 0, total: 0 });
  useEffect(() => onProgress(i / sentences.length), [i, sentences.length, onProgress]);
  const cur = sentences[i];
  if (!cur) return null;
  return (
    <SpeakingQuestion
      key={i}
      sentence={cur.en}
      translation={cur.fr}
      onDone={(score) => {
        const ok = score >= 0.6;
        recordAnswer(ok);
        stats.current.total++;
        if (ok) stats.current.correct++;
        if (i + 1 < sentences.length) setI(i + 1);
        else onComplete(stats.current);
      }}
    />
  );
}

// ————————————————————————————————————————————————
// Expression écrite (corrigée par l'IA si une clé est configurée)
// ————————————————————————————————————————————————

export function WritingStep({ onProgress, onComplete }: StepProps) {
  const s = useAppState();
  const { working } = estimatedLevel(s);
  const prompts = WRITING_PROMPTS[working];
  const [prompt, setPrompt] = useState(() => prompts[s.writings.length % prompts.length]);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ai = hasApiKey();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minWords = working === "A1" ? 25 : working === "A2" ? 40 : working === "B1" ? 70 : 100;

  useEffect(() => onProgress(feedback ? 0.9 : Math.min(0.6, wordCount / minWords / 1.6)), [feedback, wordCount, minWords, onProgress]);

  const submit = async () => {
    setError("");
    if (!ai) {
      save("");
      return;
    }
    setLoading(true);
    try {
      const fb = await correctWriting(prompt, text, setFeedback);
      save(fb);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const save = (fb: string) => {
    update((d) => {
      d.writings.unshift({ date: dayKey(), prompt, text, feedback: fb || undefined });
      d.writings = d.writings.slice(0, 60);
    });
    logActivity({ addXp: XP.writing });
    if (!ai) onComplete({ correct: 1, total: 1 });
  };

  return (
    <div className="rise stack">
      <div className="step-kicker" style={{ alignSelf: "flex-start" }}>
        <Icon name="pen" size={15} /> Expression écrite · niveau {working}
      </div>
      <div className="card" style={{ background: "linear-gradient(160deg, var(--brand-soft), var(--surface) 70%)" }}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <h2 style={{ fontSize: 22 }}>{prompt}</h2>
          {!feedback && (
            <button className="btn ghost icon sm" title="Autre sujet" onClick={() => setPrompt(sample(prompts.filter((p) => p !== prompt), 1)[0])}>
              <Icon name="refresh" size={16} />
            </button>
          )}
        </div>
        <p className="faint small" style={{ marginTop: 8 }}>
          Objectif : au moins {minWords} mots. Réutilise les mots appris récemment !
        </p>
      </div>
      <div>
        <textarea
          className="textarea"
          style={{ minHeight: 200, fontSize: 17 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write in English…"
          disabled={loading || !!feedback}
          lang="en"
        />
        <div className="row between tiny faint" style={{ marginTop: 6 }}>
          <span>
            {wordCount} / {minWords} mots
          </span>
          {!ai && <span>💡 Ajoute une clé API dans les Réglages pour une correction détaillée par l'IA</span>}
        </div>
      </div>
      {error && <div className="tip" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
      {(feedback || loading) && (
        <div className="card rise">
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="msg" style={{ margin: 0 }}>
              <div className="avatar">
                <Icon name="sparkles" size={18} />
              </div>
            </div>
            <b>Correction du coach</b>
          </div>
          {feedback ? <Markdown text={feedback} /> : <div className="typing"><i /><i /><i /></div>}
        </div>
      )}
      {!ai && (
        <div className="card flat pad-sm small">
          <b>Auto-vérification :</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }} className="muted">
            <li>Chaque phrase a-t-elle un sujet et un verbe conjugué ?</li>
            <li>As-tu mis le -s à la 3e personne du présent (he works) ?</li>
            <li>Les temps sont-ils cohérents (passé / présent) ?</li>
            <li>As-tu utilisé au moins 3 connecteurs (and, but, because, however…) ?</li>
          </ul>
        </div>
      )}
      <Foot className="session-foot">
        <div className="inner">
          {feedback ? (
            <button className="btn lg success grow" onClick={() => onComplete({ correct: 1, total: 1 })}>
              Continuer <Icon name="arrowRight" size={18} />
            </button>
          ) : (
            <>
              <button className="btn lg ghost" onClick={() => onComplete({ correct: 0, total: 0 })} disabled={loading}>
                Passer
              </button>
              <button className="btn lg primary grow" onClick={submit} disabled={wordCount < Math.min(10, minWords) || loading}>
                {loading ? "Correction en cours…" : ai ? "Faire corriger par l'IA" : "Enregistrer mon texte"}
              </button>
            </>
          )}
        </div>
      </Foot>
    </div>
  );
}

// ————————————————————————————————————————————————
// « Le tour » : consolidation de tout ce qui a déjà été vu
// ————————————————————————————————————————————————

type RecapItem = { type: "word"; word: Word; kind: WordQuestionKind } | { type: "ex"; ex: Exercise; lesson: string };

export function buildRecap(exclude: Set<string>, nWords = 4, nEx = 2): RecapItem[] {
  const s = getState();
  const words = consolidationWords(s, nWords, exclude).map((w) => ({ type: "word" as const, word: w, kind: chooseKind(3, ["type", "mcq-fr", "spell"]) }));
  const lessons = doneLessons(s);
  const exs = sample(
    lessons.flatMap((l) => l.exercises.map((ex) => ({ ex, lesson: l.title }))),
    nEx,
  ).map((x) => ({ type: "ex" as const, ...x }));
  return shuffle([...words, ...exs]);
}

export function RecapStep({ items, onProgress, onComplete }: StepProps & { items: RecapItem[] }) {
  const [i, setI] = useState(0);
  const stats = useRef({ correct: 0, total: 0 });
  useEffect(() => onProgress(i / Math.max(1, items.length)), [i, items.length, onProgress]);
  const it = items[i];
  if (!it) return null;
  const next = (ok: boolean) => {
    stats.current.total++;
    if (ok) stats.current.correct++;
    if (i + 1 < items.length) setI(i + 1);
    else onComplete(stats.current);
  };
  if (it.type === "word")
    return (
      <WordQuestion
        key={i}
        word={it.word}
        kind={it.kind}
        onDone={(g) => {
          // un mot oublié revient dans le cycle de révision ; un mot su garde son intervalle
          if (g === 0) gradeWord(it.word.id, 0);
          else recordAnswer(true);
          next(g > 0);
        }}
      />
    );
  return (
    <div key={i}>
      <p className="faint tiny" style={{ marginBottom: 8 }}>
        Rappel · {it.lesson}
      </p>
      <ExerciseQuestion
        ex={it.ex}
        onDone={(ok) => {
          recordAnswer(ok);
          next(ok);
        }}
      />
    </div>
  );
}

