import { useState } from "react";
import { Icon } from "../components/Icon";
import { LevelBadge, Stat, toast } from "../components/ui";
import { adminBlock, adminList, type AdminUser } from "../lib/cloud";
import { formatShort } from "../lib/date";

const KEY = "anglais365j:admin";
const DAYS = ["D", "L", "M", "M", "J", "V", "S"];

/** Console admin (clé ADMIN_KEY) : élèves, progression, rappels. */
export function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) ?? "");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (k = key) => {
    setLoading(true);
    try {
      setUsers(await adminList(k));
      sessionStorage.setItem(KEY, k);
    } catch {
      toast("Clé admin invalide ou serveur indisponible");
    } finally {
      setLoading(false);
    }
  };

  if (!users) {
    return (
      <div className="container narrow">
        <div className="page-head">
          <h1>Console admin</h1>
          <p>Suivi des élèves et de leur progression.</p>
        </div>
        <form
          className="card row wrap"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input className="input grow" type="password" placeholder="Clé admin (ADMIN_KEY)" value={key} onChange={(e) => setKey(e.target.value)} style={{ minWidth: 220 }} />
          <button className="btn primary" disabled={!key || loading}>
            {loading ? "Chargement…" : "Ouvrir"}
          </button>
        </form>
      </div>
    );
  }

  const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const active = users.filter((u) => u.lastSeen >= week).length;
  const list = users.filter((u) => u.email.includes(q.toLowerCase()) || u.summary?.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="container stack-lg">
      <div className="page-head row between wrap" style={{ marginBottom: 0 }}>
        <div>
          <h1>Console admin</h1>
          <p>{users.length} élève(s) inscrit(s).</p>
        </div>
        <button className="btn outline" onClick={() => load()}>
          <Icon name="refresh" size={16} /> Actualiser
        </button>
      </div>
      <div className="grid-4">
        <Stat icon="user" value={users.length} label="Comptes" />
        <Stat icon="flame" value={active} label="Actifs sur 7 jours" tint="accent" />
        <Stat icon="words" value={users.reduce((a, u) => a + (u.summary?.wordsLearned ?? 0), 0)} label="Mots appris (total)" tint="success" />
        <Stat icon="calendar" value={users.filter((u) => u.reminders.push || u.reminders.email).length} label="Rappels activés" tint="warning" />
      </div>
      <div className="search">
        <Icon name="search" size={18} />
        <input className="input" placeholder="Rechercher un élève…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="stack-sm">
        {list.map((u) => (
          <div key={u.email} className="card pad-sm" style={{ opacity: u.blocked ? 0.55 : 1 }}>
            <div className="row between wrap" style={{ gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <b>{u.summary?.name || u.email}</b>
                {u.summary?.name && <span className="faint small"> · {u.email}</span>}
                <div className="faint tiny">
                  Inscrit le {formatShort(u.createdAt.slice(0, 10))} · vu le {formatShort(u.lastSeen.slice(0, 10))} · {u.opens} connexion(s)
                </div>
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                {u.summary && (
                  <>
                    <LevelBadge level={u.summary.working} />
                    <span className="chip accent">🔥 {u.summary.streak}</span>
                    <span className="chip">{u.summary.wordsLearned} mots</span>
                    <span className="chip">{u.summary.sessionsDone} sessions</span>
                    <span className="chip brand">{u.summary.programPct}%</span>
                  </>
                )}
                <span className="chip" title="Rappels">
                  {u.reminders.push || u.reminders.email ? `${[...u.reminders.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAYS[d]).join("")} ${u.reminders.time}${u.reminders.push ? " 🔔" : ""}${u.reminders.email ? " ✉️" : ""}` : "sans rappel"}
                </span>
                <button
                  className={`btn sm ${u.blocked ? "soft" : "danger"}`}
                  onClick={async () => {
                    await adminBlock(key, u.email, !u.blocked);
                    load();
                  }}
                >
                  {u.blocked ? "Débloquer" : "Bloquer"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
