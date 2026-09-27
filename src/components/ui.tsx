import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Level } from "../data/types";
import { speak } from "../lib/speech";
import { Icon } from "./Icon";

export function LevelBadge({ level }: { level: Level | string }) {
  const lv = `var(--lv-${level.toLowerCase()}, var(--ink-3))`;
  return (
    <span className="level-badge" style={{ ["--lv" as string]: lv }}>
      {level}
    </span>
  );
}

export function SpeakButton({ text, size = "md", auto = false }: { text: string; size?: "sm" | "md" | "lg"; auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => speak(text), 250);
      return () => clearTimeout(t);
    }
  }, [auto, text]);
  return (
    <button
      type="button"
      className={`speak-btn ${size === "md" ? "" : size}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`Écouter « ${text} »`}
      title="Écouter"
    >
      <Icon name="volume" size={size === "sm" ? 16 : size === "lg" ? 34 : 22} />
    </button>
  );
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  color = "var(--brand)",
  track = "var(--surface-3)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}

export function Bar({ value, color, thin }: { value: number; color?: string; thin?: boolean }) {
  return (
    <div className={`bar ${thin ? "thin" : ""}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, ...(color ? { ["--fill" as string]: color } : {}) }} />
    </div>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function Stat({ icon, value, label, tint }: { icon: string; value: ReactNode; label: string; tint?: "brand" | "accent" | "success" | "warning" }) {
  const t = tint ?? "brand";
  return (
    <div className="stat" style={{ ["--tint" as string]: `var(--${t})`, ["--tint-soft" as string]: `var(--${t}-soft)` }}>
      <div className="ico">
        <Icon name={icon} size={19} />
      </div>
      <div className="value mono">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

// ——— Toast global ———
let pushToast: (msg: string) => void = () => {};
export const toast = (msg: string) => pushToast(msg);

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    pushToast = (m) => {
      setMsg(m);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMsg(null), 2600);
    };
  }, []);
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
}

// ——— Confettis (canvas, sans dépendance) ———
export function Confetti({ run }: { run: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!run || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#5b4bff", "#ff6a3d", "#22b573", "#f08c00", "#8b5cf6", "#3b82f6"];
    const parts = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 16 - 4,
      s: Math.random() * 8 + 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.42;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frame / 160);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (++frame < 170) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return <canvas ref={ref} className="confetti" style={{ width: "100vw", height: "100vh" }} />;
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">
        <Icon name={icon} size={32} />
      </div>
      <h3 style={{ fontSize: 20, marginBottom: 6, color: "var(--ink)" }}>{title}</h3>
      {children}
    </div>
  );
}

/** Barre d'action fixée en bas d'écran (rendue dans <body> pour échapper aux conteneurs animés). */
export function Foot({ className = "", children }: { className?: string; children: ReactNode }) {
  return createPortal(<div className={className.includes("session-foot") ? className : `session-foot ${className}`}>{children}</div>, document.body);
}
