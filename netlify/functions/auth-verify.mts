import type { Config } from "@netlify/functions";
import { DEFAULT_PREFS, EMAIL_RE, cleanEmail, codes, hash, json, newToken, profiles, readJson, saveProfile, sessions, states, type Profile } from "../lib/common.mts";
import { sendMail, syncBrevoContact } from "../lib/mail.mts";
import { welcomeEmail } from "../lib/messages.mts";

const MAX_ATTEMPTS = 5;

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const body = await readJson<{ email?: string; code?: string; name?: string; tz?: string }>(req);
  const email = cleanEmail(body?.email);
  const code = String(body?.code ?? "").replace(/\D/g, "");
  if (!EMAIL_RE.test(email) || code.length !== 6) return json(400, { error: "bad_request" });

  const store = codes();
  const record = (await store.get(email, { type: "json" })) as { hash: string; expiresAt: number; attempts: number } | null;
  if (!record) return json(400, { error: "no_code" });
  if (Date.now() > record.expiresAt) {
    await store.delete(email);
    return json(400, { error: "expired" });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await store.delete(email);
    return json(429, { error: "too_many_attempts" });
  }
  if (record.hash !== hash(`${email}:${code}`)) {
    record.attempts += 1;
    await store.setJSON(email, record);
    return json(400, { error: "wrong_code", remaining: MAX_ATTEMPTS - record.attempts });
  }
  await store.delete(email);

  const now = new Date().toISOString();
  let profile = (await profiles().get(email, { type: "json" })) as Profile | null;
  const isNew = !profile;
  if (!profile) {
    profile = { email, createdAt: now, lastSeen: now, opens: 0, prefs: { ...DEFAULT_PREFS, tz: body?.tz || DEFAULT_PREFS.tz }, summary: null, updatedAt: null, milestones: [] };
  }
  if (profile.blocked) return json(403, { error: "blocked" });
  profile.opens += 1;
  profile.lastSeen = now;
  await saveProfile(profile);

  const token = newToken();
  await sessions().setJSON(hash(token), { email, createdAt: now });

  if (isNew) {
    const w = welcomeEmail(body?.name?.trim() || undefined);
    await sendMail(email, w.subject, w.html);
    await syncBrevoContact(email, null);
  }

  const state = await states().get(email, { type: "json" });
  const { subscription: _omit, ...prefs } = profile.prefs;
  return json(200, { token, email, isNew, prefs, pushEnabled: !!_omit, state, updatedAt: profile.updatedAt });
};

export const config: Config = { path: "/api/auth/verify" };
