import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { LevelBadge, toast } from "../components/ui";
import { LEVELS, type Level } from "../data/types";
import { AiSettings } from "../components/AiSettings";
import { levelIndex } from "../lib/curriculum";
import { englishVoices, speak } from "../lib/speech";
import { exportData, replaceState, resetState, update, useAppState, type Pace, type State } from "../lib/store";

export const PACES: { value: Pace; label: string; desc: string }[] = [
  { value: 5, label: "Tranquille", desc: "5 mots/jour · ~10 min" },
  { value: 8, label: "Régulier", desc: "8 mots/jour · ~15 min" },
  { value: 12, label: "Intensif", desc: "12 mots/jour · ~25 min" },
  { value: 16, label: "Marathon", desc: "16 mots/jour · ~35 min" },
];

export function Settings() {
  const s = useAppState();
  const [voices, setVoices] = useState(englishVoices());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      const v = englishVoices();
      if (v.length !== voices.length) setVoices(v);
    }, 500);
    return () => clearInterval(t);
  }, [voices.length]);

  const set = (fn: (d: State) => void) => update(fn);

  return (
    <div className="container narrow stack-lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Réglages</h1>
        <p>Personnalise ton programme, la voix, l'assistant IA et tes données.</p>
      </div>

      <section className="card stack">
        <h2 style={{ fontSize: 20 }}>Mon programme</h2>
        <label className="field">
          Prénom
          <input className="input" value={s.profile.name} onChange={(e) => set((d) => void (d.profile.name = e.target.value))} placeholder="Ton prénom" />
        </label>
        <div className="grid-2">
          <label className="field">
            Niveau de départ
            <select
              className="select"
              value={s.profile.startLevel}
              onChange={(e) =>
                set((d) => {
                  d.profile.startLevel = e.target.value as Level;
                  if (levelIndex(d.profile.targetLevel) < levelIndex(d.profile.startLevel)) d.profile.targetLevel = d.profile.startLevel;
                })
              }
            >
              {LEVELS.slice(0, 3).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Objectif
            <select className="select" value={s.profile.targetLevel} onChange={(e) => set((d) => void (d.profile.targetLevel = e.target.value as Level))}>
              {LEVELS.filter((l) => levelIndex(l) >= Math.max(3, levelIndex(s.profile.startLevel))).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field">
          Rythme quotidien
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {PACES.map((p) => (
              <button key={p.value} className={`choice ${s.profile.dailyNew === p.value ? "on" : ""}`} style={{ padding: 12 }} onClick={() => set((d) => void (d.profile.dailyNew = p.value))}>
                <div>
                  <b style={{ display: "block" }}>{p.label}</b>
                  <span className="faint tiny">{p.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 20 }}>Apparence & audio</h2>
        <div className="field">
          Thème
          <div className="segmented">
            {(
              [
                ["system", "Automatique", "globe"],
                ["light", "Clair", "sun"],
                ["dark", "Sombre", "moon"],
              ] as const
            ).map(([v, l, i]) => (
              <button key={v} className={s.settings.theme === v ? "on" : ""} onClick={() => set((d) => void (d.settings.theme = v))}>
                <Icon name={i} size={15} /> {l}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          Voix anglaise
          <div className="row">
            <select className="select grow" value={s.settings.voiceURI} onChange={(e) => set((d) => void (d.settings.voiceURI = e.target.value))}>
              <option value="">Automatique (meilleure disponible)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <button className="btn soft icon" onClick={() => speak("Hello! This is how I sound. Let's learn English together.")} aria-label="Tester la voix">
              <Icon name="volume" size={18} />
            </button>
          </div>
        </label>
        <label className="field">
          <span>
            Vitesse de lecture <span className="hint">({s.settings.rate.toFixed(2)}×)</span>
          </span>
          <input type="range" min={0.6} max={1.2} step={0.05} value={s.settings.rate} onChange={(e) => set((d) => void (d.settings.rate = Number(e.target.value)))} />
        </label>
        <label className="row" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={s.settings.autoplay} onChange={(e) => set((d) => void (d.settings.autoplay = e.target.checked))} style={{ width: 20, height: 20 }} />
          <span>Prononcer automatiquement les nouveaux mots</span>
        </label>
      </section>

      <section className="card stack">
        <div className="row">
          <Icon name="sparkles" />
          <h2 style={{ fontSize: 20 }}>Coach IA</h2>
        </div>
        <AiSettings />
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 20 }}>Mes données</h2>
        <p className="muted small">Ta progression est enregistrée dans ce navigateur. Exporte-la régulièrement pour la sauvegarder ou la transférer sur un autre appareil.</p>
        <div className="row wrap">
          <button
            className="btn outline"
            onClick={() => {
              const blob = new Blob([exportData()], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `anglais365-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Icon name="download" size={17} /> Exporter
          </button>
          <button className="btn outline" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={17} /> Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const data = JSON.parse(await f.text()) as State;
                if (data.version !== 1 || !data.profile) throw new Error();
                replaceState({ ...data, settings: { ...s.settings, ...data.settings, apiKey: s.settings.apiKey, geminiKey: s.settings.geminiKey } });
                toast("Sauvegarde restaurée ✓");
              } catch {
                toast("Fichier de sauvegarde invalide");
              }
              e.target.value = "";
            }}
          />
          <span className="grow" />
          <button
            className="btn danger"
            onClick={() => {
              if (confirm("Effacer toute ta progression ? Cette action est irréversible (pense à exporter avant).")) {
                resetState();
                location.hash = "/";
              }
            }}
          >
            <Icon name="trash" size={17} /> Tout réinitialiser
          </button>
        </div>
      </section>

      <p className="faint tiny center">
        Anglais 365 · <LevelBadge level="A1" /> → <LevelBadge level="C1" /> · fait avec soin pour apprendre chaque jour
      </p>
    </div>
  );
}
