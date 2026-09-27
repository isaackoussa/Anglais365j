// Client minimal pour l'API Gemini (Google AI Studio), appelée directement depuis le navigateur.
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", desc: "Le plus intelligent des Flash (recommandé)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", desc: "Ultra rapide et très économique" },
];

export class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
    public reason?: string,
  ) {
    super(message);
  }
}

export interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

async function fail(res: Response): Promise<never> {
  let message = res.statusText;
  let reason: string | undefined;
  try {
    const body = await res.json();
    message = body?.error?.message ?? message;
    reason = body?.error?.details?.find((d: { reason?: string }) => d.reason)?.reason ?? body?.error?.status;
  } catch {
    /* corps non JSON */
  }
  throw new GeminiError(res.status, message, reason);
}

function body(system: string, turns: GeminiTurn[], json = false) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: json ? { responseMimeType: "application/json" } : {},
  });
}

function textOf(chunk: unknown): string {
  const c = chunk as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  return (c.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
}

/** Réponse en streaming (Server-Sent Events). */
export async function streamGemini(
  key: string,
  model: string,
  system: string,
  turns: GeminiTurn[],
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: body(system, turns),
    signal,
  });
  if (!res.ok || !res.body) await fail(res);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let blocked = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        const chunk = JSON.parse(data);
        const delta = textOf(chunk);
        if (delta) {
          full += delta;
          onText(full);
        }
        blocked = chunk?.promptFeedback?.blockReason ?? blocked;
      } catch {
        /* ligne incomplète : ignorée */
      }
    }
  }
  if (!full && blocked) throw new GeminiError(400, "blocked", "SAFETY");
  return full;
}

/** Réponse JSON (non streamée), pour générer du contenu structuré. */
export async function generateGeminiJson<T>(key: string, model: string, system: string, prompt: string): Promise<T> {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: body(system, [{ role: "user", text: prompt }], true),
  });
  if (!res.ok) await fail(res);
  const text = textOf(await res.json())
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "");
  return JSON.parse(text) as T;
}

/** Modèles disponibles pour cette clé (ceux qui savent générer du texte). */
export async function listGeminiModels(key: string): Promise<{ id: string; label: string }[]> {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) await fail(res);
  const data = (await res.json()) as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /gemini/i.test(m.name) && !/embedding|image|tts|audio|live/i.test(m.name))
    .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName ?? m.name }));
}
