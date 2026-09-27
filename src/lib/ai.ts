import type Anthropic from "@anthropic-ai/sdk";
import type { Level, Reading } from "../data/types";
import { estimatedLevel, findWord } from "./curriculum";
import { GEMINI_MODELS, GeminiError, generateGeminiJson, streamGemini } from "./gemini";
import { getState, type ChatMessage } from "./store";

export { GEMINI_MODELS };

export const MODELS = [
  { id: "claude-opus-5", label: "Claude Opus 5", desc: "Le plus fin pour corriger et expliquer (recommandé)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", desc: "Rapide et excellent, moins cher" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Le plus rapide et le plus économique" },
];

export function hasApiKey(): boolean {
  const st = getState().settings;
  return st.provider === "gemini" ? st.geminiKey.trim().length > 10 : st.apiKey.trim().startsWith("sk-");
}

/** Nom lisible du modèle utilisé par le coach. */
export function aiLabel(): string {
  const st = getState().settings;
  if (st.provider === "gemini") return GEMINI_MODELS.find((m) => m.id === st.geminiModel)?.label ?? st.geminiModel;
  return MODELS.find((m) => m.id === st.model)?.label ?? st.model;
}

// Le SDK n'est chargé qu'à la première utilisation de l'IA (bundle initial plus léger)
let SDK: typeof Anthropic | null = null;

async function client(): Promise<Anthropic> {
  SDK ??= (await import("@anthropic-ai/sdk")).default;
  return new SDK({ apiKey: getState().settings.apiKey.trim(), dangerouslyAllowBrowser: true });
}

function modelParams() {
  const model = getState().settings.model;
  // Haiku 4.5 ne prend pas le paramètre « effort »
  const effort = model.startsWith("claude-haiku") ? {} : { output_config: { effort: "medium" as const } };
  return { model, ...effort };
}

export function friendlyError(e: unknown): string {
  if (e instanceof DOMException && e.name === "AbortError") return "";
  if (e instanceof GeminiError) {
    if (e.reason === "API_KEY_INVALID" || e.status === 401) return "Clé API Gemini invalide. Vérifie-la dans les Réglages.";
    if (e.reason === "SAFETY") return "Gemini a bloqué cette demande. Essaie de reformuler.";
    if (e.status === 403) return "Cette clé Gemini n'a pas accès à ce modèle (ou l'API n'est pas activée). Essaie un autre modèle dans les Réglages.";
    if (e.status === 404) return "Modèle Gemini introuvable. Choisis un autre modèle dans les Réglages.";
    if (e.status === 429) return "Quota Gemini atteint (limite gratuite par minute ou par jour). Réessaie un peu plus tard.";
    if (e.status >= 500) return "Gemini est momentanément indisponible. Réessaie dans quelques secondes.";
    return `Erreur Gemini (${e.status}) : ${e.message}`;
  }
  if (e instanceof TypeError && /fetch/i.test(e.message)) return "Connexion impossible. Vérifie ta connexion internet.";
  const A = SDK;
  if (!A) return e instanceof Error ? e.message : "Erreur inconnue.";
  if (e instanceof A.AuthenticationError) return "Clé API invalide. Vérifie-la dans les Réglages.";
  if (e instanceof A.PermissionDeniedError) return "Cette clé n'a pas accès à ce modèle. Essaie un autre modèle dans les Réglages.";
  if (e instanceof A.NotFoundError) return "Modèle introuvable. Choisis un autre modèle dans les Réglages.";
  if (e instanceof A.RateLimitError) return "Trop de requêtes pour le moment. Réessaie dans quelques secondes.";
  if (e instanceof A.APIConnectionError) return "Connexion impossible. Vérifie ta connexion internet.";
  if (e instanceof A.APIUserAbortError) return "";
  if (e instanceof A.APIError) return `Erreur de l'API (${e.status ?? "?"}) : ${e.message}`;
  return e instanceof Error ? e.message : "Erreur inconnue.";
}

/** Contexte de l'apprenant injecté dans chaque conversation. */
function learnerContext(): string {
  const s = getState();
  const { level, working } = estimatedLevel(s);
  const progress = Object.values(s.words);
  const recent = [...progress]
    .sort((a, b) => (a.learnedOn < b.learnedOn ? 1 : -1))
    .slice(0, 40)
    .map((p) => findWord(s, p.id)?.en)
    .filter(Boolean);
  const weak = progress
    .filter((p) => p.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, 15)
    .map((p) => findWord(s, p.id)?.en)
    .filter(Boolean);
  return [
    `Learner: ${s.profile.name || "a French speaker"}, native language French.`,
    `Estimated CEFR level: ${level} (currently working on ${working}); goal: ${s.profile.targetLevel}.`,
    `Words learned so far: ${progress.length}.`,
    recent.length ? `Recently learned words (reuse them naturally when relevant): ${recent.join(", ")}.` : "",
    weak.length ? `Words the learner often forgets (recycle them): ${weak.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type CoachMode = "chat" | "correct" | "explain" | "roleplay";

export const COACH_MODES: Record<CoachMode, { label: string; icon: string; hint: string; placeholder: string }> = {
  chat: {
    label: "Conversation",
    icon: "chat",
    hint: "Discute librement en anglais. Le coach adapte son niveau et corrige tes erreurs en douceur.",
    placeholder: "Write in English… (ex : Hi! What did you do this weekend?)",
  },
  correct: {
    label: "Correcteur",
    icon: "pen",
    hint: "Colle un texte en anglais : tu reçois une version corrigée et l'explication de chaque erreur en français.",
    placeholder: "Colle ton texte en anglais à corriger…",
  },
  explain: {
    label: "Explique-moi",
    icon: "help",
    hint: "Pose n'importe quelle question (en français) sur la grammaire, un mot, une expression, la prononciation.",
    placeholder: "Ex : Quelle différence entre « make » et « do » ?",
  },
  roleplay: {
    label: "Jeu de rôle",
    icon: "theater",
    hint: "Entraîne-toi à des situations réelles : entretien, restaurant, aéroport, médecin…",
    placeholder: "Choisis une situation ci-dessus ou décris la tienne…",
  },
};

const VOCAB_FORMAT = `When useful, end your message with a short section exactly in this format (max 5 lines) listing useful new words or expressions from your message:
📌 Vocab
- english word or phrase | traduction française`;

function systemFor(mode: CoachMode): string {
  const base = `You are "Coach", a warm, encouraging and expert English tutor inside the app "Anglais 365", a daily programme that takes French speakers from A1/B1 to B2/C1.
${learnerContext()}

General rules:
- Adapt your vocabulary and sentence length to the learner's level (slightly above it, to stretch them).
- Keep answers concise and conversational: this is a chat on a phone screen. Use short paragraphs, **bold** for key words, and bullet lists when helpful.
- Never overwhelm: correct the 1-3 most important mistakes, not everything.`;

  switch (mode) {
    case "chat":
      return `${base}

Mode: free conversation.
- Reply in English. Keep the conversation going with one natural follow-up question.
- If the learner made mistakes, start with a brief correction block in this form, then continue the conversation:
  ✏️ *"their phrase"* → **"corrected phrase"** — explication courte en français
- If the learner writes in French, gently answer in simple English and show how to say what they meant.
${VOCAB_FORMAT}`;
    case "correct":
      return `${base}

Mode: text correction.
Structure your answer exactly like this:
### ✅ Version corrigée
(the full corrected text, keeping the learner's style and ideas)
### 🔎 Corrections
(a numbered list: « original » → **correction** — explanation in French, mention the grammar rule)
### 🚀 Version plus naturelle
(an upgraded version one level higher, B2/C1 style)
### 💬 Bilan
(one or two sentences in French: strengths + one priority to work on)`;
    case "explain":
      return `${base}

Mode: explanations. The learner asks questions in French.
- Answer in French, with clear rules, 3-4 English examples (with French translation), and common mistakes French speakers make.
- End with a mini exercise of 2-3 questions (answers hidden at the end under "Réponses").
${VOCAB_FORMAT}`;
    case "roleplay":
      return `${base}

Mode: role-play. You play a character in a real-life scenario chosen by the learner (job interview, restaurant, hotel, airport, doctor, phone call, meeting, negotiation, etc.).
- First message: set the scene in one line in French (in italics), then speak in character in English.
- Stay in character, keep each turn short (2-4 sentences), and make the learner talk.
- After each learner turn, if there's an important mistake, add a tiny line at the end: ✏️ correction — explication en français.
- If the learner writes "fin" or "stop", end the role-play and give feedback in French: strengths, 3 useful phrases to remember, a score /10.`;
  }
}

export async function streamCoach(
  mode: CoachMode,
  history: ChatMessage[],
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const st = getState().settings;
  if (st.provider === "gemini") {
    return streamGemini(
      st.geminiKey.trim(),
      st.geminiModel,
      systemFor(mode),
      history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", text: m.content })),
      onText,
      signal,
    );
  }
  const stream = (await client()).messages.stream(
    {
      ...modelParams(),
      max_tokens: 16000,
      system: systemFor(mode),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    },
    { signal },
  );
  let full = "";
  stream.on("text", (delta) => {
    full += delta;
    onText(full);
  });
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    full += "\n\n*(Le coach ne peut pas répondre à cette demande. Essaie de reformuler.)*";
    onText(full);
  }
  return full;
}

/** Correction d'un texte écrit pour l'exercice du jour. */
export async function correctWriting(prompt: string, text: string, onText: (full: string) => void, signal?: AbortSignal) {
  return streamCoach(
    "correct",
    [{ role: "user", content: `Writing task: "${prompt}"\n\nMy text:\n${text}`, at: Date.now() }],
    onText,
    signal,
  );
}

const READING_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    text: { type: "string", description: "3 paragraphs separated by blank lines" },
    glossary: {
      type: "array",
      items: {
        type: "object",
        properties: { en: { type: "string" }, fr: { type: "string" } },
        required: ["en", "fr"],
        additionalProperties: false,
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer", description: "index (0-based) of the correct option" },
        },
        required: ["q", "options", "answer"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "text", "glossary", "questions"],
  additionalProperties: false,
} as const;

function readingRequest(topic: string, working: Level): string {
  return `${learnerContext()}

Write an original, engaging reading text for this learner at CEFR level ${working}${topic ? ` about: ${topic}` : " on an interesting everyday or current-affairs topic"}.
- Length: ${working === "A1" ? "120-160" : working === "A2" ? "180-230" : working === "B1" ? "250-320" : "320-420"} words, 3 paragraphs.
- Naturally reuse 5-8 of the learner's recently learned words.
- glossary: 4-6 harder words from the text with French translations.
- questions: 3 multiple-choice comprehension questions in English, 3 options each.`;
}

/** Génère un nouveau texte de lecture sur mesure (niveau + mots récents). */
export async function generateReading(topic: string): Promise<Reading> {
  const s = getState();
  const { working } = estimatedLevel(s);
  const request = readingRequest(topic, working);
  if (s.settings.provider === "gemini") {
    const data = await generateGeminiJson<Omit<Reading, "id" | "level">>(
      s.settings.geminiKey.trim(),
      s.settings.geminiModel,
      "You write graded reading material for English learners. Reply with JSON only.",
      `${request}

Return a JSON object with exactly these keys:
{"title": string, "text": string (paragraphs separated by a blank line), "glossary": [{"en": string, "fr": string}], "questions": [{"q": string, "options": [string, string, string], "answer": number (0-based index of the correct option)}]}`,
    );
    return { ...data, id: `ai-${Date.now()}`, level: working };
  }
  const res = await (await client()).messages.create({
    ...modelParams(),
    max_tokens: 16000,
    output_config: {
      ...(modelParams().output_config ?? {}),
      format: { type: "json_schema", schema: READING_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: request,
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Réponse vide.");
  const data = JSON.parse(block.text) as Omit<Reading, "id" | "level">;
  return { ...data, id: `ai-${Date.now()}`, level: working };
}

/** Extrait les lignes « - mot | traduction » de la section 📌 Vocab d'un message. */
export function extractVocab(text: string): { en: string; fr: string }[] {
  const idx = text.indexOf("📌");
  if (idx < 0) return [];
  return text
    .slice(idx)
    .split("\n")
    .map((l) => l.match(/^\s*[-•*]\s*(.+?)\s*\|\s*(.+?)\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ en: m[1].replace(/\*\*/g, ""), fr: m[2].replace(/\*\*/g, "") }));
}

/** Retire la section vocab du texte affiché (elle est rendue sous forme de puces cliquables). */
export function stripVocab(text: string): string {
  const idx = text.indexOf("📌");
  return idx < 0 ? text : text.slice(0, idx).trimEnd();
}
