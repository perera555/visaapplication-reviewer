"use client";

import { useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

/** Password field with a show / hide toggle so users can see what they type. */
export function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`input pr-20 ${className}`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-1 my-1 rounded-lg px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "🙈 Hide" : "👁 Show"}
      </button>
    </div>
  );
}

/** Card that tilts in 3D following the pointer. */
export function TiltCard({ children, className = "", max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateZ(0)`;
  }
  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`}>
      {children}
    </div>
  );
}

/** 3D gradient page header used on every tool / form page. */
export function PageHero({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="hero-bg relative overflow-hidden text-white">
      <div className="grid-floor" />
      <div className="container-x relative flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:py-14">
        <div className="scene">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-400 via-violet-500 to-cyan-400 text-4xl shadow-2xl shadow-indigo-500/50 [transform:rotateY(-18deg)_rotateX(12deg)]">
            {icon}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-white/80">{subtitle}</p>
          {children}
        </div>
      </div>
    </section>
  );
}

/** 3D step indicator for multi-step forms. */
export function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep?: (i: number) => void }) {
  return (
    <ol className="scene flex gap-2 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s} className="min-w-[120px] flex-1">
            <button
              type="button"
              onClick={() => onStep?.(i)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition duration-300 ${
                state === "active"
                  ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/40 [transform:translateZ(30px)_rotateX(8deg)]"
                  : state === "done"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-line bg-white text-slate-500"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wider opacity-80">Step {i + 1} {state === "done" && "✓"}</span>
              <span className="block truncate text-sm font-semibold">{s}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function ScoreGauge({ score, size = 180 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="scene">
      <div
        className="gauge grid place-items-center rounded-full shadow-2xl [transform:rotateX(14deg)]"
        style={{ width: size, height: size, ["--v" as string]: score, ["--gc" as string]: color, boxShadow: `0 30px 60px -20px ${color}88` }}
      >
        <div className="grid place-items-center rounded-full bg-white" style={{ width: size - 28, height: size - 28 }}>
          <div className="text-center">
            <div className="text-4xl font-black" style={{ color }}>{score}%</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">success rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
