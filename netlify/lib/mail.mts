// Envoi d'e-mails via Brevo + gabarits HTML.
import { env, type Summary } from "./common.mts";

/** MAIL_DRY_RUN=1 : les e-mails sont écrits dans les logs au lieu d'être envoyés (tests locaux). */
const dryRun = () => env("MAIL_DRY_RUN") === "1";

export function mailConfigured(): boolean {
  return dryRun() || !!(env("BREVO_API_KEY") && env("MAIL_FROM"));
}

export function appUrl(): string {
  return (env("APP_URL") ?? env("URL") ?? "https://anglais365.netlify.app").replace(/\/$/, "");
}

export async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; status?: number; details?: string }> {
  if (dryRun()) {
    console.log(`[MAIL_DRY_RUN] à ${to} — ${subject}\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 600)}`);
    return { ok: true };
  }
  const key = env("BREVO_API_KEY");
  const from = env("MAIL_FROM");
  if (!key || !from) return { ok: false, details: "mail_not_configured" };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: env("MAIL_FROM_NAME") ?? "Anglais 365" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    console.error("Brevo: échec d'envoi", res.status, details);
    return { ok: false, status: res.status, details };
  }
  return { ok: true };
}

/**
 * Met à jour le contact Brevo avec la progression (attributs), pour pouvoir
 * créer des campagnes / automatisations dans Brevo. Sans effet si non configuré.
 */
export async function syncBrevoContact(email: string, s: Summary | null) {
  const key = env("BREVO_API_KEY");
  if (!key) return;
  const listId = Number(env("BREVO_LIST_ID"));
  const attributes: Record<string, string | number> = {};
  if (s) {
    if (s.name) attributes.PRENOM = s.name;
    Object.assign(attributes, {
      NIVEAU: s.level,
      NIVEAU_EN_COURS: s.working,
      OBJECTIF: s.targetLevel,
      PROGRESSION: s.programPct,
      SERIE: s.streak,
      MOTS: s.wordsLearned,
      XP: s.xp,
      SESSIONS: s.sessionsDone,
    });
    if (s.lastSessionDate) attributes.DERNIERE_SESSION = s.lastSessionDate;
  }
  const body = JSON.stringify({ email, attributes, updateEnabled: true, ...(listId ? { listIds: [listId] } : {}) });
  const post = (b: string) =>
    fetch("https://api.brevo.com/v3/contacts", { method: "POST", headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" }, body: b });
  try {
    let res = await post(body);
    // Si des attributs n'existent pas encore dans Brevo, on enregistre au moins le contact
    if (!res.ok && res.status === 400) res = await post(JSON.stringify({ email, updateEnabled: true, ...(listId ? { listIds: [listId] } : {}) }));
    if (!res.ok) console.warn("Brevo contact:", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.warn("Brevo contact:", e);
  }
}

// ————— Gabarits —————

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function layout(opts: { preheader: string; title: string; body: string; cta?: { label: string; href: string } }): string {
  const cta = opts.cta
    ? `<tr><td align="center" style="padding:8px 32px 32px"><a href="${opts.cta.href}" style="display:inline-block;background:#5b4bff;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:14px">${esc(opts.cta.label)}</a></td></tr>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#17162b">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(40,30,120,.12)">
<tr><td style="background:linear-gradient(135deg,#5b4bff,#7a4dff 55%,#ff6a3d);background-color:#5b4bff;padding:28px 32px;color:#ffffff">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.2);text-align:center;font-weight:800;font-size:14px;color:#fff">365</td>
<td style="padding-left:12px;font-weight:800;font-size:18px;color:#fff">Anglais 365</td></tr></table>
<h1 style="margin:18px 0 0;font-size:26px;line-height:1.2;color:#ffffff">${esc(opts.title)}</h1>
</td></tr>
<tr><td style="padding:28px 32px 12px;font-size:16px;line-height:1.6">${opts.body}</td></tr>
${cta}
</table>
<p style="font-size:12px;color:#8a879e;margin:16px 0 0">Tu reçois cet e-mail car tu as un compte Anglais 365. Gère tes rappels dans <a href="${appUrl()}/#/settings" style="color:#5b4bff">Réglages → Rappels</a>.</p>
</td></tr></table></body></html>`;
}

export function statRow(items: [string, string][]): string {
  const cells = items
    .map(
      ([v, l]) =>
        `<td align="center" style="padding:14px 6px;background:#f3efe8;border-radius:14px"><div style="font-size:24px;font-weight:800;color:#17162b">${esc(v)}</div><div style="font-size:12px;color:#8a879e">${esc(l)}</div></td>`,
    )
    .join('<td style="width:8px"></td>');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr>${cells}</tr></table>`;
}

export function bar(pct: number, color = "#5b4bff"): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebe6dc;border-radius:999px"><tr><td style="width:${p}%;background:${color};height:10px;border-radius:999px;font-size:0">&nbsp;</td><td style="font-size:0">&nbsp;</td></tr></table>`;
}

export const hello = (name?: string) => (name ? `Hello ${esc(name)} 👋` : "Hello 👋");
export { esc };
