// Fonctions partagées par les fonctions Netlify d'Anglais 365.
import { getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "node:crypto";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 6 mois

/** Résumé de progression envoyé par l'app (sert aux e-mails, rappels et à la console admin). */
export interface Summary {
  name: string;
  startLevel: string;
  targetLevel: string;
  level: string; // niveau validé
  working: string; // niveau en cours
  workingPct: number;
  programPct: number;
  finishDate: string;
  streak: number;
  bestStreak: number;
  xp: number;
  wordsLearned: number;
  wordsMastered: number;
  lessonsDone: number;
  sessionsDone: number;
  lastSessionDate: string | null; // yyyy-mm-dd (heure locale de l'élève)
  dueToday: number;
}

export interface Prefs {
  days: number[]; // 0 = dimanche … 6 = samedi
  time: string; // "19:00"
  tz: string; // fuseau horaire IANA
  push: boolean;
  email: boolean;
  weekly: boolean;
  milestones: boolean;
  subscription?: PushSubscriptionJSON | null;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface Profile {
  email: string;
  createdAt: string;
  lastSeen: string;
  opens: number;
  blocked?: boolean;
  prefs: Prefs;
  summary: Summary | null;
  updatedAt: string | null; // dernière sauvegarde de progression
  lastReminder?: string; // date locale du dernier rappel
  lastWeekly?: string; // date locale du dernier bilan hebdomadaire
  milestones?: string[]; // paliers déjà célébrés
}

export const DEFAULT_PREFS: Prefs = {
  days: [1, 3, 5],
  time: "19:00",
  tz: "Europe/Paris",
  push: false,
  email: true,
  weekly: true,
  milestones: true,
  subscription: null,
};

/** Magasin Netlify Blobs, isolé entre production et aperçus. */
export function store(name: string) {
  const ctx = (globalThis as { Netlify?: { context?: { deploy?: { context?: string } } } }).Netlify?.context?.deploy?.context;
  const full = ctx && ctx !== "production" ? `preview-${name}` : name;
  const siteID = env("NETLIFY_SITE_ID");
  const token = env("NETLIFY_BLOBS_TOKEN");
  // Même contournement que MasterGraf si l'accès automatique aux Blobs n'est pas injecté
  if (siteID && token) return getStore({ name: full, siteID, token, consistency: "strong" });
  return getStore({ name: full, consistency: "strong" });
}

export const profiles = () => store("a365-profiles");
export const states = () => store("a365-states");
export const sessions = () => store("a365-sessions");
export const codes = () => store("a365-codes");
export const secrets = () => store("a365-secrets");

export function env(name: string): string | undefined {
  const n = (globalThis as { Netlify?: { env: { get(k: string): string | undefined } } }).Netlify;
  return n?.env.get(name) ?? process.env[name];
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export const cleanEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Vérifie le jeton « Authorization: Bearer … ». */
export async function authenticate(req: Request): Promise<{ email: string; profile: Profile } | Response> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "no_session" });
  const session = (await sessions().get(hash(token), { type: "json" })) as { email: string; createdAt: string } | null;
  if (!session || Date.now() - new Date(session.createdAt).getTime() > SESSION_MAX_AGE_MS) {
    return json(401, { error: "invalid_session" });
  }
  const profile = (await profiles().get(session.email, { type: "json" })) as Profile | null;
  if (!profile) return json(401, { error: "invalid_session" });
  if (profile.blocked) return json(403, { error: "blocked" });
  return { email: session.email, profile };
}

export async function saveProfile(p: Profile) {
  await profiles().setJSON(p.email, p);
}

// ————— Dates dans le fuseau de l'élève —————

export function localParts(tz: string, d = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(d);
  } catch {
    return localParts("Europe/Paris", d);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday, minutes: hour * 60 + Number(get("minute")) };
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
