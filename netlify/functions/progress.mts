import type { Config } from "@netlify/functions";
import { authenticate, json, saveProfile, states, type Summary } from "../lib/common.mts";
import { sendMail, syncBrevoContact } from "../lib/mail.mts";
import { milestoneEmail, newMilestones } from "../lib/messages.mts";

const MAX_BYTES = 3_000_000;

// PUT : sauvegarde de la progression (état complet + résumé) et e-mails de paliers
export default async (req: Request) => {
  if (req.method !== "PUT") return json(405, { error: "method_not_allowed" });
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { profile, email } = auth;

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return json(413, { error: "too_large" });
  let body: { state?: Record<string, unknown>; summary?: Summary; updatedAt?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "bad_request" });
  }
  if (!body.state || !body.summary) return json(400, { error: "bad_request" });

  // Les clés d'IA ne quittent jamais l'appareil
  const settings = (body.state.settings ?? {}) as Record<string, unknown>;
  delete settings.apiKey;
  delete settings.geminiKey;

  const updatedAt = body.updatedAt ?? new Date().toISOString();
  await states().setJSON(email, body.state);

  const prev = profile.summary;
  profile.summary = body.summary;
  profile.updatedAt = updatedAt;
  profile.lastSeen = new Date().toISOString();

  // Paliers franchis → e-mail de félicitations (une seule fois chacun)
  const reached = newMilestones(prev, body.summary, profile.milestones ?? []);
  profile.milestones = [...(profile.milestones ?? []), ...reached.map((m) => m.id)];
  await saveProfile(profile);

  if (profile.prefs.milestones && reached.length) {
    // le palier le plus marquant seulement, pour ne pas inonder la boîte mail
    const m = reached[reached.length - 1];
    const mail = milestoneEmail(profile, m);
    await sendMail(email, mail.subject, mail.html);
  }
  // Attributs du contact Brevo (niveau, série, mots…) — au plus une fois par jour et à chaque palier
  if (reached.length || !prev || prev.lastSessionDate !== body.summary.lastSessionDate) await syncBrevoContact(email, body.summary);

  return json(200, { ok: true, updatedAt, milestones: reached.map((m) => m.title) });
};

export const config: Config = { path: "/api/progress" };
