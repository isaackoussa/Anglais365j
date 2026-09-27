import { useState } from "react";
import { Icon } from "../components/Icon";
import { Bar, Stat } from "../components/ui";
import { LEVELS } from "../data/types";
import { LEVEL_INFO, estimatedLevel, inProgram, levelProgress, programStats } from "../lib/curriculum";
import { addDays, dayKey, formatShort, parseDay } from "../lib/date";
import { mastery } from "../lib/srs";
import { streak, useAppState } from "../lib/store";

export function Progress() {
  const s = useAppState();
  const st = streak(s);
  const stats = programStats(s);
  const { working } = estimatedLevel(s);
  const days = Object.values(s.days);
  const minutes = days.reduce((a, d) => a + d.minutes, 0);
  const answered = days.reduce((a, d) => a + d.answered, 0);
  const correct = days.reduce((a, d) => a + d.correct, 0);
  const m = { learning: 0, known: 0, mastered: 0 };
  for (const p of Object.values(s.words)) {
    const k = mastery(p);
    if (k !== "new") m[k]++;
  }
  const total = m.learning + m.known + m.mastered;

  return (
    <div className="container stack-lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1>Mes progrès</h1>
        <p>
          Programme {s.profile.startLevel} → {s.profile.targetLevel}, commencé le {formatShort(s.profile.startedOn)}.
        </p>
      </div>

      <div className="grid-4">
        <Stat icon="calendar" value={s.sessionsDone} label="Sessions terminées" tint="brand" />
        <Stat icon="flame" value={`${st.current} / ${st.best}`} label="Série actuelle / record" tint="accent" />
        <Stat icon="clock" value={minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : `${minutes} min`} label="Temps d'étude" tint="success" />
        <Stat icon="target" value={answered ? `${Math.round((correct / answered) * 100)}%` : "—"} label={`Précision · ${answered} réponses`} tint="warning" />
      </div>

      <section className="card stack">
        <div className="section-title" style={{ marginBottom: 0 }}>
          <h2>Mémorisation du vocabulaire</h2>
          <span className="faint small">{total} mots</span>
        </div>
        {total > 0 ? (
          <>
            <div className="row" style={{ gap: 2, height: 16, borderRadius: 8, overflow: "hidden" }}>
              {(
                [
                  ["learning", "var(--warning)"],
                  ["known", "var(--brand)"],
                  ["mastered", "var(--success)"],
                ] as const
              ).map(([k, c]) => (m[k] ? <div key={k} style={{ flex: m[k], background: c, height: "100%" }} title={`${m[k]} mots`} /> : null))}
            </div>
            <div className="row wrap small" style={{ gap: 18 }}>
              <Legend color="var(--warning)" label="En cours" value={m.learning} hint="révisés dans moins de 6 jours" />
              <Legend color="var(--brand)" label="Acquis" value={m.known} hint="intervalle de 6 à 20 jours" />
              <Legend color="var(--success)" label="Maîtrisés" value={m.mastered} hint="intervalle de 3 semaines et plus" />
            </div>
          </>
        ) : (
          <p className="muted small">Tes mots apparaîtront ici après ta première session.</p>
        )}
      </section>

      <section className="grid-2">
        <div className="card stack">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <h2>XP des 30 derniers jours</h2>
          </div>
          <XpChart />
        </div>
        <div className="card stack">
          <div className="section-title" style={{ marginBottom: 0 }}>
            <h2>Régularité</h2>
            <span className="faint small">20 dernières semaines</span>
          </div>
          <Heatmap />
          <div className="row tiny faint" style={{ gap: 6, justifyContent: "flex-end" }}>
            Moins
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="heatmap" style={{ display: "inline-block" }}>
                <i data-l={l} style={{ display: "block" }} />
              </span>
            ))}
            Plus
          </div>
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Ton parcours A1 → C1</h2>
          <span className="faint small">
            Objectif {s.profile.targetLevel} · ~{formatShort(stats.finishDate)}
          </span>
        </div>
        <div className="level-path">
          {LEVELS.map((lv) => {
            const p = levelProgress(s, lv);
            const active = inProgram(s, lv);
            const current = lv === working;
            return (
              <div
                key={lv}
                className={`level-node ${!active ? "locked" : ""} ${current ? "current" : ""}`}
                style={{ ["--lv" as string]: LEVEL_INFO[lv].color }}
              >
                <div className="lv">{lv}</div>
                <div className="stack-sm" style={{ minWidth: 0 }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <b>{LEVEL_INFO[lv].name}</b>
                    {current && <span className="chip brand">En cours</span>}
                    {!active && <span className="chip">Hors programme</span>}
                    {p.pct >= 75 && <span className="chip success">Validé</span>}
                  </div>
                  <span className="muted small">{LEVEL_INFO[lv].desc}</span>
                  <Bar value={p.pct / 100} thin color={LEVEL_INFO[lv].color} />
                  <span className="tiny faint">
                    {p.learned}/{p.words} mots · {p.mastered} maîtrisés · {p.lessonsDone}/{p.lessons} leçons
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800 }}>{p.pct}%</div>
              </div>
            );
          })}
        </div>
        <p className="faint small" style={{ marginTop: 12 }}>
          <Icon name="info" size={14} className="faint" /> Un niveau est validé à 75 % : mots appris et consolidés + leçons de grammaire terminées.
        </p>
      </section>

      {s.writings.length > 0 && (
        <section className="card">
          <div className="section-title">
            <h2>Mes textes</h2>
            <span className="faint small">{s.writings.length}</span>
          </div>
          <div className="stack-sm">
            {s.writings.slice(0, 8).map((w, i) => (
              <details key={i} className="card flat pad-sm">
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {formatShort(w.date)} · {w.prompt}
                </summary>
                <p className="muted small" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {w.text}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Legend({ color, label, value, hint }: { color: string; label: string; value: number; hint: string }) {
  return (
    <div className="row-sm" title={hint}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span className="muted">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function XpChart() {
  const s = useAppState();
  const [hover, setHover] = useState<number | null>(null);
  const today = dayKey();
  const data = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, i - 29);
    return { d, xp: s.days[d]?.xp ?? 0 };
  });
  const max = Math.max(50, ...data.map((x) => x.xp));
  const niceMax = Math.ceil(max / 50) * 50;
  const W = 600;
  const H = 180;
  const pad = { l: 34, r: 4, t: 10, b: 22 };
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / niceMax);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const h = hover !== null ? data[hover] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="XP gagnés par jour sur 30 jours" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(niceMax * t)} y2={y(niceMax * t)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(niceMax * t) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">
              {niceMax * t}
            </text>
          </g>
        ))}
        {data.map((x, i) => {
          const bh = Math.max(0, H - pad.b - y(x.xp));
          const bx = pad.l + i * bw + 1;
          const w = Math.max(2, bw - 2);
          const r = Math.min(4, w / 2, bh);
          return (
            <g key={x.d} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${bx},${H - pad.b} V${H - pad.b - bh + r} Q${bx},${H - pad.b - bh} ${bx + r},${H - pad.b - bh} H${bx + w - r} Q${bx + w},${H - pad.b - bh} ${bx + w},${H - pad.b - bh + r} V${H - pad.b} Z`}
                  fill={x.d === today ? "var(--accent)" : "var(--brand)"}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line-strong)" />
        {[0, 14, 29].map((i) => (
          <text key={i} x={pad.l + i * bw + bw / 2} y={H - 6} textAnchor={i === 0 ? "start" : i === 29 ? "end" : "middle"} fontSize={11} fill="var(--ink-3)">
            {i === 29 ? "Aujourd'hui" : fmt.format(parseDay(data[i].d))}
          </text>
        ))}
      </svg>
      {h && (
        <div
          className="tiny"
          style={{
            position: "absolute",
            top: 0,
            left: `${((pad.l + (hover! + 0.5) * bw) / W) * 100}%`,
            transform: `translateX(${hover! > 22 ? "-100%" : hover! < 6 ? "0" : "-50%"})`,
            background: "var(--ink)",
            color: "var(--surface)",
            padding: "6px 10px",
            borderRadius: 8,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {fmt.format(parseDay(h.d))} · <b>{h.xp} XP</b>
        </div>
      )}
    </div>
  );
}

function Heatmap() {
  const s = useAppState();
  const today = dayKey();
  const todayDow = (parseDay(today).getDay() + 6) % 7; // lundi = 0
  const weeks = 20;
  const start = addDays(today, -(weeks - 1) * 7 - todayDow);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  return (
    <div className="heatmap" role="img" aria-label="Activité quotidienne">
      {cells.map((d) => {
        if (d > today) return <i key={d} style={{ visibility: "hidden" }} />;
        const xp = s.days[d]?.xp ?? 0;
        const l = xp === 0 ? 0 : xp < 60 ? 1 : xp < 150 ? 2 : xp < 300 ? 3 : 4;
        return <i key={d} data-l={l} className={d === today ? "today" : ""} title={`${formatShort(d)} : ${xp} XP`} />;
      })}
    </div>
  );
}
