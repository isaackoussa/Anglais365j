import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/Markdown";
import { toast } from "../components/ui";
import { ROLEPLAYS } from "../data/prompts";
import { COACH_MODES, MODELS, extractVocab, friendlyError, hasApiKey, streamCoach, stripVocab, type CoachMode } from "../lib/ai";
import { addCustomWord } from "../lib/actions";
import { listen, speak, sttSupported } from "../lib/speech";
import { getState, logActivity, update, useAppState, type ChatMessage } from "../lib/store";

const STARTERS: Record<CoachMode, string[]> = {
  chat: ["Hi! Can we talk about my weekend?", "Ask me questions about my job.", "Let's talk about films and series.", "I want to practise small talk."],
  correct: [
    "Yesterday I have went to the cinema with my friends and we have see a very good film.",
    "I am agree with you, the people is very kind in this city.",
  ],
  explain: [
    "Quelle différence entre « make » et « do » ?",
    "Quand utiliser le present perfect plutôt que le prétérit ?",
    "Comment bien prononcer le « th » ?",
    "Explique-moi les phrasal verbs avec « get ».",
  ],
  roleplay: [],
};

export function Coach() {
  const s = useAppState();
  const [mode, setMode] = useState<CoachMode>("chat");
  if (!hasApiKey()) return <CoachSetup />;
  const history = s.chats[mode] ?? [];

  return (
    <div className="coach">
      <div className="stack-sm" style={{ paddingTop: 8 }}>
        <div className="row between wrap">
          <div className="row">
            <div className="brand-mark" style={{ width: 42, height: 42 }}>
              <Icon name="sparkles" size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 24 }}>Coach IA</h1>
              <p className="faint tiny">{MODELS.find((m) => m.id === s.settings.model)?.label ?? s.settings.model} · adapté à ton niveau</p>
            </div>
          </div>
          {history.length > 0 && (
            <button
              className="btn ghost sm"
              onClick={() =>
                update((d) => {
                  d.chats[mode] = [];
                })
              }
            >
              <Icon name="refresh" size={15} /> Nouvelle conversation
            </button>
          )}
        </div>
        <div className="segmented">
          {(Object.keys(COACH_MODES) as CoachMode[]).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              <Icon name={COACH_MODES[m].icon} size={15} /> {COACH_MODES[m].label}
            </button>
          ))}
        </div>
      </div>
      <Conversation key={mode} mode={mode} />
    </div>
  );
}

function Conversation({ mode }: { mode: CoachMode }) {
  const s = useAppState();
  const history = s.chats[mode] ?? [];
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stopRec = useRef<() => void>(() => {});

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [history.length, streaming]);

  useEffect(() => () => abort.current?.abort(), []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming !== null) return;
    setError("");
    setInput("");
    const userMsg: ChatMessage = { role: "user", content, at: Date.now() };
    update((d) => {
      d.chats[mode] = [...(d.chats[mode] ?? []), userMsg];
    });
    const convo = [...(getState().chats[mode] ?? [])].slice(-30);
    // l'API attend une conversation qui commence par l'utilisateur
    while (convo.length && convo[0].role !== "user") convo.shift();
    abort.current = new AbortController();
    setStreaming("");
    try {
      const reply = await streamCoach(mode, convo, setStreaming, abort.current.signal);
      update((d) => {
        d.chats[mode] = [...(d.chats[mode] ?? []), { role: "assistant", content: reply, at: Date.now() }];
      });
      logActivity({ addXp: 5 });
    } catch (e) {
      const msg = friendlyError(e);
      if (msg) setError(msg);
      // retire le message non traité pour pouvoir le renvoyer
      update((d) => {
        const list = d.chats[mode] ?? [];
        if (list.at(-1)?.at === userMsg.at) list.pop();
      });
      if (msg) setInput(content);
    } finally {
      setStreaming(null);
      abort.current = null;
    }
  };

  const dictate = () => {
    if (recording) return stopRec.current();
    setRecording(true);
    const { promise, stop } = listen();
    stopRec.current = stop;
    promise
      .then((alts) => {
        if (alts[0]) setInput((v) => (v ? `${v} ${alts[0]}` : alts[0]));
      })
      .catch(() => toast("Micro indisponible"))
      .finally(() => setRecording(false));
  };

  const empty = history.length === 0 && streaming === null;

  return (
    <>
      <div className="messages">
        {empty && <EmptyCoach mode={mode} onPick={send} />}
        {history.map((m, i) => (
          <Message key={i} msg={m} />
        ))}
        {streaming !== null && (
          <div className="msg">
            <div className="avatar">
              <Icon name="sparkles" size={17} />
            </div>
            <div className="bubble">{streaming ? <Markdown text={stripVocab(streaming)} /> : <div className="typing"><i /><i /><i /></div>}</div>
          </div>
        )}
        {error && (
          <div className="tip" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <Icon name="info" />
            <span>{error}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ paddingBottom: 8 }}>
        <div className="composer">
          {sttSupported() && (
            <button className={`btn icon ${recording ? "danger" : "ghost"}`} onClick={dictate} title="Dicter en anglais" aria-label="Dicter">
              <Icon name={recording ? "stop" : "mic"} size={20} />
            </button>
          )}
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder={recording ? "Je t'écoute… parle en anglais" : COACH_MODES[mode].placeholder}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(180, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
                if (taRef.current) taRef.current.style.height = "auto";
              }
            }}
            lang={mode === "explain" ? "fr" : "en"}
          />
          {streaming !== null ? (
            <button className="btn icon outline" onClick={() => abort.current?.abort()} aria-label="Arrêter">
              <Icon name="stop" size={18} />
            </button>
          ) : (
            <button className="btn icon primary" onClick={() => send(input)} disabled={!input.trim()} aria-label="Envoyer">
              <Icon name="send" size={18} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyCoach({ mode, onPick }: { mode: CoachMode; onPick: (t: string) => void }) {
  return (
    <div className="stack rise" style={{ margin: "auto 0", padding: "24px 0" }}>
      <div className="center stack-sm" style={{ alignItems: "center" }}>
        <div className="empty" style={{ padding: 0 }}>
          <div className="ico" style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))", color: "white" }}>
            <Icon name={COACH_MODES[mode].icon} size={30} />
          </div>
        </div>
        <h2 style={{ fontSize: 24 }}>{COACH_MODES[mode].label}</h2>
        <p className="muted" style={{ maxWidth: 480 }}>
          {COACH_MODES[mode].hint}
        </p>
      </div>
      {mode === "roleplay" ? (
        <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
          {ROLEPLAYS.map((r) => (
            <button key={r.title} className="card interactive pad-sm" style={{ textAlign: "left" }} onClick={() => onPick(r.prompt)}>
              <div style={{ fontSize: 26 }}>{r.icon}</div>
              <b style={{ display: "block", marginTop: 6 }}>{r.title}</b>
            </button>
          ))}
        </div>
      ) : (
        <div className="row wrap" style={{ justifyContent: "center", gap: 8 }}>
          {STARTERS[mode].map((t) => (
            <button key={t} className="chip" style={{ height: "auto", minHeight: 36, padding: "8px 14px", whiteSpace: "normal", textAlign: "left" }} onClick={() => onPick(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ msg }: { msg: ChatMessage }) {
  const s = useAppState();
  if (msg.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{msg.content}</div>
      </div>
    );
  }
  const vocab = extractVocab(msg.content);
  const known = new Set(s.customWords.map((w) => w.en.toLowerCase()));
  return (
    <div className="msg">
      <div className="avatar">
        <Icon name="sparkles" size={17} />
      </div>
      <div className="stack-sm" style={{ minWidth: 0 }}>
        <div className="bubble">
          <Markdown text={stripVocab(msg.content)} />
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn ghost sm" onClick={() => speak(stripVocab(msg.content).replace(/[*_#>`]/g, ""))} title="Écouter">
            <Icon name="volume" size={15} /> Écouter
          </button>
          {vocab.map((v) =>
            known.has(v.en.toLowerCase()) ? (
              <span key={v.en} className="chip success">
                <Icon name="check" size={13} /> {v.en}
              </span>
            ) : (
              <button
                key={v.en}
                className="chip brand"
                title={`Ajouter « ${v.en} » (${v.fr}) à mon répertoire`}
                onClick={() => {
                  const w = addCustomWord(v.en, v.fr, "", "Du coach IA");
                  toast(w ? `« ${v.en} » ajouté à ton répertoire` : "Déjà dans ton répertoire");
                }}
              >
                <Icon name="plus" size={13} /> {v.en} · <span style={{ fontWeight: 500 }}>{v.fr}</span>
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function CoachSetup() {
  const [key, setKey] = useState("");
  return (
    <div className="container narrow stack-lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Coach IA</h1>
        <p>Un professeur particulier disponible 24 h/24, propulsé par Claude.</p>
      </div>
      <div className="grid-2">
        {[
          { icon: "chat", t: "Conversation", d: "Discute en anglais, il corrige tes erreurs au fil de l'eau" },
          { icon: "pen", t: "Correcteur", d: "Tes textes corrigés et expliqués en français" },
          { icon: "help", t: "Explique-moi", d: "Toutes tes questions de grammaire et de vocabulaire" },
          { icon: "theater", t: "Jeux de rôle", d: "Entretien, restaurant, aéroport, négociation…" },
        ].map((f) => (
          <div key={f.t} className="card pad-sm row" style={{ alignItems: "flex-start" }}>
            <div className="brand-mark" style={{ width: 38, height: 38, flex: "none" }}>
              <Icon name={f.icon} size={18} />
            </div>
            <div>
              <b>{f.t}</b>
              <p className="muted small">{f.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card stack">
        <div className="row">
          <Icon name="key" />
          <h2 style={{ fontSize: 20 }}>Connecte ta clé API Anthropic</h2>
        </div>
        <ol className="muted small" style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>
            Crée un compte sur{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>{" "}
            et génère une clé API.
          </li>
          <li>Colle-la ci-dessous. Elle est stockée uniquement sur cet appareil (jamais envoyée ailleurs qu'à l'API d'Anthropic).</li>
          <li>Tu paies seulement ce que tu utilises : quelques centimes pour une longue conversation.</li>
        </ol>
        <form
          className="row wrap"
          onSubmit={(e) => {
            e.preventDefault();
            if (!key.trim().startsWith("sk-")) return toast("La clé doit commencer par « sk- »");
            update((d) => {
              d.settings.apiKey = key.trim();
            });
            toast("Coach activé ! 🎉");
          }}
        >
          <input className="input grow" style={{ minWidth: 240 }} type="password" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn primary" type="submit" disabled={!key.trim()}>
            Activer le coach
          </button>
        </form>
      </div>
    </div>
  );
}
