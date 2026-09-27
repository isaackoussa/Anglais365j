// Notifications push (Web Push, standard VAPID).
import webpush from "web-push";
import { env, secrets, type Profile } from "./common.mts";

interface Vapid {
  publicKey: string;
  privateKey: string;
}

/** Clés VAPID : variables d'environnement si fournies, sinon générées une fois et conservées dans Blobs. */
export async function vapid(): Promise<Vapid> {
  const pub = env("VAPID_PUBLIC_KEY");
  const priv = env("VAPID_PRIVATE_KEY");
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const s = secrets();
  const existing = (await s.get("vapid", { type: "json" })) as Vapid | null;
  if (existing) return existing;
  const keys = webpush.generateVAPIDKeys();
  await s.setJSON("vapid", keys);
  return keys;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Envoie une notification. Retourne « gone » si l'abonnement n'existe plus (à supprimer). */
export async function sendPush(p: Profile, payload: PushPayload): Promise<"ok" | "gone" | "error" | "none"> {
  const sub = p.prefs.subscription;
  if (!sub) return "none";
  const keys = await vapid();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), {
      vapidDetails: { subject: `mailto:${env("MAIL_FROM") ?? "contact@anglais365.app"}`, publicKey: keys.publicKey, privateKey: keys.privateKey },
      TTL: 60 * 60 * 6,
    });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.warn("push:", status, (e as Error).message);
    return "error";
  }
}
