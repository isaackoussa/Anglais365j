// Contenu des rappels, bilans et e-mails de paliers, personnalisé selon la progression.
import { addDays, type Profile, type Summary } from "./common.mts";
import { appUrl, bar, esc, hello, layout, statRow } from "./mail.mts";

/** Statistiques calculées côté serveur à partir de l'état complet sauvegardé. */
export interface StoredState {
  words?: Record<string, { due: string; learnedOn: string; interval: number }>;
  days?: Record<string, { xp: number; completed: boolean; newWords: string[]; answered: number; correct: number; minutes: number }>;
}

export function dueCount(state: StoredState | null, today: string): number {
  if (!state?.words) return 0;
  return Object.values(state.words).filter((w) => w.due <= today).length;
}

export function weekStats(state: StoredState | null, today: string) {
  const from = addDays(today, -6);
  const days = Object.entries(state?.days ?? {}).filter(([d]) => d >= from && d <= today).map(([, v]) => v);
  const answered = days.reduce((a, d) => a + (d.answered ?? 0), 0);
  return {
    sessions: days.filter((d) => d.completed).length,
    xp: days.reduce((a, d) => a + (d.xp ?? 0), 0),
    newWords: days.reduce((a, d) => a + (d.newWords?.length ?? 0), 0),
    minutes: days.reduce((a, d) => a + (d.minutes ?? 0), 0),
    accuracy: answered ? Math.round((days.reduce((a, d) => a + (d.correct ?? 0), 0) / answered) * 100) : null,
    activeDays: days.filter((d) => (d.answered ?? 0) > 0).length,
  };
}

// ————— Rappel (push + e-mail) —————

export function reminderText(s: Summary | null, due: number, today: string) {
  const name = s?.name ? `${s.name}, ` : "";
  const missed = s?.lastSessionDate ? Math.max(0, daysBetween(today, s.lastSessionDate) - 1) : 0;
  let title: string;
  let body: string;
  if (s && s.streak >= 2) {
    title = `🔥 ${s.streak} jours d'affilée : on continue ?`;
    body = `${name}ta série t'attend. ${due ? `${due} mot${due > 1 ? "s" : ""} à réviser aujourd'hui.` : "Ta session du jour est prête."}`;
  } else if (missed >= 2) {
    title = "Ton anglais t'attend 🇬🇧";
    body = `${name}ça fait ${missed} jours ! ${due ? `${due} mots sont prêts à être révisés avant de s'effacer.` : "10 minutes suffisent pour reprendre le rythme."}`;
  } else {
    title = "C'est l'heure de ta session d'anglais ✨";
    body = `${name}${due ? `${due} mot${due > 1 ? "s" : ""} à réviser + ` : ""}de nouveaux mots et une leçon t'attendent.`;
  }
  return { title, body };
}

export function reminderEmail(p: Profile, due: number, today: string) {
  const s = p.summary;
  const { title, body } = reminderText(s, due, today);
  const html = layout({
    preheader: body,
    title,
    body: `<p style="margin:0 0 12px">${hello(s?.name)}</p>
<p style="margin:0 0 8px">${esc(body)}</p>
${s ? statRow([[`🔥 ${s.streak}`, "série"], [String(due), "à réviser"], [String(s.wordsLearned), "mots appris"]]) : ""}
${s ? `<p style="margin:0 0 6px;font-size:14px;color:#4f4d66">Niveau ${esc(s.working)} en cours · ${s.workingPct} %</p>${bar(s.workingPct)}` : ""}`,
    cta: { label: "Commencer ma session", href: `${appUrl()}/#/session` },
  });
  return { subject: title, html };
}

// ————— Bilan hebdomadaire —————

export function weeklyEmail(p: Profile, state: StoredState | null, today: string) {
  const s = p.summary;
  const w = weekStats(state, today);
  const verdict =
    w.sessions >= 6 ? "Semaine parfaite, bravo ! 🏆" : w.sessions >= 4 ? "Très belle semaine 💪" : w.sessions >= 1 ? "Chaque session compte 🌱" : "Nouvelle semaine, nouveau départ 🚀";
  const html = layout({
    preheader: `${w.sessions} session(s), ${w.newWords} nouveaux mots cette semaine`,
    title: "Ton bilan de la semaine",
    body: `<p style="margin:0 0 12px">${hello(s?.name)}</p>
<p style="margin:0 0 4px"><b>${verdict}</b></p>
${statRow([[`${w.sessions}/7`, "sessions"], [String(w.newWords), "nouveaux mots"], [`${w.xp}`, "XP gagnés"]])}
${statRow([[w.accuracy === null ? "—" : `${w.accuracy} %`, "précision"], [`${w.minutes} min`, "d'étude"], [`🔥 ${s?.streak ?? 0}`, "série actuelle"]])}
${
  s
    ? `<p style="margin:18px 0 6px;font-size:15px"><b>Ton parcours ${esc(s.startLevel)} → ${esc(s.targetLevel)}</b> · ${s.programPct} %</p>${bar(s.programPct, "#ff6a3d")}
<p style="margin:14px 0 6px;font-size:14px;color:#4f4d66">Niveau ${esc(s.working)} en cours · ${s.workingPct} %</p>${bar(s.workingPct)}
<p style="margin:14px 0 0;font-size:14px;color:#4f4d66">📚 ${s.wordsLearned} mots dans ton répertoire, dont ${s.wordsMastered} maîtrisés · ${s.lessonsDone} leçons de grammaire terminées.</p>
<p style="margin:8px 0 0;font-size:14px;color:#4f4d66">🎯 À ce rythme, objectif ${esc(s.targetLevel)} vers le <b>${formatDate(s.finishDate)}</b>.</p>`
    : ""
}`,
    cta: { label: "Continuer mon programme", href: `${appUrl()}/#/` },
  });
  return { subject: `📊 Ton bilan : ${w.sessions} session${w.sessions > 1 ? "s" : ""}, ${w.newWords} nouveaux mots`, html };
}

// ————— Paliers —————

interface Milestone {
  id: string;
  title: string;
  text: string;
  emoji: string;
}

export function newMilestones(prev: Summary | null, next: Summary, already: string[]): Milestone[] {
  const out: Milestone[] = [];
  const seen = new Set(already);
  const add = (m: Milestone) => {
    if (!seen.has(m.id)) out.push(m);
  };
  if (next.sessionsDone >= 1) add({ id: "first-session", emoji: "🎉", title: "Première session terminée !", text: "Le plus dur est fait : tu as lancé ton programme. Reviens demain pour tes premières révisions." });
  for (const n of [7, 30, 100, 200, 365])
    if (next.streak >= n) add({ id: `streak-${n}`, emoji: "🔥", title: `${n} jours d'affilée !`, text: `Incroyable régularité : ${n} jours de suite. C'est exactement ce qui fait progresser.` });
  for (const n of [100, 250, 500, 750, 900])
    if (next.wordsLearned >= n) add({ id: `words-${n}`, emoji: "📚", title: `${n} mots dans ton répertoire !`, text: `Tu connais maintenant ${n} mots et expressions. Ils reviennent régulièrement pour rester gravés.` });
  if (next.level && next.level !== "Pré-A1" && next.level !== prev?.level && levelRank(next.level) >= levelRank(next.startLevel))
    add({ id: `level-${next.level}`, emoji: "🏅", title: `Niveau ${next.level} validé !`, text: `Tu as validé le niveau ${next.level}. Cap sur ${next.working} !` });
  return out;
}

export function milestoneEmail(p: Profile, m: Milestone) {
  const s = p.summary;
  const html = layout({
    preheader: m.text,
    title: `${m.emoji} ${m.title}`,
    body: `<p style="margin:0 0 12px">${hello(s?.name)}</p><p style="margin:0 0 8px">${esc(m.text)}</p>
${s ? statRow([[`🔥 ${s.streak}`, "série"], [String(s.wordsLearned), "mots"], [`${s.programPct} %`, "du programme"]]) : ""}`,
    cta: { label: "Voir mes progrès", href: `${appUrl()}/#/progress` },
  });
  return { subject: `${m.emoji} ${m.title}`, html };
}

export function welcomeEmail(name?: string) {
  return {
    subject: "Bienvenue dans Anglais 365 🇬🇧",
    html: layout({
      preheader: "Ton programme quotidien pour passer à B2 ou C1 commence maintenant.",
      title: "Bienvenue dans Anglais 365 !",
      body: `<p style="margin:0 0 12px">${hello(name)}</p>
<p style="margin:0 0 12px">Ton compte est créé : ta progression est sauvegardée et te suit sur tous tes appareils.</p>
<p style="margin:0 0 6px"><b>Chaque jour, en 10 à 30 minutes :</b></p>
<ul style="margin:0 0 12px;padding-left:20px"><li>tes révisions (répétition espacée)</li><li>de nouveaux mots</li><li>une leçon, une lecture, une dictée ou un exercice de prononciation</li><li>« le tour » de tout ce que tu as déjà vu</li></ul>
<p style="margin:0">Pense à choisir tes jours et ton heure de rappel dans <b>Réglages → Rappels</b>.</p>`,
      cta: { label: "Commencer ma première session", href: `${appUrl()}/#/session` },
    }),
  };
}

export function codeEmail(code: string) {
  return {
    subject: `${code} est ton code Anglais 365`,
    html: layout({
      preheader: `Ton code de connexion : ${code}`,
      title: "Ton code de connexion",
      body: `<p style="margin:0 0 12px">Voici ton code pour te connecter à Anglais 365 :</p>
<p style="margin:0 0 16px;font-size:36px;font-weight:800;letter-spacing:8px;color:#5b4bff">${code}</p>
<p style="margin:0;font-size:14px;color:#4f4d66">Il est valable 10 minutes. Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.</p>`,
    }),
  };
}

function levelRank(l: string): number {
  return ["A1", "A2", "B1", "B2", "C1"].indexOf(l);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

function formatDate(key: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
  } catch {
    return key;
  }
}
