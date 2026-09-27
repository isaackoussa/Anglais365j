import type { Config } from "@netlify/functions";
import { authenticate, json, localParts, readJson, saveProfile, states, type Prefs } from "../lib/common.mts";
import { sendMail } from "../lib/mail.mts";
import { dueCount, reminderEmail, reminderText } from "../lib/messages.mts";
import { sendPush } from "../lib/push.mts";

// PUT /api/prefs : jours, heure, canaux · POST /api/prefs/test : rappel de test immédiat
export default async (req: Request) => {
  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { profile, email } = auth;
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname.endsWith("/test")) {
    const today = localParts(profile.prefs.tz).date;
    const due = dueCount(await states().get(email, { type: "json" }), today);
    const result: Record<string, string> = {};
    if (profile.prefs.push) {
      const { title, body } = reminderText(profile.summary, due, today);
      result.push = await sendPush(profile, { title, body, url: "./#/session", tag: "reminder" });
    }
    if (profile.prefs.email) {
      const mail = reminderEmail(profile, due, today);
      result.email = (await sendMail(email, mail.subject, mail.html)).ok ? "ok" : "error";
    }
    return json(200, result);
  }

  if (req.method !== "PUT") return json(405, { error: "method_not_allowed" });
  const body = await readJson<Partial<Prefs>>(req);
  if (!body) return json(400, { error: "bad_request" });
  const p = profile.prefs;
  if (Array.isArray(body.days)) p.days = [...new Set(body.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort();
  if (typeof body.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) p.time = body.time;
  if (typeof body.tz === "string" && body.tz.length < 64) p.tz = body.tz;
  for (const k of ["push", "email", "weekly", "milestones"] as const) if (typeof body[k] === "boolean") p[k] = body[k];
  if (body.subscription === null) p.subscription = null;
  else if (body.subscription?.endpoint?.startsWith("https://") && body.subscription.keys?.p256dh && body.subscription.keys?.auth) p.subscription = body.subscription;
  if (!p.subscription) p.push = false;
  await saveProfile(profile);
  const { subscription, ...prefs } = p;
  return json(200, { prefs, pushEnabled: !!subscription });
};

export const config: Config = { path: ["/api/prefs", "/api/prefs/test"] };
