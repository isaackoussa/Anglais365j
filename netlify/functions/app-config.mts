import type { Config } from "@netlify/functions";
import { json } from "../lib/common.mts";
import { mailConfigured } from "../lib/mail.mts";
import { vapid } from "../lib/push.mts";

// Configuration publique pour l'app (clé publique VAPID, état du service mail)
export default async () => {
  const { publicKey } = await vapid();
  return json(200, { ok: true, mail: mailConfigured(), vapidPublicKey: publicKey });
};

export const config: Config = { path: "/api/config" };
