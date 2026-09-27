import { getState } from "./store";

let voicesCache: SpeechSynthesisVoice[] = [];

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  const all = window.speechSynthesis.getVoices();
  if (all.length) voicesCache = all;
  return voicesCache
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => score(b) - score(a));
}

// Les voix « naturelles » / en ligne sont souvent bien meilleures
function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (/natural|neural|premium|enhanced|google|siri/i.test(v.name)) s += 3;
  if (/en-GB|en-US/i.test(v.lang)) s += 1;
  if (v.localService) s += 0.5;
  return s;
}

if (ttsSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (!ttsSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
  const { voiceURI, rate } = getState().settings;
  const voices = englishVoices();
  const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-GB";
  u.rate = opts.rate ?? rate;
  if (opts.onEnd) u.onend = opts.onEnd;
  synth.speak(u);
}

// ——— Reconnaissance vocale (Chrome, Edge, Safari) ———
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function RecognitionCtor(): (new () => Recognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
}

export function sttSupported(): boolean {
  return typeof window !== "undefined" && !!RecognitionCtor();
}

export function listen(): { promise: Promise<string[]>; stop: () => void } {
  const Ctor = RecognitionCtor();
  if (!Ctor) return { promise: Promise.reject(new Error("unsupported")), stop: () => {} };
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  const promise = new Promise<string[]>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      resolve(alts);
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (!done) resolve([]);
    };
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}
