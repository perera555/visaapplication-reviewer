"use client";

import { useState } from "react";
import { MANUAL_LABEL, finalAuthStatus, type AuthSummary, type ManualVerification } from "@/lib/types";

const BADGE = {
  original: "bg-emerald-100 text-emerald-800 border-emerald-300",
  fake: "bg-rose-100 text-rose-800 border-rose-300",
  check: "bg-amber-100 text-amber-900 border-amber-300",
  unchecked: "bg-slate-100 text-slate-600 border-slate-200",
} as const;
const ICON = { original: "✅", fake: "❌", check: "🔍", unchecked: "•" } as const;
const SIG = { good: "text-emerald-700", info: "text-slate-600", warn: "text-amber-700", bad: "text-rose-700" } as const;
const SIG_ICON = { good: "✓", info: "ℹ", warn: "⚠", bad: "✕" } as const;

export function AuthBadge({ auth, manual }: { auth?: AuthSummary; manual?: ManualVerification }) {
  const f = finalAuthStatus({ auth, manual });
  return (
    <span className={`chip border ${BADGE[f.key]}`} title={f.manual ? `Manual decision by ${manual?.by}` : auth ? `Automatic score ${auth.score}/100` : ""}>
      {ICON[f.key]} {f.label}{f.manual ? " (manual)" : auth ? ` · ${auth.score}` : ""}
    </span>
  );
}

/**
 * Original / fake check: automatic signals plus a MANUAL decision that always overrides them,
 * so a genuine document wrongly flagged as fake can be accepted.
 */
export function AuthenticityPanel({ auth, manual, onManual, onRecheck, busy }: {
  auth?: AuthSummary;
  manual?: ManualVerification;
  onManual: (status: ManualVerification["status"] | null, note: string) => void | Promise<void>;
  onRecheck?: () => void;
  busy?: boolean;
}) {
  const [note, setNote] = useState(manual?.note ?? "");
  const [open, setOpen] = useState(!manual && auth?.verdict !== "likely-original");
  const f = finalAuthStatus({ auth, manual });
  const autoSaysFake = auth && auth.verdict !== "likely-original";

  return (
    <div className={`rounded-xl border p-3 ${BADGE[f.key]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{ICON[f.key]} {f.label}</span>
        {f.manual && <span className="text-xs">by {manual!.by} · {new Date(manual!.at).toLocaleString()}</span>}
        {auth && (
          <span className="ml-auto flex items-center gap-2 text-xs">
            Auto score
            <span className="h-2 w-20 overflow-hidden rounded-full bg-white/70"><span className={`block h-2 ${auth.score >= 75 ? "bg-emerald-500" : auth.score >= 45 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${auth.score}%` }} /></span>
            <b>{auth.score}/100</b>
          </span>
        )}
      </div>

      {manual && auth && manual.status === "original" && auth.verdict !== "likely-original" && (
        <p className="mt-1 text-xs">The automatic check said “{auth.verdictLabel}”, but a person verified this document as original. The manual decision is used.</p>
      )}
      {manual?.note && <p className="mt-1 text-xs"><b>Note:</b> {manual.note}</p>}

      {auth?.signals && auth.signals.length > 0 && (
        <div className="mt-2">
          <button type="button" className="text-xs font-semibold underline-offset-2 hover:underline" onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"} reasons ({auth.signals.length})</button>
          {open && (
            <ul className="mt-1 space-y-1 rounded-lg bg-white/70 p-2 text-xs">
              {auth.signals.map((s, i) => (
                <li key={i} className={SIG[s.level]}><b>{SIG_ICON[s.level]} {s.label}</b>: <span className="text-slate-600">{s.detail}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 rounded-lg bg-white/80 p-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Manual decision (overrides the automatic check)</div>
        {autoSaysFake && !manual && <p className="mt-0.5 text-xs text-slate-600">Automatic checks can be wrong. If you have seen the original, mark it below.</p>}
        <input className="input mt-1 py-1.5 text-xs" placeholder="Note, e.g. Original seen at office / verified with bank by phone" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700" onClick={() => onManual("original", note)}>✅ Mark as original</button>
          <button type="button" disabled={busy} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700" onClick={() => onManual("fake", note)}>❌ Mark as fake</button>
          <button type="button" disabled={busy} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600" onClick={() => onManual("needs-check", note)}>🔍 Needs checking</button>
          {manual && <button type="button" disabled={busy} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-600" onClick={() => onManual(null, "")}>↺ Use automatic result</button>}
          {onRecheck && <button type="button" disabled={busy} className="ml-auto rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-600" onClick={onRecheck}>{busy ? "Checking…" : "↻ Re-run check"}</button>}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Automatic results are indicators, not proof. Confirm important documents with the original or the issuing organisation.</p>
    </div>
  );
}

export { MANUAL_LABEL };
