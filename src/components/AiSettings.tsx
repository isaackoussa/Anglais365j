import { useState } from "react";
import { GEMINI_MODELS, MODELS, friendlyError } from "../lib/ai";
import { listGeminiModels } from "../lib/gemini";
import { update, useAppState, type AiProvider } from "../lib/store";
import { Icon } from "./Icon";
import { toast } from "./ui";

const PROVIDERS: Record<AiProvider, { label: string; keyUrl: string; keyHost: string; placeholder: string; note: string }> = {
  gemini: {
    label: "Gemini (Google)",
    keyUrl: "https://aistudio.google.com/apikey",
    keyHost: "aistudio.google.com",
    placeholder: "AIza…",
    note: "Google AI Studio propose une offre gratuite (avec des limites par minute et par jour) : idéal pour démarrer.",
  },
  claude: {
    label: "Claude (Anthropic)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHost: "console.anthropic.com",
    placeholder: "sk-ant-…",
    note: "Paiement à l'usage : quelques centimes pour une longue conversation.",
  },
};

/** Choix du fournisseur d'IA, de la clé et du modèle (réglages + écran d'activation du coach). */
export function AiSettings({ compact = false }: { compact?: boolean }) {
  const s = useAppState();
  const provider = s.settings.provider;
  const info = PROVIDERS[provider];
  const [showKey, setShowKey] = useState(false);
  const [remote, setRemote] = useState<{ id: string; label: string }[] | null>(null);
  const [testing, setTesting] = useState(false);
  const key = provider === "gemini" ? s.settings.geminiKey : s.settings.apiKey;

  const setKey = (v: string) =>
    update((d) => {
      if (provider === "gemini") d.settings.geminiKey = v.trim();
      else d.settings.apiKey = v.trim();
    });

  const test = async () => {
    setTesting(true);
    try {
      const models = await listGeminiModels(key.trim());
      setRemote(models);
      toast(`Connexion réussie ✓ ${models.length} modèles disponibles`);
    } catch (e) {
      toast(friendlyError(e) || "Échec de la connexion");
    } finally {
      setTesting(false);
    }
  };

  const presets = provider === "gemini" ? GEMINI_MODELS : MODELS;
  const current = provider === "gemini" ? s.settings.geminiModel : s.settings.model;
  const extra = (remote ?? []).filter((m) => !presets.some((p) => p.id === m.id));

  return (
    <div className="stack">
      <div className="field">
        Fournisseur d'IA
        <div className="segmented">
          {(Object.keys(PROVIDERS) as AiProvider[]).map((p) => (
            <button
              key={p}
              className={provider === p ? "on" : ""}
              onClick={() => {
                update((d) => void (d.settings.provider = p));
                setRemote(null);
              }}
            >
              {PROVIDERS[p].label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>
          Clé API {provider === "gemini" ? "Gemini" : "Anthropic"}{" "}
          <span className="hint">
            — à créer sur{" "}
            <a href={info.keyUrl} target="_blank" rel="noreferrer">
              {info.keyHost}
            </a>
          </span>
        </span>
        <div className="row">
          <input
            className="input grow"
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={info.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn outline icon" onClick={() => setShowKey(!showKey)} aria-label="Afficher la clé">
            <Icon name="eye" size={18} />
          </button>
        </div>
        <span className="hint">
          {info.note} La clé reste uniquement dans ce navigateur et n'est jamais incluse dans les exports.
        </span>
      </label>

      {!compact && (
        <div className="field">
          Modèle
          <div className="choice-grid">
            {presets.map((m) => (
              <button
                key={m.id}
                className={`choice ${current === m.id ? "on" : ""}`}
                style={{ padding: 12 }}
                onClick={() =>
                  update((d) => {
                    if (provider === "gemini") d.settings.geminiModel = m.id;
                    else d.settings.model = m.id;
                  })
                }
              >
                <div>
                  <b style={{ display: "block" }}>{m.label}</b>
                  <span className="faint tiny">{m.desc}</span>
                </div>
              </button>
            ))}
          </div>
          {provider === "gemini" && (
            <div className="row wrap" style={{ marginTop: 4 }}>
              <button type="button" className="btn soft sm" onClick={test} disabled={!key.trim() || testing}>
                <Icon name="refresh" size={14} /> {testing ? "Vérification…" : "Tester ma clé et voir tous mes modèles"}
              </button>
              {extra.length > 0 && (
                <select
                  className="select"
                  style={{ width: "auto", height: 34, fontSize: 14 }}
                  value={extra.some((m) => m.id === current) ? current : ""}
                  onChange={(e) => e.target.value && update((d) => void (d.settings.geminiModel = e.target.value))}
                >
                  <option value="">Autres modèles ({extra.length})…</option>
                  {extra.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
