import { useEffect, useState } from "react";
import { authError, disablePush, enablePush, loadPrefs, logout, pushSupported, savePrefs, testReminder, useSession, useSyncStatus, type Prefs } from "../lib/cloud";
import { Icon } from "./Icon";
import { toast } from "./ui";

const DAYS = [
  { d: 1, l: "L", full: "lundi" },
  { d: 2, l: "M", full: "mardi" },
  { d: 3, l: "M", full: "mercredi" },
  { d: 4, l: "J", full: "jeudi" },
  { d: 5, l: "V", full: "vendredi" },
  { d: 6, l: "S", full: "samedi" },
  { d: 0, l: "D", full: "dimanche" },
];

/** Réglages → Rappels : jours, heure, notifications, e-mails (Brevo). */
export function Reminders() {
  const session = useSession();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [push, setPush] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session || session.local) return;
    loadPrefs()
      .then((r) => {
        setPrefs(r.prefs);
        setPush(r.pushEnabled && r.prefs.push);
      })
      .catch((e) => setError(authError(e)));
  }, [session]);

  if (!session || session.local)
    return <p className="muted small">Les rappels nécessitent un compte en ligne (version déployée de l'app).</p>;
  if (error) return <p className="small" style={{ color: "var(--danger)" }}>{error}</p>;
  if (!prefs) return <div className="skeleton" style={{ height: 180 }} />;

  const save = async (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      await savePrefs(patch);
    } catch (e) {
      toast(authError(e));
    }
  };

  const togglePush = async () => {
    setBusy(true);
    try {
      if (push) {
        await disablePush();
        setPush(false);
        toast("Notifications désactivées sur cet appareil");
      } else {
        const r = await enablePush();
        if (r === "ok") {
          setPush(true);
          toast("Notifications activées 🔔");
        } else if (r === "denied") toast("Autorise les notifications pour ce site dans ton navigateur");
        else toast("Ce navigateur ne gère pas les notifications. Sur iPhone : ajoute l'app à l'écran d'accueil d'abord.");
      }
    } catch (e) {
      toast(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const selected = DAYS.filter((d) => prefs.days.includes(d.d));

  return (
    <div className="stack">
      <div className="field">
        Jours de rappel
        <div className="row wrap" style={{ gap: 8 }}>
          {DAYS.map((d) => {
            const on = prefs.days.includes(d.d);
            return (
              <button
                key={d.d}
                title={d.full}
                aria-pressed={on}
                onClick={() => save({ days: on ? prefs.days.filter((x) => x !== d.d) : [...prefs.days, d.d] })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: 0,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: on ? "var(--brand)" : "var(--surface-2)",
                  color: on ? "white" : "var(--ink-2)",
                  boxShadow: on ? "0 6px 14px -6px var(--brand)" : "none",
                }}
              >
                {d.l}
              </button>
            );
          })}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="chip" onClick={() => save({ days: [1, 2, 3, 4, 5, 6, 0] })}>
            Tous les jours
          </button>
          <button className="chip" onClick={() => save({ days: [1, 2, 3, 4, 5] })}>
            Semaine
          </button>
          <button className="chip" onClick={() => save({ days: [1, 3, 5] })}>
            Lun · Mer · Ven
          </button>
        </div>
      </div>

      <label className="field">
        Heure du rappel
        <input
          className="input"
          type="time"
          step={900}
          value={prefs.time}
          style={{ maxWidth: 160 }}
          onChange={(e) => {
            // arrondi au quart d'heure (les rappels partent toutes les 15 minutes)
            const [h, m] = e.target.value.split(":").map(Number);
            if (Number.isNaN(h)) return;
            const q = Math.round(m / 15) * 15;
            const t = `${String((h + (q === 60 ? 1 : 0)) % 24).padStart(2, "0")}:${String(q % 60).padStart(2, "0")}`;
            save({ time: t });
          }}
        />
        <span className="hint">
          {selected.length
            ? `Rappel le ${selected.map((d) => d.full).join(", ")} à ${prefs.time}, seulement si ta session du jour n'est pas encore faite.`
            : "Aucun jour sélectionné : pas de rappel."}
        </span>
      </label>

      <div className="stack-sm">
        <Toggle
          icon="zap"
          title="Notifications sur cet appareil"
          desc={pushSupported() ? "Une notification sur ton téléphone ou ordinateur, même app fermée." : "Non disponible sur ce navigateur (sur iPhone : ajoute l'app à l'écran d'accueil)."}
          on={push}
          disabled={busy || !pushSupported()}
          onChange={togglePush}
        />
        <Toggle icon="chat" title="Rappel par e-mail" desc="Un e-mail avec ta série, les mots à réviser et ton niveau." on={prefs.email} onChange={() => save({ email: !prefs.email })} />
        <Toggle icon="chart" title="Bilan hebdomadaire" desc="Chaque dimanche : sessions, nouveaux mots, précision, progression vers ton objectif." on={prefs.weekly} onChange={() => save({ weekly: !prefs.weekly })} />
        <Toggle icon="trophy" title="E-mails de paliers" desc="Félicitations quand tu valides un niveau, atteins 7/30/100 jours de série, 100/500 mots…" on={prefs.milestones} onChange={() => save({ milestones: !prefs.milestones })} />
      </div>

      <button
        className="btn soft"
        style={{ alignSelf: "flex-start" }}
        disabled={!push && !prefs.email}
        onClick={async () => {
          try {
            const r = await testReminder();
            toast(r.push === "ok" || r.email === "ok" ? "Rappel de test envoyé ✓" : "L'envoi a échoué");
          } catch (e) {
            toast(authError(e));
          }
        }}
      >
        <Icon name="send" size={16} /> Envoyer un rappel de test
      </button>
    </div>
  );
}

function Toggle({ icon, title, desc, on, onChange, disabled }: { icon: string; title: string; desc: string; on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button className={`choice ${on ? "on" : ""}`} style={{ padding: 14, opacity: disabled && !on ? 0.6 : 1 }} onClick={onChange} disabled={disabled} role="switch" aria-checked={on}>
      <div className="brand-mark" style={{ width: 38, height: 38, flex: "none", borderRadius: 12, background: on ? undefined : "var(--surface-3)", boxShadow: on ? undefined : "none", color: on ? "white" : "var(--ink-3)" }}>
        <Icon name={icon} size={18} />
      </div>
      <div className="grow">
        <b style={{ display: "block" }}>{title}</b>
        <span className="faint small">{desc}</span>
      </div>
      <span
        aria-hidden
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          flex: "none",
          background: on ? "var(--success)" : "var(--surface-3)",
          position: "relative",
          transition: "background .2s",
        }}
      >
        <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "var(--shadow-sm)" }} />
      </span>
    </button>
  );
}

/** Réglages → Mon compte. */
export function Account() {
  const session = useSession();
  const status = useSyncStatus();
  if (!session) return null;
  return (
    <div className="row wrap between">
      <div className="row">
        <div className="brand-mark" style={{ width: 42, height: 42 }}>
          <Icon name="user" size={20} />
        </div>
        <div>
          <b style={{ display: "block" }}>{session.local ? "Mode local (sans compte)" : session.email}</b>
          <span className="faint small">
            {session.local
              ? "Progression enregistrée uniquement sur cet appareil"
              : status === "saving"
                ? "Sauvegarde en cours…"
                : status === "offline"
                  ? "Hors ligne : sauvegarde dès le retour du réseau"
                  : "Progression sauvegardée en ligne ✓"}
          </span>
        </div>
      </div>
      <button
        className="btn outline sm"
        onClick={async () => {
          if (confirm("Se déconnecter de cet appareil ? Ta progression reste sauvegardée dans ton compte.")) await logout();
        }}
      >
        Se déconnecter
      </button>
    </div>
  );
}
