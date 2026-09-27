import { useMemo } from "react";
import { Icon } from "../components/Icon";
import { Bar, LevelBadge, ProgressRing, SpeakButton, Stat } from "../components/ui";
import { LEVELS } from "../data/types";
import {
  FOCUS_INFO,
  LEVEL_INFO,
  dueWords,
  estimatedLevel,
  findWord,
  focusForDay,
  levelIndex,
  levelProgress,
  nextLesson,
  nextNewWords,
  nextReading,
  programDay,
  programStats,
} from "../lib/curriculum";
import { addDays, dayKey, formatLong, formatShort, parseDay } from "../lib/date";
import { navigate } from "../lib/router";
import { streak, todayLog, useAppState } from "../lib/store";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Bonsoir";
  if (h < 12) return "Good morning";
  if (h < 18) return "Hello";
  return "Good evening";
}

export function Home() {
  const s = useAppState();
  const today = dayKey();
  const log = todayLog(s);
  const day = programDay(s);
  const due = dueWords(s);
  const remainingNew = Math.max(0, s.profile.dailyNew - log.newWords.length);
  const fresh = nextNewWords(s, remainingNew);
  const focus = focusForDay(s);
  const focusTitle = focus === "grammar" ? nextLesson(s)?.title : focus === "reading" ? nextReading(s)?.title : FOCUS_INFO[focus].label;
  const st = streak(s);
  const stats = programStats(s);
  const { level, working } = estimatedLevel(s);
  const wp = levelProgress(s, working);
  const learnedCount = Object.keys(s.words).length;

  const last7 = Object.values(s.days).filter((d) => d.date > addDays(today, -7));
  const answered = last7.reduce((a, d) => a + d.answered, 0);
  const accuracy = answered ? Math.round((last7.reduce((a, d) => a + d.correct, 0) / answered) * 100) : null;

  const wordOfDay = useMemo(() => {
    const ids = Object.keys(s.words);
    if (!ids.length) return fresh[0];
    const seed = parseDay(today).getTime() / 86400000;
    return findWord(s, ids[Math.floor(seed) % ids.length]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, learnedCount]);

  const steps = [
    { icon: "repeat", label: "Révisions", value: due.length ? `${Math.min(due.length, 40)} mots` : "À jour ✓", done: due.length === 0 },
    { icon: "sparkles", label: "Nouveaux mots", value: fresh.length ? `${fresh.length} mots` : "Fait ✓", done: fresh.length === 0 },
    { icon: FOCUS_INFO[focus].icon, label: FOCUS_INFO[focus].label, value: focusTitle ?? "", done: log.completed },
    { icon: "refresh", label: "Le tour", value: "Consolidation", done: log.completed },
  ];

  return (
    <div className="container stack-lg">
      <header className="row between wrap rise" style={{ marginTop: 8 }}>
        <div>
          <div className="eyebrow" style={{ textTransform: "none", letterSpacing: 0, fontSize: 14 }}>
            {formatLong(today).replace(/^./, (c) => c.toUpperCase())}
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", marginTop: 4 }}>
            {greeting()}
            {s.profile.name ? `, ${s.profile.name}` : ""} 👋
          </h1>
        </div>
        <div className="row">
          <span className="chip accent" title="Série de jours">
            <Icon name="flame" size={15} fill /> {st.current} jour{st.current > 1 ? "s" : ""}
          </span>
          <span className="chip warning" title="Points d'expérience">
            <Icon name="zap" size={15} fill /> {s.xp} XP
          </span>
        </div>
      </header>

      <section className="hero rise" style={{ animationDelay: "0.05s" }}>
        <div className="hero-grid">
          <div>
            <div className="row wrap" style={{ gap: 8 }}>
              <span className="chip">
                <Icon name="calendar" size={14} /> Jour {day} du programme
              </span>
              <span className="chip">
                {s.profile.startLevel} → {s.profile.targetLevel}
              </span>
            </div>
            <h1 style={{ marginTop: 16 }}>{log.completed ? "Session du jour terminée ✨" : "Ta session du jour t'attend"}</h1>
            <p style={{ marginTop: 8, fontSize: 17, maxWidth: 520 }}>
              {log.completed
                ? "Bravo ! Tu peux continuer avec une session bonus ou réviser librement."
                : `Environ ${Math.max(10, Math.round((Math.min(due.length, 40) * 12 + fresh.length * 40 + 360) / 60))} minutes pour avancer vers ${s.profile.targetLevel}.`}
            </p>
            <div className="row wrap" style={{ marginTop: 20 }}>
              <button className="btn lg primary" onClick={() => navigate("/session")}>
                <Icon name="play" size={18} fill /> {log.completed ? "Session bonus" : "Commencer"}
              </button>
              {due.length > 0 && log.completed && (
                <button className="btn lg" style={{ background: "rgba(255,255,255,.18)", color: "white" }} onClick={() => navigate("/review")}>
                  Réviser {due.length} mots
                </button>
              )}
            </div>
          </div>
          <div className="hero-ring">
            <ProgressRing value={stats.pct / 100} size={150} stroke={14} color="white" track="rgba(255,255,255,.22)">
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{stats.pct}%</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>du programme</div>
              </div>
            </ProgressRing>
          </div>
        </div>
        <div className="plan-steps">
          {steps.map((st) => (
            <div key={st.label} className={`plan-step ${st.done ? "done" : ""}`}>
              <div className="ico">
                <Icon name={st.done ? "check" : st.icon} size={17} stroke={st.done ? 3 : 2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span>{st.label}</span>
                <b>{st.value}</b>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid-4 rise" style={{ animationDelay: "0.1s" }}>
        <Stat icon="flame" value={st.current} label={`Série · record ${st.best}`} tint="accent" />
        <Stat icon="words" value={learnedCount} label="Mots dans ton répertoire" tint="brand" />
        <Stat icon="book" value={`${stats.lessonsDone}/${stats.lessons}`} label="Leçons de grammaire" tint="success" />
        <Stat icon="target" value={accuracy === null ? "—" : `${accuracy}%`} label="Précision sur 7 jours" tint="warning" />
      </section>

      <section className="grid-2 rise" style={{ animationDelay: "0.15s" }}>
        <div className="card stack">
          <div className="row between">
            <div>
              <div className="eyebrow">Ton niveau estimé</div>
              <div className="row" style={{ marginTop: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 800 }}>{level}</span>
                <Icon name="arrowRight" size={18} className="faint" />
                <LevelBadge level={working} />
                <span className="muted small">en cours</span>
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => navigate("/progress")}>
              Détails <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div>
            <div className="row between small" style={{ marginBottom: 8 }}>
              <span className="muted">
                {LEVEL_INFO[working].name} · {LEVEL_INFO[working].desc}
              </span>
              <b>{wp.pct}%</b>
            </div>
            <Bar value={wp.pct / 100} color={LEVEL_INFO[working].color} />
          </div>
          <div className="row" style={{ gap: 6 }}>
            {LEVELS.map((lv) => {
              const p = levelProgress(s, lv).pct;
              const active = levelIndex(lv) >= levelIndex(s.profile.startLevel) && levelIndex(lv) <= levelIndex(s.profile.targetLevel);
              return (
                <div key={lv} className="grow" style={{ opacity: active ? 1 : 0.35 }} title={`${lv} : ${p}%`}>
                  <Bar value={p / 100} thin color={LEVEL_INFO[lv].color} />
                  <div className="tiny faint center" style={{ marginTop: 4, fontWeight: 700 }}>
                    {lv}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="tip" style={{ background: "var(--brand-soft)", color: "var(--brand-ink)" }}>
            <Icon name="target" />
            <span>
              À ton rythme ({s.profile.dailyNew} mots/jour), objectif <b>{s.profile.targetLevel}</b> vers le <b>{formatShort(stats.finishDate)}</b> — encore ~{stats.daysLeft} sessions.
            </span>
          </div>
        </div>

        <div className="stack">
          {wordOfDay && (
            <div className="card" style={{ background: "linear-gradient(150deg, var(--accent-soft), var(--surface) 65%)" }}>
              <div className="eyebrow">Mot du jour</div>
              <div className="row" style={{ marginTop: 10 }}>
                <SpeakButton text={wordOfDay.en} />
                <div className="grow">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{wordOfDay.en}</div>
                  <div className="muted">{wordOfDay.fr}</div>
                </div>
              </div>
              {wordOfDay.ex && <p className="small muted" style={{ marginTop: 12, fontStyle: "italic" }}>“{wordOfDay.ex}”</p>}
            </div>
          )}
          <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <QuickAction icon="repeat" title="Réviser" sub={due.length ? `${due.length} mots dus` : "Entraînement libre"} to="/review" tint="brand" />
            <QuickAction icon="sparkles" title="Coach IA" sub="Parler, corriger" to="/coach" tint="accent" />
            <QuickAction icon="words" title="Répertoire" sub={`${learnedCount} mots`} to="/words" tint="success" />
            <QuickAction icon="cap" title="Cours" sub="Grammaire & lectures" to="/learn" tint="warning" />
          </div>
        </div>
      </section>

      <WeekStrip />
    </div>
  );
}

function QuickAction({ icon, title, sub, to, tint }: { icon: string; title: string; sub: string; to: string; tint: string }) {
  return (
    <button className="card interactive pad-sm" style={{ textAlign: "left", border: "1px solid var(--line)" }} onClick={() => navigate(to)}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: `var(--${tint}-soft)`,
          color: `var(--${tint})`,
          marginBottom: 10,
        }}
      >
        <Icon name={icon} size={19} />
      </div>
      <b style={{ display: "block" }}>{title}</b>
      <span className="faint small">{sub}</span>
    </button>
  );
}

function WeekStrip() {
  const s = useAppState();
  const today = dayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  return (
    <section className="card rise" style={{ animationDelay: "0.2s" }}>
      <div className="section-title">
        <h2>Ta semaine</h2>
        <button className="btn ghost sm" onClick={() => navigate("/progress")}>
          Voir mes progrès <Icon name="chevronRight" size={16} />
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {days.map((d) => {
          const log = s.days[d];
          const done = log?.completed;
          const partial = !done && (log?.answered ?? 0) > 0;
          return (
            <div key={d} className="center">
              <div className="tiny faint" style={{ textTransform: "capitalize", marginBottom: 6 }}>
                {fmt.format(parseDay(d)).replace(".", "")}
              </div>
              <div
                style={{
                  height: 44,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: done ? "linear-gradient(135deg, var(--accent), #ff9a6b)" : partial ? "var(--accent-soft)" : "var(--surface-2)",
                  color: done ? "white" : "var(--ink-3)",
                  outline: d === today ? "2px solid var(--brand)" : undefined,
                  outlineOffset: 2,
                }}
              >
                {done ? <Icon name="flame" size={20} fill /> : <span className="small bold">{parseDay(d).getDate()}</span>}
              </div>
              <div className="tiny faint" style={{ marginTop: 4 }}>
                {log?.xp ? `${log.xp} xp` : " "}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
