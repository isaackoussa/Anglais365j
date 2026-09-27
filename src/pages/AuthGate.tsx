import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { ApiError, authError, continueLocally, sendCode, verifyCode } from "../lib/cloud";

/** Barrière d'accès : l'élève entre son e-mail puis le code à 6 chiffres reçu (envoyé via Brevo). */
export function AuthGate() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noServer, setNoServer] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const request = async () => {
    setError("");
    setLoading(true);
    try {
      await sendCode(email.trim());
      setStep("code");
      setCooldown(30);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setError(authError(e));
      if (e instanceof ApiError && e.code === "no_server") setNoServer(true);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      await verifyCode(email.trim(), value);
    } catch (e) {
      setError(authError(e));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard">
      <div className="onboard-card stack-lg">
        <div className="brand">
          <div className="brand-mark">365</div>
          <div className="brand-name">
            Anglais 365<small>De A1 à C1, un jour après l'autre</small>
          </div>
        </div>

        <div className="card stack-lg rise" style={{ padding: "32px 28px", boxShadow: "var(--shadow-lg)" }}>
          {step === "email" ? (
            <form
              className="stack-lg"
              onSubmit={(e) => {
                e.preventDefault();
                request();
              }}
            >
              <div className="stack-sm">
                <h1 style={{ fontSize: "clamp(28px, 5vw, 38px)" }}>
                  Ton espace <span style={{ color: "var(--brand)" }}>personnel</span>
                </h1>
                <p className="muted">Connecte-toi avec ton e-mail : ta progression est sauvegardée et te suit sur tous tes appareils. Pas de mot de passe, juste un code.</p>
              </div>
              <label className="field">
                Adresse e-mail
                <input
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="toi@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </label>
              {error && <Alert text={error} />}
              <button className="btn primary lg" disabled={loading || !email.includes("@")}>
                {loading ? "Envoi du code…" : "Recevoir mon code"} {!loading && <Icon name="arrowRight" size={18} />}
              </button>
              <div className="stack-sm small muted">
                {[
                  ["repeat", "Ta progression sauvegardée en ligne, sur ordinateur et téléphone"],
                  ["calendar", "Des rappels aux jours et à l'heure que tu choisis"],
                  ["chart", "Un bilan de tes progrès chaque semaine par e-mail"],
                ].map(([i, t]) => (
                  <div key={t} className="row" style={{ gap: 10 }}>
                    <Icon name={i} size={16} className="faint" />
                    {t}
                  </div>
                ))}
              </div>
            </form>
          ) : (
            <form
              className="stack-lg"
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
            >
              <div className="stack-sm">
                <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start", marginLeft: -10 }} onClick={() => setStep("email")}>
                  <Icon name="arrowLeft" size={16} /> Changer d'e-mail
                </button>
                <h1 style={{ fontSize: "clamp(26px, 5vw, 34px)" }}>Vérifie ta boîte mail 📬</h1>
                <p className="muted">
                  Un code à 6 chiffres a été envoyé à <b style={{ color: "var(--ink)" }}>{email}</b>. Pense à regarder dans les spams.
                </p>
              </div>
              <input
                ref={codeRef}
                className="input big mono"
                style={{ letterSpacing: "0.5em", fontSize: 30 }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length === 6) verify(v);
                }}
              />
              {error && <Alert text={error} />}
              <button className="btn primary lg" disabled={loading || code.length !== 6}>
                {loading ? "Vérification…" : "Me connecter"}
              </button>
              <button type="button" className="btn ghost" disabled={cooldown > 0 || loading} onClick={request}>
                {cooldown > 0 ? `Renvoyer un code (${cooldown} s)` : "Renvoyer un code"}
              </button>
            </form>
          )}
        </div>

        {noServer && import.meta.env.DEV && (
          <div className="card flat pad-sm stack-sm rise">
            <b className="small">Mode développement</b>
            <p className="muted small">Les fonctions serveur ne tournent pas avec « npm run dev ». Tu peux tester l'app sans compte (progression locale uniquement).</p>
            <button
              className="btn outline sm"
              style={{ alignSelf: "flex-start" }}
              onClick={continueLocally}
            >
              Continuer en local
            </button>
          </div>
        )}
        <p className="faint tiny center">En continuant, tu acceptes de recevoir les e-mails liés à ton compte (code, rappels, bilans). Tu peux les désactiver à tout moment dans les Réglages.</p>
      </div>
    </div>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <div className="tip" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
      <Icon name="info" />
      <span>{text}</span>
    </div>
  );
}
