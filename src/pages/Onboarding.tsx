import { useState } from "react";
import { Icon } from "../components/Icon";
import { LevelBadge } from "../components/ui";
import type { Level } from "../data/types";
import { LEVEL_INFO } from "../lib/curriculum";
import { dayKey } from "../lib/date";
import { navigate } from "../lib/router";
import { update, type Pace } from "../lib/store";
import { PACES } from "./Settings";

const START_OPTIONS: { level: Level; title: string; desc: string }[] = [
  { level: "A1", title: "Je débute", desc: "Je connais quelques mots, je veux des bases solides" },
  { level: "A2", title: "J'ai des bases", desc: "Je me présente, je comprends des phrases simples" },
  { level: "B1", title: "Je me débrouille", desc: "Je tiens une conversation simple, je veux progresser" },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [start, setStart] = useState<Level>("A2");
  const [target, setTarget] = useState<Level>("B2");
  const [pace, setPace] = useState<Pace>(8);

  const finish = () => {
    update((d) => {
      d.profile = { ...d.profile, name: name.trim(), startLevel: start, targetLevel: target, dailyNew: pace, startedOn: dayKey() };
      d.onboarded = true;
    });
    navigate("/");
  };

  return (
    <div className="onboard">
      <div className="onboard-card stack-lg">
        <div className="row between">
          <div className="brand">
            <div className="brand-mark">365</div>
            <div className="brand-name">
              Anglais 365<small>De A1 à C1, un jour après l'autre</small>
            </div>
          </div>
          <span className="faint small">{step + 1}/4</span>
        </div>
        <div className="bar thin">
          <span style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>

        {step === 0 && (
          <div className="stack-lg rise" key="0">
            <div>
              <h1 style={{ fontSize: "clamp(32px, 6vw, 48px)" }}>
                Ton anglais, <span style={{ color: "var(--brand)" }}>chaque jour</span>, jusqu'à C1.
              </h1>
              <p className="muted" style={{ fontSize: 18, marginTop: 12 }}>
                Un programme quotidien de 10 à 30 minutes : nouveaux mots, grammaire, lecture, écoute, prononciation — et un coach IA pour parler et être
                corrigé.
              </p>
            </div>
            <div className="grid-2">
              {[
                ["repeat", "Répétition espacée", "Chaque mot revient juste avant que tu l'oublies"],
                ["words", "Ton répertoire", "Tous tes mots, leur niveau de mémorisation"],
                ["sparkles", "Coach IA", "Conversation, corrections, jeux de rôle"],
                ["refresh", "Le tour quotidien", "Tout ce que tu as vu repasse régulièrement"],
              ].map(([i, t, d]) => (
                <div key={t} className="row" style={{ alignItems: "flex-start" }}>
                  <div className="brand-mark" style={{ width: 36, height: 36, flex: "none", borderRadius: 11 }}>
                    <Icon name={i} size={17} />
                  </div>
                  <div>
                    <b>{t}</b>
                    <p className="muted small">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <label className="field">
              Comment t'appelles-tu ?
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" autoFocus onKeyDown={(e) => e.key === "Enter" && setStep(1)} />
            </label>
            <button className="btn primary lg" onClick={() => setStep(1)}>
              C'est parti <Icon name="arrowRight" size={18} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="stack rise" key="1">
            <h2 style={{ fontSize: 30 }}>Quel est ton niveau actuel ?</h2>
            <p className="muted">Pas de panique : les niveaux inférieurs restent accessibles dans les cours.</p>
            <div className="choice-grid">
              {START_OPTIONS.map((o) => (
                <button key={o.level} className={`choice ${start === o.level ? "on" : ""}`} onClick={() => setStart(o.level)}>
                  <LevelBadge level={o.level} />
                  <div>
                    <b style={{ display: "block" }}>{o.title}</b>
                    <span className="muted small">{o.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </div>
        )}

        {step === 2 && (
          <div className="stack rise" key="2">
            <h2 style={{ fontSize: 30 }}>Quel est ton objectif ?</h2>
            <div className="choice-grid">
              {(["B2", "C1"] as Level[]).map((l) => (
                <button key={l} className={`choice ${target === l ? "on" : ""}`} onClick={() => setTarget(l)}>
                  <LevelBadge level={l} />
                  <div>
                    <b style={{ display: "block" }}>{LEVEL_INFO[l].name}</b>
                    <span className="muted small">{LEVEL_INFO[l].desc}</span>
                  </div>
                </button>
              ))}
            </div>
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div className="stack rise" key="3">
            <h2 style={{ fontSize: 30 }}>Combien de temps par jour ?</h2>
            <p className="muted">La régularité compte plus que la durée. Tu pourras changer à tout moment.</p>
            <div className="choice-grid">
              {PACES.map((p) => (
                <button key={p.value} className={`choice ${pace === p.value ? "on" : ""}`} onClick={() => setPace(p.value)}>
                  <div className="brand-mark" style={{ width: 44, height: 44, flex: "none" }}>
                    {p.value}
                  </div>
                  <div>
                    <b style={{ display: "block" }}>{p.label}</b>
                    <span className="muted small">{p.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            <Nav onBack={() => setStep(2)} onNext={finish} nextLabel="Créer mon programme" />
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel = "Continuer" }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <button className="btn lg ghost" onClick={onBack}>
        <Icon name="arrowLeft" size={18} />
      </button>
      <button className="btn lg primary grow" onClick={onNext}>
        {nextLabel} <Icon name="arrowRight" size={18} />
      </button>
    </div>
  );
}
