"use client";

import Link from "next/link";
import { useState } from "react";
import { DETAIL_LABELS, detailsToFormValues, type Detail } from "@/lib/extractDetails";

const FORM_KEY = "visa-form-v1";

/** Fill the guided application form (stored on this device) with details; only empty fields are filled. */
export function fillApplicationForm(details: Detail[], extra: Record<string, string> = {}) {
  const values = { ...detailsToFormValues(details), ...extra };
  let current: Record<string, string> = {};
  try {
    current = JSON.parse(localStorage.getItem(FORM_KEY) ?? "{}");
  } catch {}
  let filled = 0;
  for (const [k, v] of Object.entries(values)) {
    if (v && !current[k]?.trim()) {
      current[k] = v;
      filled++;
    }
  }
  try {
    localStorage.setItem(FORM_KEY, JSON.stringify(current));
  } catch {}
  return filled;
}

/** Details grabbed from uploaded documents. Editable, with manual additions. */
export function DetailsPanel({ details, setDetails, onFillProfile, formExtra }: {
  details: Detail[];
  setDetails: React.Dispatch<React.SetStateAction<Detail[]>>;
  onFillProfile?: () => void;
  formExtra?: Record<string, string>;
}) {
  const [key, setKey] = useState("fullName");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");

  // flag conflicting values for the same field across documents (e.g. two different passport numbers)
  const conflicts = new Set(
    Object.entries(details.reduce<Record<string, Set<string>>>((acc, d) => ((acc[d.key] ??= new Set()).add(d.value.toLowerCase().replace(/\s+/g, " ")), acc), {}))
      .filter(([, s]) => s.size > 1)
      .map(([k]) => k),
  );

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xl text-white shadow-lg [transform:perspective(300px)_rotateY(-14deg)]">🧾</span>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Details found in your documents</h2>
          <p className="text-sm text-slate-500">Read automatically from your uploads (passport, bank statement, letters, IELTS/PTE…). Check, edit or add details by hand.</p>
        </div>
      </div>

      {conflicts.size > 0 && (
        <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          ⚠ Different values found for: <b>{[...conflicts].map((k) => DETAIL_LABELS[k] ?? k).join(", ")}</b>. Every document must show the same details, so fix the wrong document.
        </p>
      )}

      {details.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No details yet. Upload PDF documents (or add details manually below).</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {details.map((d, i) => (
            <div key={`${d.key}-${i}`} className={`rounded-xl border px-3 py-2 ${conflicts.has(d.key) ? "border-rose-300 bg-rose-50/50" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="label !mb-0">{d.label}</span>
                <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => setDetails((x) => x.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
              </div>
              <input className="input mt-1 py-1.5" value={d.value} onChange={(e) => setDetails((x) => x.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
              <div className="mt-0.5 truncate text-[11px] text-slate-400">from {d.source}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select className="input sm:max-w-[200px]" value={key} onChange={(e) => setKey(e.target.value)}>
          {Object.entries(DETAIL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input className="input" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn-ghost" onClick={() => { if (!value.trim()) return; setDetails((x) => [...x, { key, label: DETAIL_LABELS[key], value: value.trim(), source: "added manually" }]); setValue(""); }}>+ Add manually</button>
      </div>

      {details.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onFillProfile && <button className="btn-primary" onClick={() => { onFillProfile(); setMsg("Profile filled from your documents."); }}>👤 Fill my profile</button>}
          <button className="btn-primary" onClick={() => { const n = fillApplicationForm(details, formExtra); setMsg(`${n} field(s) filled in your visa application form.`); }}>📝 Fill application form</button>
          <Link href="/form" className="btn-ghost">Open application form →</Link>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-emerald-700">✓ {msg}</p>}
    </div>
  );
}
