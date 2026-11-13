"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, flag, getCountry } from "@/lib/countries";
import { ENGLISH_TYPES, VISA_TYPES, getRequirements, type DocRequirement, type VisaTypeId } from "@/lib/requirements";
import { classifyDocument } from "@/lib/scoring";
import type { CustomRequirement } from "@/lib/types";
import { extractFileText } from "./SupportDocReview";

const DRAFT_KEY = "visa-review-draft-v1"; // shared with the Document Review wizard

/** Tally the customer's documents against the required documents for a country + visa type. */
export function DocTally({ country: initialCountry, visaType: initialType, selectable = false }: { country?: string; visaType?: VisaTypeId; selectable?: boolean }) {
  const [country, setCountry] = useState(initialCountry ?? "GB");
  const [visaType, setVisaType] = useState<VisaTypeId>(initialType ?? "visit");
  const [custom, setCustom] = useState<CustomRequirement[]>([]);
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<Record<string, string[]>>({});
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [busy, setBusy] = useState("");

  // load ticks saved by the wizard / previous tally
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (d?.manual && (!initialCountry || d.country === country) && (!initialType || d.visaType === visaType)) setHave(d.manual);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`/api/requirements?country=${country}&type=${visaType}`).then((r) => r.json()).then(setCustom).catch(() => setCustom([]));
  }, [country, visaType]);

  const [waiver, setWaiver] = useState(false);
  const reqs: DocRequirement[] = useMemo(() => [...getRequirements(country, visaType, { englishWaiver: waiver }), ...custom], [country, visaType, custom, waiver]);
  const provided = (r: DocRequirement) => Boolean(have[r.id] || files[r.id]?.length);
  const required = reqs.filter((r) => r.mandatory);
  const recommended = reqs.filter((r) => !r.mandatory);
  const reqDone = required.filter(provided).length;
  const recDone = recommended.filter(provided).length;
  const missingRequired = required.filter((r) => !provided(r));
  const pct = required.length ? Math.round((reqDone / required.length) * 100) : 100;

  function save(next: Record<string, boolean>) {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, country, visaType, manual: next }));
    } catch {}
  }
  function toggle(id: string, v: boolean) {
    setHave((h) => {
      const next = { ...h, [id]: v };
      save(next);
      return next;
    });
  }

  /** Upload a document for one specific requirement (no auto-matching). */
  function uploadFor(reqId: string, list: FileList | null) {
    if (!list?.length) return;
    const names = [...list].map((f) => f.name);
    setFiles((f) => ({ ...f, [reqId]: [...(f[reqId] ?? []), ...names] }));
    toggle(reqId, true);
  }

  /** Upload all documents at once; each one is matched to the right requirement. */
  async function upload(list: FileList | null) {
    if (!list?.length) return;
    const all = [...list];
    const add: Record<string, string[]> = {};
    const none: string[] = [];
    for (let i = 0; i < all.length; i++) {
      setBusy(`Checking ${i + 1}/${all.length}: ${all[i].name}`);
      const text = await extractFileText(all[i]);
      const m = classifyDocument(all[i].name, text, reqs);
      if (m) (add[m.id] ??= []).push(all[i].name);
      else none.push(all[i].name);
    }
    setFiles((f) => {
      const n = { ...f };
      for (const [k, v] of Object.entries(add)) n[k] = [...(n[k] ?? []), ...v];
      return n;
    });
    setHave((h) => {
      const next = { ...h, ...Object.fromEntries(Object.keys(add).map((k) => [k, true])) };
      save(next);
      return next;
    });
    setUnmatched((u) => [...u, ...none]);
    setBusy("");
  }

  const color = pct === 100 ? "from-emerald-500 to-lime-500" : pct >= 60 ? "from-amber-400 to-orange-500" : "from-rose-500 to-pink-500";

  return (
    <div className="space-y-4">
      {selectable && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Country</span>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
            </select>
          </label>
          <label><span className="label">Visa type</span>
            <select className="input" value={visaType} onChange={(e) => setVisaType(e.target.value as VisaTypeId)}>
              {VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {ENGLISH_TYPES.includes(visaType) && (
        <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} />
          <span><b>IELTS / PTE waived</b>: I have an MOI letter, a degree taught in English, or a university/employer waiver.</span>
        </label>
      )}

      {/* tally summary */}
      <div className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-lg`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl font-black">{reqDone}/{required.length}</div>
          <div className="flex-1">
            <div className="font-bold">required documents ready{getCountry(country) ? ` for ${getCountry(country)!.name}` : ""}</div>
            <div className="text-sm text-white/90">Recommended: {recDone}/{recommended.length} · {pct === 100 ? "All required documents ready ✅" : `${missingRequired.length} required document(s) still missing`}</div>
          </div>
          <label className="cursor-pointer text-xs font-semibold text-white/90 underline underline-offset-2 hover:text-white">
            or upload many at once
            <input type="file" multiple className="hidden" accept=".pdf,image/*,.doc,.docx,.txt" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-white/30"><div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm font-medium text-white">📎 Upload each document one by one using the Upload button on its row below.</p>
        {busy && <p className="mt-2 animate-pulse text-sm">{busy}</p>}
      </div>

      {unmatched.length > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Not recognised: {unmatched.join(", ")}. Tick the matching item below by hand.</p>
      )}

      {/* side-by-side tally */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[540px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="p-3">I have it</th>
              <th className="p-3">Required document</th>
              <th className="p-3">Needed</th>
              <th className="p-3">My document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {reqs.map((r) => {
              const ok = provided(r);
              return (
                <tr key={r.id} className={!ok && r.mandatory ? "bg-rose-50/60" : ok ? "bg-emerald-50/40" : ""}>
                  <td className="p-3 align-top"><input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={ok} onChange={(e) => toggle(r.id, e.target.checked)} /></td>
                  <td className="p-3 align-top">
                    <div className="font-semibold">{r.name}{r.source === "admin" && <span className="chip ml-1 bg-amber-50 text-amber-700">Our team</span>}</div>
                    <div className="text-xs text-slate-500">{r.description}</div>
                    {!ok && r.mandatory && <div className="mt-1 text-xs font-bold text-rose-600">⚠ This document is required.</div>}
                  </td>
                  <td className="p-3 align-top">{r.mandatory ? <span className="chip bg-rose-50 text-rose-700">Required</span> : <span className="chip bg-slate-100 text-slate-600">Recommended</span>}</td>
                  <td className="p-3 align-top text-xs">
                    {files[r.id]?.length ? files[r.id].map((f) => <div key={f}>📄 {f}</div>) : ok ? <span className="text-emerald-700">✅ Ticked</span> : <span className="text-rose-600">❌ Missing</span>}
                    <label className={`mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 font-semibold ${ok ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-emerald-600 text-white shadow hover:bg-emerald-700"}`}>
                      📎 {files[r.id]?.length ? "Add more" : "Upload"}
                      <input type="file" multiple className="hidden" accept=".pdf,image/*,.doc,.docx,.txt" onChange={(e) => { uploadFor(r.id, e.target.files); e.target.value = ""; }} />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <h4 className="font-bold text-rose-700">Still needed before you apply ({missingRequired.length})</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-900">{missingRequired.map((r) => <li key={r.id}><b>{r.name}</b>: {r.description}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/check?country=${country}&type=${visaType}`} className="btn-primary">Continue to full review & success rate →</Link>
        <button className="btn-ghost" onClick={() => window.print()}>🖨 Print my checklist</button>
      </div>
    </div>
  );
}
