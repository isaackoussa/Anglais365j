// Compte en ligne : connexion par code e-mail, sauvegarde de la progression, rappels.
import { useSyncExternalStore } from "react";
import { LEVELS } from "../data/types";
import { estimatedLevel, levelProgress, programStats } from "./curriculum";
import { mastery } from "./srs";
import { dueWords } from "./curriculum";
import { getState, replaceState, streak, subscribeStore, type State } from "./store";

const SESSION_KEY = "anglais365j:session";

export interface Session {
  email: string;
  token: string;
  local?: boolean; // mode local (développement, sans serveur)
}

export interface Prefs {
  days: number[];
  time: string;
  tz: string;
  push: boolean;
  email: boolean;
  weekly: boolean;
  milestones: boolean;
}

// ————— Session —————

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let session: Session | null = readSession();
const listeners = new Set<() => void>();

function setSession(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* stockage indisponible */
  }
  listeners.forEach((l) => l());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

export const getSession = () => session;

// ————— Appels API —————

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public data: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (session && !session.local) headers.set("Authorization", `Bearer ${session.token}`);
  let res: Response;
  try {
    res = await fetch(`./api/${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "network");
  }
  const type = res.headers.get("content-type") ?? "";
  // Sans serveur (ex. « npm run dev »), Vite renvoie la page HTML : on le signale clairement
  if (!type.includes("application/json")) throw new ApiError(res.status, res.status === 404 || type.includes("html") ? "no_server" : "bad_response");
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && session && !session.local) setSession(null);
    throw new ApiError(res.status, String(data.error ?? "error"), data);
  }
  return data as T;
}

export const AUTH_ERRORS: Record<string, string> = {
  network: "Connexion impossible. Vérifie ta connexion internet.",
  no_server: "Le serveur n'est pas disponible ici (mode développement). Lance l'app avec « netlify dev » ou utilise la version en ligne.",
  mail_not_configured: "L'envoi d'e-mails n'est pas encore configuré (BREVO_API_KEY et MAIL_FROM dans Netlify).",
  mail_send_failed: "L'e-mail n'a pas pu être envoyé. Vérifie l'adresse et réessaie.",
  invalid_email: "Cette adresse e-mail n'est pas valide.",
  too_soon: "Patiente 30 secondes avant de redemander un code.",
  no_code: "Aucun code en cours pour cette adresse : redemande un code.",
  expired: "Ce code a expiré : redemande un code.",
  wrong_code: "Code incorrect.",
  too_many_attempts: "Trop d'essais : redemande un nouveau code.",
  blocked: "Ce compte est suspendu.",
};

export function authError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "wrong_code" && typeof e.data.remaining === "number") return `Code incorrect (${e.data.remaining} essai${e.data.remaining > 1 ? "s" : ""} restant${e.data.remaining > 1 ? "s" : ""}).`;
    return AUTH_ERRORS[e.code] ?? `Erreur (${e.status}).`;
  }
  return "Erreur inattendue.";
}

export function sendCode(email: string) {
  return api<{ ok: true }>("auth/send-code", { method: "POST", body: JSON.stringify({ email }) });
}

export async function verifyCode(email: string, code: string) {
  const res = await api<{ token: string; email: string; isNew: boolean; prefs: Prefs; pushEnabled: boolean; state: State | null; updatedAt: string | null }>(
    "auth/verify",
    { method: "POST", body: JSON.stringify({ email, code, name: getState().profile.name, tz: timezone() }) },
  );
  setSession({ email: res.email, token: res.token });
  const local = getState();
  // La sauvegarde en ligne la plus avancée l'emporte ; les clés d'IA locales sont conservées
  if (res.state && (res.state.sessionsDone ?? 0) >= local.sessionsDone && (res.state.xp ?? 0) >= local.xp) {
    replaceState({ ...res.state, settings: { ...local.settings, ...res.state.settings, apiKey: local.settings.apiKey, geminiKey: local.settings.geminiKey } });
  } else {
    await pushProgress(true);
  }
  prefsCache = { prefs: res.prefs, pushEnabled: res.pushEnabled };
  return res;
}

export function continueLocally() {
  setSession({ email: "local", token: "", local: true });
}

export async function logout() {
  try {
    if (session && !session.local) await api("me", { method: "DELETE" });
  } catch {
    /* déjà expirée */
  }
  setSession(null);
}

// ————— Résumé de progression (pour les e-mails, rappels et la console admin) —————

export function buildSummary(s: State) {
  const { level, working } = estimatedLevel(s);
  const stats = programStats(s);
  const st = streak(s);
  const completed = Object.values(s.days)
    .filter((d) => d.completed)
    .map((d) => d.date)
    .sort();
  return {
    name: s.profile.name,
    startLevel: s.profile.startLevel,
    targetLevel: s.profile.targetLevel,
    level,
    working,
    workingPct: levelProgress(s, working).pct,
    programPct: stats.pct,
    finishDate: stats.finishDate,
    streak: st.current,
    bestStreak: st.best,
    xp: s.xp,
    wordsLearned: Object.keys(s.words).length,
    wordsMastered: Object.values(s.words).filter((p) => mastery(p) === "mastered").length,
    lessonsDone: Object.keys(s.grammarDone).length,
    sessionsDone: s.sessionsDone,
    lastSessionDate: completed.at(-1) ?? null,
    dueToday: dueWords(s).length,
    levels: Object.fromEntries(LEVELS.map((l) => [l, levelProgress(s, l).pct])),
  };
}

// ————— Synchronisation automatique —————

let timer: number | undefined;
let lastSent = "";
export type SyncStatus = "idle" | "saving" | "saved" | "offline";
let syncStatus: SyncStatus = "idle";
const syncListeners = new Set<() => void>();
const setStatus = (s: SyncStatus) => {
  syncStatus = s;
  syncListeners.forEach((l) => l());
};

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      syncListeners.add(l);
      return () => syncListeners.delete(l);
    },
    () => syncStatus,
  );
}

export async function pushProgress(force = false) {
  if (!session || session.local) return;
  const s = getState();
  const { apiKey: _a, geminiKey: _g, ...settings } = s.settings;
  // Les conversations avec le coach restent sur l'appareil (volumineuses et personnelles)
  const state = { ...s, settings, chats: {} };
  const payload = JSON.stringify({ state, summary: buildSummary(s), updatedAt: new Date().toISOString() });
  const fingerprint = JSON.stringify(state);
  if (!force && fingerprint === lastSent) return;
  setStatus("saving");
  try {
    await api("progress", { method: "PUT", body: payload });
    lastSent = fingerprint;
    setStatus("saved");
  } catch {
    setStatus("offline");
  }
}

/** Sauvegarde en ligne quelques secondes après chaque modification. */
export function startSync() {
  subscribeStore(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => pushProgress(), 4000);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pushProgress();
  });
  window.addEventListener("online", () => pushProgress());
}

// ————— Préférences de rappel —————

let prefsCache: { prefs: Prefs; pushEnabled: boolean } | null = null;

export async function loadPrefs() {
  if (prefsCache) return prefsCache;
  const me = await api<{ prefs: Prefs; pushEnabled: boolean }>("me");
  prefsCache = { prefs: me.prefs, pushEnabled: me.pushEnabled };
  return prefsCache;
}

export async function savePrefs(patch: Partial<Prefs> & { subscription?: PushSubscriptionJSON | null }) {
  const res = await api<{ prefs: Prefs; pushEnabled: boolean }>("prefs", { method: "PUT", body: JSON.stringify({ ...patch, tz: timezone() }) });
  prefsCache = res;
  return res;
}

export function testReminder() {
  return api<{ push?: string; email?: string }>("prefs/test", { method: "POST" });
}

export const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";

// ————— Notifications push —————

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Demande l'autorisation et abonne cet appareil aux notifications. */
export async function enablePush(): Promise<"ok" | "denied" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("./sw.js"));
  await navigator.serviceWorker.ready;
  const { vapidPublicKey } = await api<{ vapidPublicKey: string }>("config");
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
  await savePrefs({ push: true, subscription: sub.toJSON() as PushSubscriptionJSON });
  return "ok";
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe();
  await savePrefs({ push: false, subscription: null });
}

// ————— Console admin —————

export interface AdminUser {
  email: string;
  createdAt: string;
  lastSeen: string;
  opens: number;
  blocked: boolean;
  reminders: { days: number[]; time: string; push: boolean; email: boolean };
  summary: ReturnType<typeof buildSummary> | null;
}

export async function adminList(key: string): Promise<AdminUser[]> {
  const res = await fetch("./api/admin", { headers: { "x-admin-key": key } });
  if (!res.ok) throw new ApiError(res.status, res.status === 401 ? "unauthorized" : "error");
  return ((await res.json()) as { users: AdminUser[] }).users;
}

export async function adminBlock(key: string, email: string, blocked: boolean) {
  await fetch("./api/admin", { method: "POST", headers: { "x-admin-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ email, blocked }) });
}

