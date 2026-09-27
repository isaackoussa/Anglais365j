import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Exercise, Word } from "../data/types";
import { distractors, shuffle } from "../lib/curriculum";
import { listen, speak, sttSupported } from "../lib/speech";
import type { Grade } from "../lib/srs";
import { getState, useAppState } from "../lib/store";
import { check, normalize, similarity, wordDiff, type Verdict } from "../lib/text";
import { Icon } from "./Icon";
import { Foot, SpeakButton } from "./ui";

// ————————————————————————————————————————————————
// Pied de question : Vérifier / Continuer + verdict
// ————————————————————————————————————————————————

type Status = "idle" | "ok" | "close" | "ko";

export function AnswerFooter({
  status,
  canCheck,
  onCheck,
  onContinue,
  message,
  checkLabel = "Vérifier",
  extra,
}: {
  status: Status;
  canCheck: boolean;
  onCheck: () => void;
  onContinue: () => void;
  message?: ReactNode;
  checkLabel?: string;
  extra?: ReactNode;
}) {
  const answered = status !== "idle";
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (answered) btnRef.current?.focus();
  }, [answered]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA") return;
      const el = e.target as HTMLElement;
      // un bouton d'action garde son propre comportement ; une option cochée → Entrée vérifie
      if (tag === "BUTTON" && !answered && !el.classList.contains("option") && !el.classList.contains("tile")) return;
      e.preventDefault();
      if (answered) onContinue();
      else if (canCheck) onCheck();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, canCheck, onCheck, onContinue]);

  const cls = status === "ok" || status === "close" ? "ok" : status === "ko" ? "ko" : "";
  return (
    <Foot className={`session-foot ${cls}`}>
      <div className="inner">
        {answered ? (
          <div className="verdict rise">
            <b>
              <Icon name={status === "ko" ? "x" : "check"} size={22} stroke={3} />
              {status === "ok" ? pick(PRAISE) : status === "close" ? "Presque parfait !" : "Pas tout à fait…"}
            </b>
            {message && <p>{message}</p>}
          </div>
        ) : (
          <div className="grow">{extra}</div>
        )}
        {answered ? (
          <button ref={btnRef} className={`btn lg ${status === "ko" ? "danger-solid" : "success"}`} onClick={onContinue}>
            Continuer
          </button>
        ) : (
          <button className="btn lg primary" disabled={!canCheck} onClick={onCheck}>
            {checkLabel}
          </button>
        )}
      </div>
    </Foot>
  );
}

const PRAISE = ["Excellent !", "Bravo !", "Parfait !", "Bien joué !", "Super !", "Impeccable !", "Great job!", "Well done!"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// ————————————————————————————————————————————————
// QCM générique
// ————————————————————————————————————————————————

function Options({
  options,
  answer,
  chosen,
  onChoose,
  locked,
  speakOptions,
}: {
  options: string[];
  answer: number;
  chosen: number | null;
  onChoose: (i: number) => void;
  locked: boolean;
  speakOptions?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked || (e.target as HTMLElement).tagName === "INPUT") return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onChoose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, options.length, onChoose]);

  return (
    <div className="options">
      {options.map((o, i) => {
        let cls = "";
        if (locked) {
          if (i === answer) cls = "correct";
          else if (i === chosen) cls = "wrong shake";
        } else if (i === chosen) cls = "selected";
        return (
          <button
            key={i}
            className={`option ${cls}`}
            disabled={locked}
            onClick={() => {
              onChoose(i);
              if (speakOptions) speak(o);
            }}
          >
            <span className="key">{i + 1}</span>
            <span className="grow">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

// ————————————————————————————————————————————————
// Questions sur un mot (révision espacée)
// ————————————————————————————————————————————————

export type WordQuestionKind = "flash" | "mcq-en" | "mcq-fr" | "type" | "listen" | "spell";

export function chooseKind(reps: number, allowed?: WordQuestionKind[]): WordQuestionKind {
  const byStage: WordQuestionKind[] =
    reps <= 0 ? ["mcq-en", "mcq-en", "listen"] : reps <= 2 ? ["mcq-fr", "type", "listen", "mcq-en"] : ["type", "flash", "spell", "listen", "mcq-fr"];
  const pool = allowed ? byStage.filter((k) => allowed.includes(k)) : byStage;
  return pick(pool.length ? pool : allowed ?? byStage);
}

export function WordQuestion({ word, kind, onDone }: { word: Word; kind: WordQuestionKind; onDone: (grade: Grade) => void }) {
  switch (kind) {
    case "flash":
      return <Flashcard word={word} onDone={onDone} />;
    case "type":
      return <TypeWord word={word} onDone={onDone} />;
    case "spell":
      return <TypeWord word={word} onDone={onDone} fromAudio />;
    default:
      return <McqWord word={word} kind={kind} onDone={onDone} />;
  }
}

function McqWord({ word, kind, onDone }: { word: Word; kind: "mcq-en" | "mcq-fr" | "listen"; onDone: (g: Grade) => void }) {
  const s = getState();
  const autoplay = useAppState().settings.autoplay;
  const { options, answer } = useMemo(() => {
    const others = distractors(s, word, 3);
    const all = shuffle([word, ...others]);
    const toFr = kind !== "mcq-fr";
    return { options: all.map((w) => (toFr ? w.fr : w.en)), answer: all.indexOf(word) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id, kind]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const verify = () => {
    const ok = chosen === answer;
    setStatus(ok ? "ok" : "ko");
    if (kind !== "mcq-fr" || ok) speak(word.en);
  };

  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name={kind === "listen" ? "headphones" : "words"} size={15} />
        {kind === "listen" ? "Écoute et trouve la traduction" : kind === "mcq-en" ? "Que signifie ce mot ?" : "Comment dit-on en anglais ?"}
      </div>
      {kind === "listen" ? (
        <div className="row" style={{ marginBottom: 24, gap: 18 }}>
          <SpeakButton text={word.en} size="lg" auto />
          <button className="btn ghost sm" onClick={() => speak(word.en, { rate: 0.6 })}>
            🐢 Plus lent
          </button>
        </div>
      ) : kind === "mcq-en" ? (
        <div className="row" style={{ marginBottom: 20 }}>
          <SpeakButton text={word.en} auto={autoplay} />
          <h2 className="q-title" style={{ margin: 0, fontSize: 34 }}>
            {word.en}
          </h2>
        </div>
      ) : (
        <h2 className="q-title">« {word.fr} »</h2>
      )}
      <Options options={options} answer={answer} chosen={chosen} onChoose={setChosen} locked={status !== "idle"} speakOptions={kind === "mcq-fr"} />
      <AnswerFooter
        status={status}
        canCheck={chosen !== null}
        onCheck={verify}
        onContinue={() => onDone(status === "ok" ? 2 : 0)}
        message={
          <>
            <b>{word.en}</b> = {word.fr}
            {word.ex && <span className="faint"> · {word.ex}</span>}
          </>
        }
      />
    </div>
  );
}

function TypeWord({ word, onDone, fromAudio }: { word: Word; onDone: (g: Grade) => void; fromAudio?: boolean }) {
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hint, setHint] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const verify = () => {
    const v = check(value, [word.en]);
    setVerdict(v);
    speak(word.en);
  };
  const status: Status = verdict === null ? "idle" : verdict === "exact" ? "ok" : verdict === "close" ? "close" : "ko";
  const grade: Grade = verdict === "exact" ? (hint ? 1 : 2) : verdict === "close" ? 1 : 0;
  const hintText = word.en.slice(0, hint);

  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name={fromAudio ? "headphones" : "keyboard"} size={15} />
        {fromAudio ? "Écris ce que tu entends" : "Écris en anglais"}
      </div>
      {fromAudio ? (
        <div className="row" style={{ marginBottom: 24, gap: 18 }}>
          <SpeakButton text={word.en} size="lg" auto />
          <div className="muted small">Indice : {word.fr}</div>
        </div>
      ) : (
        <h2 className="q-title">« {word.fr} »</h2>
      )}
      <input
        ref={inputRef}
        className={`input big ${status === "ok" || status === "close" ? "ok" : status === "ko" ? "ko shake" : ""}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={hintText ? `${hintText}…` : "Ta réponse"}
        disabled={verdict !== null}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        lang="en"
      />
      {verdict === null && hint < word.en.length - 1 && (
        <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => setHint((h) => h + 1)}>
          <Icon name="bulb" size={16} /> Indice
        </button>
      )}
      <AnswerFooter
        status={status}
        canCheck={value.trim().length > 0}
        onCheck={verify}
        onContinue={() => onDone(grade)}
        message={
          verdict === "exact" ? (
            <>
              <b>{word.en}</b> — {word.ex}
            </>
          ) : (
            <>
              Bonne réponse : <b>{word.en}</b>
              {verdict === "close" && " (attention à l'orthographe)"}
            </>
          )
        }
      />
    </div>
  );
}

function Flashcard({ word, onDone }: { word: Word; onDone: (g: Grade) => void }) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => {
    if (!flipped) speak(word.en);
    setFlipped(true);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        flip();
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) onDone((Number(e.key) - 1) as Grade);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name="layers" size={15} /> Te souviens-tu de ce mot ?
      </div>
      <div className={`flashcard ${flipped ? "flipped" : ""}`} onClick={flip}>
        <div className="inner">
          <div className="face">
            <div className="tr">{word.fr}</div>
            <p className="faint small">Pense à la traduction anglaise, puis touche la carte</p>
          </div>
          <div className="face back">
            <div className="word">{word.en}</div>
            <div className="tr">{word.fr}</div>
            {word.ex && <p className="ex">“{word.ex}”</p>}
            <SpeakButton text={word.en} size="sm" />
          </div>
        </div>
      </div>
      <Foot className="session-foot">
        <div className="inner" style={{ display: "block" }}>
          {flipped ? (
            <div className="grade-row">
              <button className="btn danger" onClick={() => onDone(0)}>
                Oublié <small>à revoir</small>
              </button>
              <button className="btn outline" onClick={() => onDone(1)}>
                Difficile <small>bientôt</small>
              </button>
              <button className="btn soft" onClick={() => onDone(2)}>
                Bien <small>plus tard</small>
              </button>
              <button className="btn success" onClick={() => onDone(3)}>
                Facile <small>bien plus tard</small>
              </button>
            </div>
          ) : (
            <button className="btn lg primary block" onClick={flip}>
              Voir la réponse
            </button>
          )}
        </div>
      </Foot>
    </div>
  );
}

// ————————————————————————————————————————————————
// Exercices de grammaire
// ————————————————————————————————————————————————

export function ExerciseQuestion({ ex, onDone }: { ex: Exercise; onDone: (correct: boolean) => void }) {
  if (ex.kind === "mcq") return <McqExercise ex={ex} onDone={onDone} />;
  if (ex.kind === "gap") return <GapExercise ex={ex} onDone={onDone} />;
  return <OrderExercise ex={ex} onDone={onDone} />;
}

function McqExercise({ ex, onDone }: { ex: Extract<Exercise, { kind: "mcq" }>; onDone: (c: boolean) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name="list" size={15} /> Choisis la bonne réponse
      </div>
      <h2 className="q-title">{renderGap(ex.prompt)}</h2>
      <Options options={ex.options} answer={ex.answer} chosen={chosen} onChoose={setChosen} locked={status !== "idle"} />
      <AnswerFooter
        status={status}
        canCheck={chosen !== null}
        onCheck={() => {
          const ok = chosen === ex.answer;
          setStatus(ok ? "ok" : "ko");
          const full = ex.prompt.includes("___") ? ex.prompt.replace("___", ex.options[ex.answer]) : "";
          if (full && /^[A-Za-z]/.test(full)) speak(full);
        }}
        onContinue={() => onDone(status === "ok")}
        message={ex.explain ?? (status === "ko" ? <>Réponse : <b>{ex.options[ex.answer]}</b></> : undefined)}
      />
    </div>
  );
}

function GapExercise({ ex, onDone }: { ex: Extract<Exercise, { kind: "gap" }>; onDone: (c: boolean) => void }) {
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const [before, after] = ex.prompt.split("___");
  const status: Status = verdict === null ? "idle" : verdict === "exact" ? "ok" : verdict === "close" ? "close" : "ko";
  const full = `${before}${ex.answer[0]}${after ?? ""}`;
  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name="pen" size={15} /> Complète la phrase
      </div>
      <p className="gap-sentence" style={{ marginBottom: 22 }}>
        {before}
        <span className="gap-slot">{verdict ? ex.answer[0] : value || "…"}</span>
        {after}
      </p>
      <input
        ref={ref}
        className={`input big ${status === "ok" || status === "close" ? "ok" : status === "ko" ? "ko shake" : ""}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={verdict !== null}
        placeholder="Tape le mot manquant"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        lang="en"
      />
      {ex.hint && verdict === null && <p className="faint small" style={{ marginTop: 10 }}>💡 {ex.hint}</p>}
      <AnswerFooter
        status={status}
        canCheck={value.trim().length > 0}
        onCheck={() => {
          const v = check(value, ex.answer);
          setVerdict(v);
          if (/^[A-Za-z]/.test(full.trim())) speak(full.replace(/\(.*?\)/g, ""));
        }}
        onContinue={() => onDone(status !== "ko")}
        message={
          status === "ko" ? (
            <>
              Réponse : <b>{ex.answer.join(" / ")}</b>
              {ex.explain ? ` — ${ex.explain}` : ""}
            </>
          ) : (
            ex.explain
          )
        }
      />
    </div>
  );
}

function OrderExercise({ ex, onDone }: { ex: Extract<Exercise, { kind: "order" }>; onDone: (c: boolean) => void }) {
  const tiles = useMemo(() => {
    let t = shuffle(ex.words.map((w, i) => ({ w, i })));
    // évite de présenter les mots déjà dans le bon ordre
    if (t.map((x) => x.w).join(" ").toLowerCase() === ex.answer) t = [...t].reverse();
    return t;
  }, [ex]);
  const [picked, setPicked] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const sentence = picked.map((i) => tiles.find((t) => t.i === i)!.w).join(" ");
  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name="shuffle" size={15} /> {ex.prompt}
      </div>
      <div className={`answer-zone ${status === "ko" ? "shake" : ""}`} style={{ marginBottom: 20 }}>
        {picked.map((i) => (
          <button key={i} className="tile" disabled={status !== "idle"} onClick={() => setPicked((p) => p.filter((x) => x !== i))}>
            {tiles.find((t) => t.i === i)!.w}
          </button>
        ))}
      </div>
      <div className="tiles">
        {tiles.map((t) => (
          <button key={t.i} className={`tile ${picked.includes(t.i) ? "used" : ""}`} onClick={() => setPicked((p) => [...p, t.i])} disabled={status !== "idle"}>
            {t.w}
          </button>
        ))}
      </div>
      <AnswerFooter
        status={status}
        canCheck={picked.length === tiles.length}
        onCheck={() => {
          const ok = normalize(sentence) === normalize(ex.answer);
          setStatus(ok ? "ok" : "ko");
          speak(ex.answer);
        }}
        onContinue={() => onDone(status === "ok")}
        message={
          <>
            <b>{ex.answer.charAt(0).toUpperCase() + ex.answer.slice(1)}</b>
          </>
        }
      />
    </div>
  );
}

function renderGap(prompt: string): ReactNode {
  if (!prompt.includes("___")) return prompt;
  const [a, b] = prompt.split("___");
  return (
    <>
      {a}
      <span className="gap-slot">&nbsp;</span>
      {b}
    </>
  );
}

// ————————————————————————————————————————————————
// Dictée
// ————————————————————————————————————————————————

export function DictationQuestion({ sentence, translation, onDone }: { sentence: string; translation?: string; onDone: (score: number) => void }) {
  const [value, setValue] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [plays, setPlays] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      speak(sentence);
      setPlays(1);
    }, 300);
    return () => clearTimeout(t);
  }, [sentence]);
  const status: Status = score === null ? "idle" : score >= 0.95 ? "ok" : score >= 0.75 ? "close" : "ko";
  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name="headphones" size={15} /> Dictée — écris la phrase entendue
      </div>
      <div className="row" style={{ gap: 14, marginBottom: 22 }}>
        <button
          className="speak-btn lg"
          onClick={() => {
            speak(sentence);
            setPlays((p) => p + 1);
          }}
          aria-label="Réécouter"
        >
          <Icon name="volume" size={34} />
        </button>
        <div className="stack-sm">
          <button className="btn ghost sm" onClick={() => speak(sentence, { rate: 0.65 })}>
            🐢 Écouter lentement
          </button>
          <span className="faint tiny">{plays} écoute{plays > 1 ? "s" : ""}</span>
        </div>
      </div>
      <textarea
        ref={ref}
        className="textarea"
        style={{ minHeight: 100, fontSize: 18 }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={score !== null}
        placeholder="Écris ce que tu entends…"
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        lang="en"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (score === null && value.trim()) setScore(similarity(value, sentence));
          }
        }}
      />
      {score !== null && (
        <div className="card flat pad-sm rise" style={{ marginTop: 16 }}>
          <div className="diff">
            {wordDiff(sentence, value).map((d, i) => (
              <span key={i} className={d.ok ? "ok" : "ko"}>
                {d.word}
              </span>
            ))}
          </div>
          {translation && <p className="faint small" style={{ marginTop: 10 }}>{translation}</p>}
        </div>
      )}
      <AnswerFooter
        status={status}
        canCheck={value.trim().length > 0}
        onCheck={() => setScore(similarity(value, sentence))}
        onContinue={() => onDone(score ?? 0)}
        message={score !== null ? `${Math.round(score * 100)} % de mots corrects` : undefined}
      />
    </div>
  );
}

// ————————————————————————————————————————————————
// Prononciation
// ————————————————————————————————————————————————

export function SpeakingQuestion({ sentence, translation, onDone }: { sentence: string; translation?: string; onDone: (score: number) => void }) {
  const [state, setState] = useState<"idle" | "rec" | "done">("idle");
  const [heard, setHeard] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const stopRef = useRef<() => void>(() => {});
  const supported = sttSupported();

  const record = () => {
    setError("");
    setState("rec");
    const { promise, stop } = listen();
    stopRef.current = stop;
    promise
      .then((alts) => {
        const best = alts.reduce((b, a) => (similarity(a, sentence) > similarity(b, sentence) ? a : b), alts[0] ?? "");
        setHeard(best);
        const sc = best ? similarity(best, sentence) : 0;
        setScore(sc);
        setState("done");
      })
      .catch((e: Error) => {
        setState("idle");
        setError(e.message === "not-allowed" ? "Autorise l'accès au micro pour cet exercice." : "Je n'ai rien entendu. Réessaie !");
      });
  };

  const status: Status = score === null ? "idle" : score >= 0.85 ? "ok" : score >= 0.6 ? "close" : "ko";

  return (
    <div className="rise">
      <div className="step-kicker">
        <Icon name="mic" size={15} /> Écoute, puis répète à voix haute
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <SpeakButton text={sentence} auto />
          <div className="grow">
            <p style={{ fontSize: 22, fontWeight: 650, fontFamily: "var(--font-display)" }}>{sentence}</p>
            {translation && <p className="faint small" style={{ marginTop: 4 }}>{translation}</p>}
          </div>
        </div>
      </div>
      {supported ? (
        <div className="stack center" style={{ alignItems: "center" }}>
          <button
            className={`speak-btn lg ${state === "rec" ? "rec" : ""}`}
            onClick={() => (state === "rec" ? stopRef.current() : record())}
            aria-label={state === "rec" ? "Arrêter" : "Parler"}
          >
            <Icon name={state === "rec" ? "stop" : "mic"} size={34} />
          </button>
          <p className="muted small">{state === "rec" ? "Je t'écoute…" : state === "done" ? "Touche pour réessayer" : "Touche le micro et parle"}</p>
          {error && <p className="small" style={{ color: "var(--danger)" }}>{error}</p>}
          {heard && (
            <div className="card flat pad-sm" style={{ width: "100%" }}>
              <p className="faint tiny">J'ai entendu :</p>
              <div className="diff" style={{ marginTop: 6 }}>
                {wordDiff(sentence, heard).map((d, i) => (
                  <span key={i} className={d.ok ? "ok" : "ko"}>
                    {d.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="muted small">
          La reconnaissance vocale n'est pas disponible sur ce navigateur (essaie Chrome, Edge ou Safari). Écoute la phrase, répète-la 3 fois à voix haute,
          puis évalue-toi.
        </p>
      )}
      {supported ? (
        <AnswerFooter
          status={status}
          canCheck={false}
          onCheck={() => {}}
          checkLabel="Parle d'abord"
          onContinue={() => onDone(score ?? 0)}
          message={score !== null ? `Prononciation reconnue à ${Math.round(score * 100)} %` : undefined}
          extra={
            <button className="btn ghost" onClick={() => onDone(0.5)}>
              Passer
            </button>
          }
        />
      ) : (
        <Foot className="session-foot">
          <div className="inner">
            <button className="btn lg outline grow" onClick={() => onDone(0.5)}>
              Difficile
            </button>
            <button className="btn lg success grow" onClick={() => onDone(1)}>
              Je l'ai bien dite
            </button>
          </div>
        </Foot>
      )}
    </div>
  );
}
