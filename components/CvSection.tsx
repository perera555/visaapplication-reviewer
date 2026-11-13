"use client";

import { useState } from "react";
import { analyzeCv, type CvAnalysis } from "@/lib/cvAnalyzer";
import { extractFileText } from "./SupportDocReview";

/** Upload a CV: extracts details and lists the documents the applicant needs for the visa. */
export function CvSection({ visaType, onApply, providedReqIds = [] }: { visaType: string; onApply?: (cv: CvAnalysis, file?: File) => void; providedReqIds?: string[] }) {
  const [cv, setCv] = useState<CvAnalysis | null>(null);
  const [file, setFile] = useState<File | undefined>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [applied, setApplied] = useState(false);

  async function load(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setMsg("");
    setFile(f);
    const t = await extractFileText(f);
    setBusy(false);
    if (t.trim().length < 50) {
      setMsg("Could not read text from this CV (it may be scanned). Paste your CV text below instead.");
      return;
    }
    setText(t);
    setCv(analyzeCv(t, visaType));
    setApplied(false);
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xl text-white shadow-lg [transform:perspective(300px)_rotateY(-14deg)]">📄</span>
        <div className="flex-1">
          <h2 className="text-lg font-bold">CV review: what documents your CV needs</h2>
          <p className="text-sm text-slate-500">Upload your CV/resume. We pick out your education, jobs and language tests, and list the documents that prove them for your visa.</p>
        </div>
        <label className="btn-primary cursor-pointer">{busy ? "Reading…" : "Upload CV"}
          <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {msg && <p className="mt-3 text-sm text-amber-700">{msg}</p>}
      {!cv && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-indigo-600">…or paste CV text</summary>
          <textarea className="input mt-2 min-h-32" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-ghost mt-2" disabled={text.trim().length < 50} onClick={() => setCv(analyzeCv(text, visaType))}>Analyse CV</button>
        </details>
      )}

      {cv && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <h3 className="label">Details found</h3>
            <dl className="grid grid-cols-2 gap-2">
              <div><dt className="text-xs text-slate-400">Name</dt><dd className="font-medium">{cv.name ?? "-"}</dd></div>
              <div><dt className="text-xs text-slate-400">Email</dt><dd className="truncate font-medium">{cv.email ?? "-"}</dd></div>
              <div><dt className="text-xs text-slate-400">Phone</dt><dd className="font-medium">{cv.phone ?? "-"}</dd></div>
              <div><dt className="text-xs text-slate-400">Experience</dt><dd className="font-medium">{cv.totalYears ? `~${cv.totalYears} years` : "-"}</dd></div>
              <div><dt className="text-xs text-slate-400">Language test</dt><dd className="font-medium">{cv.englishTest ? `${cv.englishTest.test} ${cv.englishTest.score ?? ""}` : "-"}</dd></div>
              <div><dt className="text-xs text-slate-400">Currently employed</dt><dd className="font-medium">{cv.currentlyEmployed ? "Yes" : "No"}</dd></div>
            </dl>
            {cv.education.length > 0 && <div><div className="text-xs text-slate-400">Education</div><ul className="list-disc pl-5">{cv.education.map((e) => <li key={e}>{e}</li>)}</ul></div>}
            {cv.jobs.length > 0 && <div><div className="text-xs text-slate-400">Jobs</div><ul className="list-disc pl-5">{cv.jobs.map((j) => <li key={j.title}>{j.title} {j.years && <span className="text-slate-500">({j.years})</span>}</li>)}</ul></div>}
            {cv.gaps.length > 0 && <p className="rounded-xl bg-amber-50 p-2 text-amber-900">⚠️ Gaps found: {cv.gaps.join(", ")}. Explain them with evidence.</p>}
            {cv.tips.map((t) => <p key={t} className="text-xs text-slate-500">💡 {t}</p>)}
            {onApply && (
              <button className="btn-ghost" disabled={applied} onClick={() => { onApply(cv, file); setApplied(true); }}>
                {applied ? "✓ Added to your application" : "Use these details & add CV to my checklist"}
              </button>
            )}
          </div>
          <div>
            <h3 className="label">Documents you need based on your CV ({cv.neededDocs.length})</h3>
            <ul className="space-y-2">
              {cv.neededDocs.map((d) => {
                const have = d.reqId && providedReqIds.includes(d.reqId);
                return (
                  <li key={d.name} className={`rounded-xl px-3 py-2 text-sm ${have ? "bg-emerald-50" : "bg-rose-50"}`}>
                    <div className="font-semibold">{have ? "✅" : "❌"} {d.name}</div>
                    <div className="text-xs text-slate-600">{d.why}</div>
                    {!have && <div className="text-xs font-semibold text-rose-700">This document is required. Please upload it.</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
